import React from "react";
import { AlertCircle, CreditCard } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";

const UserNotificationEvent = ({
  payload,
  eventType,
  onPreviewClick,
  timestamp,
}) => {
  if (!payload) return null;

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

  // Check if this is an error notification
  const isError =
    payload.error ||
    (payload.text && payload.text.toLowerCase().includes("error"));

  // Check specifically for token/credit related errors
  const isTokenError =
    isError &&
    ((payload.error && payload.error.toLowerCase().includes("token")) ||
      (payload.error && payload.error.toLowerCase().includes("credit")) ||
      typeof payload.credits_left !== "undefined");

  const renderErrorContent = () => {
    return (
      <div>
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">
              {isTokenError ? "Insufficient Credits" : "Error"}
            </h4>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">
              {payload.error ||
                payload.text ||
                payload.message ||
                "An error occurred"}
            </p>

            {isTokenError && typeof payload.credits_left !== "undefined" && (
              <div className="mt-3 bg-gray-50 border border-gray-200 p-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-gray-600 font-medium">
                    <CreditCard className="w-4 h-4 mr-2 text-gray-500" />
                    Credits Remaining
                  </span>
                  <span className="font-semibold text-gray-900">
                    {payload.credits_left} / {payload.total_credits || "∞"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        {timestamp && (
          <p className="text-xs text-gray-400 mt-3 text-right font-medium">
            {formatTimestamp(timestamp)}
          </p>
        )}
      </div>
    );
  };

  const renderStandardContent = () => (
    <div>
      <MarkdownRenderer onPreviewClick={onPreviewClick}>
        {payload.text || payload.message}
      </MarkdownRenderer>
      {payload.attachments && payload.attachments.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-700 font-semibold mb-2">
            Attachments
          </p>
          <div className="space-y-2">
            {payload.attachments.map((attachment, index) => (
              <div
                key={index}
                className="text-sm p-2 bg-gray-50 rounded-md border border-gray-200 flex items-center"
              >
                <span className="text-gray-500 mr-2">📎</span>
                <span className="text-gray-700">{attachment}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {timestamp && (
        <p className="text-xs text-gray-400 mt-3 text-right font-medium">
          {formatTimestamp(timestamp)}
        </p>
      )}
    </div>
  );

  const content = isError ? renderErrorContent() : renderStandardContent();

  return {
    color: isError ? "bg-red-50 border-red-200/60" : "bg-white border-gray-200",
    content,
  };
};

export default UserNotificationEvent;
