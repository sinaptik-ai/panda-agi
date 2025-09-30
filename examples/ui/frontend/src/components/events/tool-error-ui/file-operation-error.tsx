import React from "react";
import { FileText } from "lucide-react";
import UserFriendlyError from "./user-friendly-error";
import { ErrorMessageDisplay } from "./index";

interface FileOperationErrorProps {
  payload: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    timestamp?: string | number;
  };
}

const FileOperationError: React.FC<FileOperationErrorProps> = ({ payload }) => {
  const { input_params, error, tool_name } = payload;
  const filePath = input_params?.file_path as string || 
                  input_params?.path as string || 
                  input_params?.filename as string;
  
  // For file_write operations that failed, don't show the file path since the file wasn't created
  const isFileWriteOperation = tool_name?.toLowerCase().includes('write') || tool_name?.toLowerCase().includes('file_write');
  const shouldShowFilePath = !isFileWriteOperation && filePath;

  return (
    <UserFriendlyError
      toolName={tool_name}
      error={error}
    >
      {shouldShowFilePath && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1 flex items-center">
            <FileText className="w-3 h-3 mr-1" />
            File Path:
          </div>
          <div 
            className="bg-gray-800 p-3 rounded-md font-mono text-sm text-green-300 break-all"
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
          >
            {filePath}
          </div>
        </div>
      )}
      <ErrorMessageDisplay error={error} />
    </UserFriendlyError>
  );
};

export default FileOperationError; 