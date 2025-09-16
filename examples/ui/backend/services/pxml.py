from typing import Callable, Optional, Tuple
from services.files import FilesService
from panda_agi.envs.base_env import BaseEnv
from pxml import DashboardCompiler
from utils.exceptions import PXMLParsingError, CSVFileError
import logging
import os
import re

logger = logging.getLogger(__name__)


class PXMLService:

    @staticmethod
    def normalize_csv_path(csv_path: str) -> str:
        """
        Sanitize a CSV path by removing the ./ prefix if it exists.
        """
        if csv_path.startswith("./"):
            return csv_path[2:]

        if csv_path.startswith("/"):
            return csv_path[1:]

        return csv_path

    @staticmethod
    async def validate_and_get_fixed_path(file_path: str, env: BaseEnv) -> str:
        """
        Validate and get the fixed file path.

        Args:
            file_path: The file path to validate and get the fixed path
            env: The environment to validate the file path

        Returns:
            The fixed file path

        Raises:
            Exception: If file_path element is not found or is empty
        """
        try:
            # Normalize the path (remove ./ prefix if present)
            file_path = PXMLService.normalize_csv_path(file_path)

            # TODO - refactor later after model fix.
            # - Checks if path is wrong from the model
            # - Find the .csv file in the workspace
            # - If only one file exists return it as the path

            if not await env.path_exists(file_path):
                # Check for CSV files in the environment
                files = await env.list_files(recursive=True)
                if files["status"] == "success":
                    csv_files = [
                        file
                        for file in files["files"]
                        if file["type"] == "file" and file["name"].endswith(".csv")
                    ]
                    if len(csv_files) == 1:
                        # Only one CSV file exists, return its path
                        logger.info(
                            f"Found single CSV file: {csv_files[0]['relative_path']}"
                        )
                        return csv_files[0]["relative_path"]
                    else:
                        # Try to match filename from the requested path
                        # Patch if multiple csv files exist
                        requested_filename = os.path.basename(file_path)

                        # Check if the requested filename matches any CSV file
                        matching_csv = None
                        for csv_file in csv_files:
                            if csv_file["name"] == requested_filename:
                                matching_csv = csv_file
                                break

                        if matching_csv:
                            logger.info(
                                f"Found matching CSV file by name: {matching_csv['relative_path']}"
                            )
                            return matching_csv["relative_path"]
                        else:
                            raise FileNotFoundError(
                                f"File path {file_path} does not exist. Available CSV files: {[f['name'] for f in csv_files]}"
                            )

                raise FileNotFoundError(f"File path {file_path} does not exist")

            # check if file_path is a valid file path
            return file_path

        except FileNotFoundError as e:
            raise CSVFileError(f"CSV file not found: {str(e)}")
        except Exception as e:
            raise CSVFileError(f"Failed to validate CSV file path: {str(e)}")

    @staticmethod
    async def get_csv_file_path_from_xml_content(xml_content: str) -> str:
        """
        Get the CSV file path from the XML content.
        """
        try:
            pattern = r"<file_path>(.*?)</file_path>"
            match = re.search(pattern, xml_content, re.DOTALL)
            if not match:
                raise PXMLParsingError("file_path element not found in XML content")
            return match.group(1)
        except re.error as e:
            raise PXMLParsingError(
                f"Invalid regex pattern for parsing XML content: {str(e)}"
            )
        except Exception as e:
            raise PXMLParsingError(f"Error parsing XML content: {str(e)}")

    @staticmethod
    async def process_xml_content_for_csv_file_path(
        xml_content: str, env: BaseEnv
    ) -> str:
        """
        Get the fixed CSV file path from the XML content.
        """
        try:
            # Get the original file path from the XML content
            original_file_path = await PXMLService.get_csv_file_path_from_xml_content(
                xml_content
            )
            logger.info(f"Original file path: {original_file_path}")

            # Get the corrected file path
            csv_file_path = await PXMLService.validate_and_get_fixed_path(
                original_file_path.strip(), env
            )

            logger.info(f"Corrected file path: {csv_file_path}")
            # Replace the original path with the corrected path in XML content
            xml_content = xml_content.replace(
                f"<file_path>{original_file_path}</file_path>",
                f"<file_path>{csv_file_path}</file_path>",
            )

            return xml_content
        except (PXMLParsingError, CSVFileError) as e:
            raise e
        except Exception as e:
            raise PXMLParsingError(
                f"Failed to process XML content for CSV file path: {str(e)}"
            )

    @staticmethod
    async def compile(
        xml_content: str,
        get_file: Callable[[str], Tuple[bytes, str]],
        artifact_id: str = None,
    ) -> str:
        """
        Compile a PXML file and return the compiled HTML file
        """
        try:
            dashboard_compiler = DashboardCompiler()
            dashboard_data = dashboard_compiler.xml_parser.parse(xml_content)

            csv_file_path = dashboard_data["metadata"].file_path

            csv_file_path = PXMLService.normalize_csv_path(csv_file_path)
            logger.info(f"PXML CSV file path: {csv_file_path}")

            file_bytes, _ = await get_file(csv_file_path)
            csv_content = file_bytes.decode("utf-8")
            html_content = dashboard_compiler.compile_dashboard_with_csv(
                dashboard_data, csv_content, artifact_id
            )
            logger.info(f"TEST DEBUG: HTML content: {html_content[:100]}")
            return html_content

        except FileNotFoundError as e:
            logger.exception(f"CSV file not found: {e}")
            raise CSVFileError(f"CSV file not found: {str(e)}")
        except UnicodeDecodeError as e:
            logger.exception(f"Failed to decode CSV file: {e}")
            raise CSVFileError(f"Failed to decode CSV file as UTF-8: {str(e)}")
        except Exception as e:
            logger.exception(f"Error compiling PXML file: {e}")
            raise PXMLParsingError(f"Failed to compile PXML file: {str(e)}")

    @staticmethod
    async def compile_pxml(
        xml_content: str, env: BaseEnv, artifact_id: str = None
    ) -> str:
        """
        Compile a PXML file and return the compiled data.
        """
        try:
            # Process the XML content for the CSV file path
            xml_content = await PXMLService.process_xml_content_for_csv_file_path(
                xml_content, env
            )

            async def get_file(file_path: str) -> Tuple[bytes, str]:
                return await FilesService.get_file_from_env(file_path, env)

            return await PXMLService.compile(xml_content, get_file, artifact_id)

        except (PXMLParsingError, CSVFileError) as e:
            logger.exception(f"PXML compilation error: {e}")
            raise e
        except Exception as e:
            logger.exception(f"Unexpected error compiling PXML file: {e}")
            raise PXMLParsingError(f"Failed to compile PXML file: {str(e)}")

    @staticmethod
    async def get_csv_files_for_pxml(xml_content: str, env: BaseEnv):
        """
        Get CSV files referenced in PXML content and yield (content, filepath) tuples.
        """
        try:
            dashboard_compiler = DashboardCompiler()
            dashboard_data = dashboard_compiler.xml_parser.parse(xml_content)

            csv_file_path = dashboard_data["metadata"].file_path

            logger.info(f"PXML CSV file path: {csv_file_path}")
            # Get the CSV file content
            csv_content_bytes, _ = await FilesService.get_file_from_env(
                csv_file_path, env
            )

            # Yield the CSV content and filepath
            yield csv_content_bytes, csv_file_path

        except FileNotFoundError as e:
            logger.exception(f"CSV file not found: {e}")
            raise CSVFileError(f"CSV file not found: {str(e)}")
        except Exception as e:
            logger.exception(f"Error getting CSV files for PXML: {e}")
            raise PXMLParsingError(f"Failed to get CSV files for PXML: {str(e)}")
