import React from "react";
import { MessageSquare } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";

const UserNotificationEvent = ({ payload, eventType }) => {
  if (!payload) return null;

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <MessageSquare className="w-4 h-4 text-indigo-500" />
        <span className="font-medium text-sm text-gray-900">PandaAGI</span>
      </div>
      <div className="mt-2">
        <MarkdownRenderer>{payload.text || payload.message}</MarkdownRenderer>
        {payload.attachments && payload.attachments.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Attachments:</p>
            <div className="mt-1 space-y-1">
              {payload.attachments.map((attachment, index) => (
                <div key={index} className="text-sm p-1 rounded">
                  📎 {attachment}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return {
    color: "bg-indigo-50 border-indigo-200",
    content,
  };
};

export default UserNotificationEvent;
