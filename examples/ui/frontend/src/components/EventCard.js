import React from "react";
import UserNotificationEvent from "./events/UserNotificationEvent";
import WebSearchEvent from "./events/WebSearchEvent";
import WebSearchResultEvent from "./events/WebSearchResultEvent";
import WebNavigationEvent from "./events/WebNavigationEvent";
import FileReadEvent from "./events/FileReadEvent";
import FileContentEvent from "./events/FileContentEvent";
import FileDiscoveryEvent from "./events/FileDiscoveryEvent";
import FileUploadEvent from "./events/FileUploadEvent";
import ShellOperationEvent from "./events/ShellOperationEvent";
import ImageGenerationEvent from "./events/ImageGenerationEvent";

const EventCard = ({ message, onPreviewClick }) => {
  if (!message.event || !message.event.data) return null;

  const eventData = message.event.data;
  const eventType = eventData.type || "unknown";
  const payload = eventData.payload;

  if (
    eventType === "shell_exec" ||
    eventType === "shell_view" ||
    eventType === "shell_write"
  ) {
    return ShellOperationEvent({ payload, eventType });
  }

  // Handle file_read events specially - render them directly without card wrapper
  if (eventType === "file_read") {
    return FileReadEvent({ payload, eventType, onPreviewClick });
  }

  // Handle file discovery events specially - render them directly without card wrapper
  if (eventType === "file_find" || eventType === "file_explore") {
    return FileDiscoveryEvent({ payload, eventType, onPreviewClick });
  }

  // Handle file upload events specially - render them directly without card wrapper
  if (eventType === "file_upload") {
    return FileUploadEvent({ payload, eventType, onPreviewClick });
  }

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

  const getEventDetails = (payload, eventType, timestamp) => {
    switch (eventType) {
      case "agent_connection_success":
      case "completed_task":
        // DO NOTHING
        return null;

      // User events
      case "user_notification":
      case "user_question":
        return UserNotificationEvent({
          payload,
          eventType,
          onPreviewClick,
          timestamp,
        });

      // Web operations
      case "web_search":
        return WebSearchEvent({ payload, eventType, onPreviewClick });

      case "web_search_result":
        return WebSearchResultEvent({ payload, eventType });

      case "web_navigation":
      case "web_navigation_result":
        return WebNavigationEvent({ payload, eventType, onPreviewClick });

      // File operations
      case "file_write":
      case "file_replace":
        return FileContentEvent({ payload, eventType, onPreviewClick });

      // Image operations
      case "image_generation":
        return ImageGenerationEvent({ payload, eventType, onPreviewClick });

      default:
        return null;
    }
  };

  const eventDetails = getEventDetails(
    payload,
    eventType,
    eventData.timestamp || message.timestamp
  );

  if (!eventDetails) return null;

  // Check if this is a user notification event to hide the absolute timestamp
  const isUserNotification =
    eventType === "user_notification" || eventType === "user_question";

  return (
    <div className="flex justify-start">
      <div
        className={`event-card min-w-80 max-w-2xl ${eventDetails.color} relative`}
      >
        {!isUserNotification && (
          <span className="absolute top-3 right-3 text-xs text-gray-500">
            {formatTimestamp(eventData.timestamp || message.timestamp)}
          </span>
        )}

        {eventDetails.content}

        {eventData.id && (
          <p className="text-xs text-gray-400 font-mono mt-2">
            ID: {eventData.id}
          </p>
        )}

        {eventData.status && (
          <div className="mt-2">
            <span
              className={`event-badge ${
                eventData.status === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {eventData.status} -
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
