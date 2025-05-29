import React from "react";
import UserNotificationEvent from "./events/UserNotificationEvent";
import WebSearchEvent from "./events/WebSearchEvent";
import WebSearchResultEvent from "./events/WebSearchResultEvent";
import WebNavigationEvent from "./events/WebNavigationEvent";
import FileOperationEvent from "./events/FileOperationEvent";
import ShellOperationEvent from "./events/ShellOperationEvent";
import ImageGenerationEvent from "./events/ImageGenerationEvent";
import LegacyEvent from "./events/LegacyEvent";
import UnknownEvent from "./events/UnknownEvent";

const EventCard = ({ message }) => {
  if (!message.event || !message.event.data) return null;

  const eventData = message.event.data;
  const eventType = eventData.type || "unknown";
  const payload = eventData.payload;

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventDetails = (payload, eventType) => {
    switch (eventType) {
      // User events
      case "user_notification":
      case "user_question":
        return UserNotificationEvent({ payload, eventType });

      // Web operations
      case "web_search":
        return WebSearchEvent({ payload, eventType });

      case "web_search_result":
        return WebSearchResultEvent({ payload, eventType });

      case "web_navigation":
      case "web_navigation_result":
        return WebNavigationEvent({ payload, eventType });

      // File operations
      case "file_read":
      case "file_write":
      case "file_replace":
      case "file_find":
      case "file_explore":
        return FileOperationEvent({ payload, eventType });

      // Shell operations
      case "shell_exec":
      case "shell_view":
      case "shell_write":
        return ShellOperationEvent({ payload, eventType });

      // Image operations
      case "image_generation":
        return ImageGenerationEvent({ payload, eventType });

      // Legacy event types
      case "agent_request":
      case "tool_result":
      case "completion":
      case "connection_success":
      case "web_visit_page":
      case "user_send_message":
      case "shell_exec_command":
      case "error":
        return LegacyEvent({ payload, eventType });

      // Unknown/fallback
      default:
        return UnknownEvent({ payload, eventType });
    }
  };

  const eventDetails = getEventDetails(payload, eventType);

  if (!eventDetails) return null;

  return (
    <div className="flex justify-start">
      <div className={`event-card max-w-2xl ${eventDetails.color} relative`}>
        <span className="absolute top-3 right-3 text-xs text-gray-500">
          {formatTimestamp(eventData.timestamp || message.timestamp)}
        </span>

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
              {eventData.status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
