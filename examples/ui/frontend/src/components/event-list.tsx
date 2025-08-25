import React from "react";
import FileWriteEvent from "./events/file-write";
import FileReplaceEvent from "./events/file-replace";
import FileReadEvent from "./events/file-read";
import UserMessageEvent, { UserMessageEventProps, UserMessagePayload } from "./events/user-message";
import FileUploadEvent from "./events/file-upload";
import ImageGenerationEvent from "./events/image-generation";
import WebSearchResultEvent from "./events/web-search-results";
import WebNavigationResultEvent from "./events/web-navigation-results";
import FileFindEvent from "./events/file-find";
import FileExploreEvent from "./events/file-explore";
import ShellExecEvent from "./events/shell-exec";
import ShellViewEvent from "./events/shell-view";
import ShellWriteEvent from "./events/shell-write";
import ExecuteScriptEvent from "./events/execute-script";
import ToolUseEvent from "./events/use-skill";
import ToolErrorEvent from "./events/tool-error";
import { Message } from "@/lib/types/event-message";
import { generatePayload } from "@/lib/utils";

// Define interfaces for the component props
interface PreviewData {
  title?: string;
  filename?: string;
  url?: string;
  content?: string;
  type?: string;
}

interface EventListProps {
  message: Message;
  conversationId?: string;
  onPreviewClick?: (previewData: PreviewData) => void;
  onFileClick?: (filename: string) => void;
  openUpgradeModal?: () => void;
}

interface EventComponentConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.FC<any>;
  props: string[];
}

// Event type mapping with their components and required props
const EVENT_COMPONENTS: Record<string, EventComponentConfig> = {
  web_navigation_result: {
    component: WebNavigationResultEvent,
    props: ["payload"],
  },
  web_visit_page: {
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
  shell_exec_command: {
    component: ShellExecEvent,
    props: ["payload"],
  },
  execute_script: {
    component: ExecuteScriptEvent,
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
  web_search: {
    component: WebSearchResultEvent,
    props: ["payload"],
  },
  use_skill_result: {
    component: ToolUseEvent,
    props: ["payload"],
  },
  deploy_server: {
    component: ToolUseEvent,
    props: ["payload"],
  },
  error: {
    component: ToolErrorEvent,
    props: ["payload", "openUpgradeModal"],
  }
};

// Special cases for event types that need custom handling
const SPECIAL_EVENT_HANDLERS: Record<string, React.FC<UserMessageEventProps>> = {
  user_send_message: UserMessageEvent,
  user_question: UserMessageEvent,
  exception: UserMessageEvent
};

const EventList: React.FC<EventListProps> = ({
  message,
  conversationId,
  onPreviewClick,
  onFileClick,
  openUpgradeModal
}) => {
  if (!message) return null;
  if (!message.event || !message.event.data) return null;

  const eventData = message.event.data;
  let eventType = eventData.tool_name || eventData.event_type || "unknown";

  if (message.event.event_type === "error") {
    eventType = message.event.event_type
  }


  const payload = generatePayload(eventType, eventData);

  // Handle special cases first
  if (eventType in SPECIAL_EVENT_HANDLERS) {
    const userMessagePayload = payload as unknown as UserMessagePayload;
    const SpecialComponent = SPECIAL_EVENT_HANDLERS[eventType as keyof typeof SPECIAL_EVENT_HANDLERS];
    return (
      <SpecialComponent
        payload={userMessagePayload}
        onPreviewClick={onPreviewClick}
        onFileClick={onFileClick}
        conversationId={conversationId}
        timestamp={message.event.timestamp}
        openUpgradeModal={openUpgradeModal}
      />
    );
  }

  // Handle regular event types
  const eventConfig = EVENT_COMPONENTS[eventType];
  
  if (eventConfig) {
    // Use specific component if found
    const { component: Component } = eventConfig;
    const componentProps = {
      payload,
      onPreviewClick,
      openUpgradeModal,
    };
    return <Component {...componentProps} />;
  } else if (!["completed_task", "planning"].includes(eventType)) {
    // Use ToolUseEvent as fallback for any unknown tool
    const toolPayload = {
      tool_name: eventType,
      parameters: (eventData.input_params as Record<string, unknown>) || {},
      result: {
        data: typeof eventData.input_params === 'string' 
          ? eventData.input_params 
          : eventData.input_params as Record<string, unknown> || "Tool executed successfully"
      }
    };
    
    return <ToolUseEvent payload={toolPayload} />;
  }
};

export default EventList;
