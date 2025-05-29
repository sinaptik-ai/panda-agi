import React from "react";
import { FileText } from "lucide-react";

const FileOperationEvent = ({ payload, eventType }) => {
  if (!payload) return null;

  const getEventInfo = (eventType) => {
    switch (eventType) {
      case "file_read":
        return {
          icon: <FileText className="w-4 h-4 text-cyan-500" />,
          color: "bg-cyan-50 border-cyan-200",
          title: "File Read",
        };
      case "file_write":
        return {
          icon: <FileText className="w-4 h-4 text-green-600" />,
          color: "bg-green-50 border-green-300",
          title: "File Write",
        };
      case "file_replace":
        return {
          icon: <FileText className="w-4 h-4 text-yellow-600" />,
          color: "bg-yellow-50 border-yellow-300",
          title: "File Replace",
        };
      case "file_find":
        return {
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          color: "bg-blue-50 border-blue-200",
          title: "File Find",
        };
      case "file_explore":
        return {
          icon: <FileText className="w-4 h-4 text-blue-600" />,
          color: "bg-blue-50 border-blue-300",
          title: "File Explore",
        };
      default:
        return {
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          color: "bg-blue-50 border-blue-200",
          title: "File Operation",
        };
    }
  };

  const eventInfo = getEventInfo(eventType);

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        {eventInfo.icon}
        <span className="font-medium text-sm text-gray-900">
          {eventInfo.title}
        </span>
      </div>
      <div className="mt-2">
        <p className="text-sm text-gray-700 font-medium">File:</p>
        <div className="mt-1">
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
            {payload.file || payload.path}
          </code>
        </div>
        {payload.content && (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">
              Content Preview:
            </p>
            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              {String(payload.content).slice(0, 200)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return {
    color: eventInfo.color,
    content,
  };
};

export default FileOperationEvent;
