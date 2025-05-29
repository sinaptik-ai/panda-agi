import React from "react";
import { Clock } from "lucide-react";

const UnknownEvent = ({ payload, eventType }) => {
  if (!payload) return null;

  const title = eventType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  let innerContent = null;

  // Handle list payloads generically
  if (Array.isArray(payload)) {
    innerContent = (
      <div className="mt-2">
        <p className="text-sm text-gray-700 font-medium">
          Results ({payload.length} items):
        </p>
        <div className="mt-1 space-y-1">
          {payload.slice(0, 3).map((item, index) => (
            <div
              key={index}
              className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
            >
              {String(item).slice(0, 100)}...
            </div>
          ))}
          {payload.length > 3 && (
            <p className="text-xs text-gray-500 mt-1">
              ... and {payload.length - 3} more items
            </p>
          )}
        </div>
      </div>
    );
  }
  // For unknown event types with object payloads, show a generic payload view
  else if (
    payload &&
    typeof payload === "object" &&
    Object.keys(payload).length > 0
  ) {
    innerContent = (
      <div className="mt-2">
        <p className="text-sm text-gray-700 font-medium">Details:</p>
        <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>
    );
  }

  if (!innerContent) return null;

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-sm text-gray-900">{title}</span>
      </div>
      {innerContent}
    </div>
  );

  return {
    color: "bg-gray-50 border-gray-200",
    content,
  };
};

export default UnknownEvent;
