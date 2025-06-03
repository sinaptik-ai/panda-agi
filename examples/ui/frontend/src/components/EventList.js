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

// Event type mapping with their components and required props
const EVENT_COMPONENTS = {
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
};

// Special cases for event types that need custom handling
const SPECIAL_EVENT_HANDLERS = {
  user_notification: (props) => UserMessageEvent(props),
  user_question: (props) => UserMessageEvent(props),
};

const EventList = ({ message, onPreviewClick, onFileClick }) => {
  if (!message.event || !message.event.data) return null;

  const eventData = message.event.data;
  const eventType = eventData.type || "unknown";
  const payload = eventData.payload;

  // Handle special cases first
  if (SPECIAL_EVENT_HANDLERS[eventType]) {
    return SPECIAL_EVENT_HANDLERS[eventType]({
      payload,
      onPreviewClick,
      onFileClick,
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

  return Component(componentProps);
};

export default EventList;
