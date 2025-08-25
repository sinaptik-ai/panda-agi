import React from "react";
import { AlertCircle } from "lucide-react";
import { formatTimestamp } from "@/lib/date";
import { Message } from "@/lib/types/event-message";
import MarkdownRenderer from "./ui/markdown-renderer";


interface MessageCardProps {
  message: Message;
}

const MessageCard: React.FC<MessageCardProps> = ({ message }) => {
  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="chat-message bg-blue-500 text-white max-w-xs lg:max-w-md min-w-48">
          <div className="text-sm">
            <MarkdownRenderer className="text-white">
              {message.content || ""}
            </MarkdownRenderer>
          </div>
          <p className="text-xs text-blue-100 mt-1 text-right">
            {message.timestamp && formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  if (message.type === "error") {
    return (
      <div className="flex justify-center">
        <div className="chat-message bg-red-50 border-red-200 text-red-800 max-w-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm">
                <MarkdownRenderer className="text-red-800">
                  {message.content || ""}
                </MarkdownRenderer>
              </div>
              <p className="text-xs text-red-600 mt-1 text-right">
                {message.timestamp && formatTimestamp(message.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MessageCard;
