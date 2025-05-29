import React from "react";
import { Activity } from "lucide-react";

const ShellOperationEvent = ({ payload, eventType }) => {
  if (!payload) return null;

  const getEventInfo = (eventType) => {
    switch (eventType) {
      case "shell_exec":
        return {
          icon: <Activity className="w-4 h-4 text-purple-600" />,
          color: "bg-purple-50 border-purple-300",
          title: "Executing a shell command",
        };
      case "shell_view":
        return {
          icon: <Activity className="w-4 h-4 text-gray-600" />,
          color: "bg-gray-50 border-gray-300",
          title: "Checking the output of a shell command",
        };
      case "shell_write":
        return {
          icon: <Activity className="w-4 h-4 text-yellow-600" />,
          color: "bg-yellow-50 border-yellow-300",
          title: "Writing to a shell command",
        };
      default:
        return {
          icon: <Activity className="w-4 h-4 text-purple-600" />,
          color: "bg-purple-50 border-purple-300",
          title: "Shell operation",
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
        <div className="mt-1">
          <code className="text-sm bg-gray-900 text-white px-2 py-1 rounded">
            {payload.command}
          </code>
        </div>
        {payload.output && (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Output:</p>
            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono">
              {String(payload.output).slice(0, 300)}...
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

export default ShellOperationEvent;
