import React from "react";
import {
  Bot,
  Activity,
  CheckCircle,
  AlertCircle,
  Globe,
  MessageSquare,
} from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";

const LegacyEvent = ({ payload, eventType }) => {
  if (!payload) return null;

  const getEventInfo = (eventType) => {
    switch (eventType) {
      case "agent_request":
        return {
          icon: <Bot className="w-4 h-4 text-purple-500" />,
          color: "bg-purple-50 border-purple-200",
          title: "Agent Request",
        };
      case "tool_result":
        return {
          icon: <Activity className="w-4 h-4 text-blue-500" />,
          color: "bg-blue-50 border-blue-200",
          title: "Tool Result",
        };
      case "completion":
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          color: "bg-green-50 border-green-400",
          title: "Completion",
        };
      case "connection_success":
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          color: "bg-green-50 border-green-200",
          title: "Connection Success",
        };
      case "web_visit_page":
        return {
          icon: <Globe className="w-4 h-4 text-orange-600" />,
          color: "bg-orange-50 border-orange-300",
          title: "Web Visit Page",
        };
      case "user_send_message":
        return {
          icon: <MessageSquare className="w-4 h-4 text-indigo-500" />,
          color: "bg-indigo-50 border-indigo-200",
          title: "User Send Message",
        };
      case "shell_exec_command":
        return {
          icon: <Activity className="w-4 h-4 text-purple-600" />,
          color: "bg-purple-50 border-purple-300",
          title: "Shell Execute Command",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          color: "bg-red-50 border-red-200",
          title: "Error",
        };
      default:
        return {
          icon: <Activity className="w-4 h-4 text-gray-500" />,
          color: "bg-gray-50 border-gray-200",
          title: "Legacy Event",
        };
    }
  };

  const eventInfo = getEventInfo(eventType);
  let innerContent = null;

  switch (eventType) {
    case "agent_request":
      innerContent = (
        <div className="mt-2">
          <p className="text-sm text-gray-700 font-medium">Query:</p>
          <div className="mt-1">
            <MarkdownRenderer>{payload.query}</MarkdownRenderer>
          </div>
        </div>
      );
      break;

    case "tool_result":
      if (Array.isArray(payload)) {
        innerContent = (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Search Results:</p>
            <div className="mt-1 space-y-1">
              {payload.slice(0, 3).map((result, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
                >
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {result.title}
                  </a>
                </div>
              ))}
              {payload.length > 3 && (
                <p className="text-xs text-gray-500 mt-1">
                  ... and {payload.length - 3} more results
                </p>
              )}
            </div>
          </div>
        );
      }
      break;

    case "completion":
      innerContent = (
        <div className="mt-2">
          <p className="text-sm text-gray-700 font-medium">Status:</p>
          <div className="mt-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Task Completed
            </span>
          </div>
          {payload.message && (
            <div className="mt-2">
              <MarkdownRenderer>{payload.message}</MarkdownRenderer>
            </div>
          )}
        </div>
      );
      break;

    default:
      return null;
  }

  if (!innerContent) return null;

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        {eventInfo.icon}
        <span className="font-medium text-sm text-gray-900">
          {eventInfo.title}
        </span>
      </div>
      {innerContent}
    </div>
  );

  return {
    color: eventInfo.color,
    content,
  };
};

export default LegacyEvent;
