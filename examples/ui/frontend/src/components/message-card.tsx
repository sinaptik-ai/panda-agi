import React from "react";
import { AlertCircle } from "lucide-react";
import { Message } from "@/lib/types/event-message";
import MarkdownRenderer from "./ui/markdown-renderer";


interface MessageCardProps {
  message: Message;
}

const MessageCard: React.FC<MessageCardProps> = ({ message }) => {
  if (message.type === "user") {
    return (
      <div className="flex justify-end mb-2">
        <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl max-w-xs lg:max-w-md">
          <div className="text-sm font-medium">
            <MarkdownRenderer className="text-white" linkStyle="text-white underline">
              {message.content || ""}
            </MarkdownRenderer>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "error") {
    return (
      <div className="flex justify-start mb-2">
        <div className="bg-red-50/80 border border-red-200/50 text-red-700 px-4 py-2 rounded-2xl max-w-md flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm font-medium">
            <MarkdownRenderer className="text-red-700">
              {message.content || ""}
            </MarkdownRenderer>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MessageCard;
