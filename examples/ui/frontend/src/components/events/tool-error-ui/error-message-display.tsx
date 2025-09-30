import React from "react";

interface ErrorMessageDisplayProps {
  error?: string;
}

const ErrorMessageDisplay: React.FC<ErrorMessageDisplayProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">Error:</div>
      <div 
        className="bg-slate-800 p-3 rounded-xl font-mono text-sm text-slate-300 whitespace-pre-wrap break-words max-h-64 overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937'
        }}
      >
        {String(error)}
      </div>
    </div>
  );
};

export default ErrorMessageDisplay; 