import React from "react";
import FileWriteEvent from "./events/file-write";
import FileReplaceEvent from "./events/file-replace";
import FileReadEvent from "./events/file-read";
import UserMessageEvent from "./events/user-message";
import FileUploadEvent from "./events/file-upload";
import ImageGenerationEvent from "./events/image-generation";
import WebSearchEvent from "./events/web-search-query";
import WebSearchResultEvent from "./events/web-search-results";
import WebNavigationResultEvent from "./events/web-navigation-results";
import FileFindEvent from "./events/file-find";
import FileExploreEvent from "./events/file-explore";
import ShellExecEvent from "./events/shell-exec";
import ShellViewEvent from "./events/shell-view";
import ShellWriteEvent from "./events/shell-write";
import SkillUseEvent from "./events/use-skill";

// Define interfaces for the component props
interface PreviewData {
  title?: string;
  filename?: string;
  url?: string;
  content?: string;
  type?: string;
}

interface EventListProps {
  message: {
    event?: {
      data?: {
        type?: string;
        payload?: any;
        timestamp?: string;
      };
    };
  };
  conversationId?: string;
  onPreviewClick?: (previewData: PreviewData) => void;
  onFileClick?: (filename: string) => void;
}

interface EventComponentConfig {
  component: React.FC<any>;
  props: string[];
}

interface SpecialEventHandler {
  (props: {
    payload: any;
    onPreviewClick?: (previewData: PreviewData) => void;
    onFileClick?: (filename: string) => void;
    conversationId?: string;
    timestamp?: string;
  }): React.ReactElement | null;
}

// Event type mapping with their components and required props
const EVENT_COMPONENTS: Record<string, EventComponentConfig> = {
  web_navigation_result: {
    component: WebNavigationResultEvent,
    props: ["payload"],
  },
  file_write: {
    component: FileWriteEvent,
    props: ["payload", "onPreviewClick"],
  },
  file_replace: {
    component: FileReplaceEvent,
    props: ["payload", "onPreviewClick"],
  },
  shell_exec: {
    component: ShellExecEvent,
    props: ["payload"],
  },
  shell_view: {
    component: ShellViewEvent,
    props: ["payload"],
  },
  shell_write: {
    component: ShellWriteEvent,
    props: ["payload"],
  },
  file_read: {
    component: FileReadEvent,
    props: ["payload", "onPreviewClick"],
  },
  web_search: {
    component: WebSearchEvent,
    props: ["payload", "onPreviewClick"],
  },
  image_generation: {
    component: ImageGenerationEvent,
    props: ["payload", "onPreviewClick"],
  },
  file_find: {
    component: FileFindEvent,
    props: ["payload", "onPreviewClick"],
  },
  file_explore: {
    component: FileExploreEvent,
    props: ["payload", "onPreviewClick"],
  },
  file_upload: {
    component: FileUploadEvent,
    props: ["payload", "onPreviewClick"],
  },
  web_search_result: {
    component: WebSearchResultEvent,
    props: ["payload"],
  },
  use_skill_result: {
    component: SkillUseEvent,
    props: ["payload"],
  },
};

// Special cases for event types that need custom handling
const SPECIAL_EVENT_HANDLERS: Record<string, SpecialEventHandler> = {
  user_notification: (props) => <UserMessageEvent {...props} />,
  user_question: (props) => <UserMessageEvent {...props} />,
  error: (props) => <UserMessageEvent {...props} />,
};

const EventList: React.FC<EventListProps> = ({
  message,
  conversationId,
  onPreviewClick,
  onFileClick,
}) => {
  if (!message) return null;
  if (!message.event || !message.event.data) return null;

  const eventData = message.event.data;
  const eventType = eventData.type || "unknown";
  const payload = eventData.payload;

  // Handle special cases first
  if (eventType in SPECIAL_EVENT_HANDLERS) {
    return SPECIAL_EVENT_HANDLERS[eventType]({
      payload,
      onPreviewClick,
      onFileClick,
      conversationId,
      timestamp: eventData.timestamp,
    });
  }

  // Handle regular event types
  const eventConfig = EVENT_COMPONENTS[eventType];
  if (!eventConfig) {
    return null;
  }

  const { component: Component } = eventConfig;
  const componentProps = {
    payload,
    onPreviewClick,
  };

  return <Component {...componentProps} />;
};

export default EventList;
