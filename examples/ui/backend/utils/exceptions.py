class FileNotFoundError(Exception):
    pass


class RestrictedAccessError(Exception):
    pass


class PXMLParsingError(Exception):
    """Raised when there's an error parsing PXML content"""

    pass


class CSVFileError(Exception):
    """Raised when there's an error accessing or processing CSV files"""

    pass
