import React from "react";
import { User, AlertCircle } from "lucide-react";

const MessageCard = ({ message }) => {
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - eventTime) / 1000);

    if (diffInSeconds < 60) {
      return diffInSeconds <= 1 ? "just now" : `${diffInSeconds}s ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? "1 min ago" : `${diffInMinutes} mins ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
    }

    // For older events, fall back to date format
    return eventTime.toLocaleDateString();
  };

  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="chat-message bg-blue-500 text-white max-w-xs lg:max-w-md">
          <p className="text-sm">{message.content}</p>
          <p className="text-xs text-blue-100 mt-1 text-right">
            {formatTimestamp(message.timestamp)}
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
              <p className="text-sm">{message.content}</p>
              <p className="text-xs text-red-600 mt-1 text-right">
                {formatTimestamp(message.timestamp)}
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
