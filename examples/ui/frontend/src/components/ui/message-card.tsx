import React from "react";
import { formatTimestamp } from "@/lib/date";

interface MessageCardProps {
  content: React.ReactNode;
  color?: string;
  timestamp?: string;
}

const MessageCard: React.FC<MessageCardProps> = ({ content, color = "", timestamp }) => {
  return (
    <div className="flex justify-start">
      <div className={`event-card min-w-80 max-w-2xl ${color} relative`}>
        {timestamp && (
          <span className="absolute top-3 right-3 text-xs text-gray-500">
            {formatTimestamp(timestamp)}
          </span>
        )}

        {content}
      </div>
    </div>
  );
};

export default MessageCard;
