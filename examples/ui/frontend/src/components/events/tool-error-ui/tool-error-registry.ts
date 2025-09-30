import { ComponentType } from 'react';
import ExecuteScriptError from './execute-script-error';
import WebVisitFailure from './web-visit-failure';
import DefaultError from './default-error';
import FileOperationError from './file-operation-error';
import ShellOperationError from './shell-operation-error';

export interface ToolErrorPayload {
  tool_name?: string;
  input_params?: Record<string, unknown>;
  error?: string;
  isUpgradeErrorMessage?: boolean;
  timestamp?: string | number;
  // Support for upgrade-required payload format
  type?: string;
  message?: string;
}

export interface ToolErrorComponentProps {
  payload: ToolErrorPayload;
}

export type ToolErrorComponent = ComponentType<ToolErrorComponentProps>;

// Tool matcher function type
export type ToolMatcher = (payload: ToolErrorPayload) => boolean;

// Tool error configuration
export interface ToolErrorConfig {
  matcher: ToolMatcher;
  component: ToolErrorComponent;
  priority: number; // Higher priority matches are checked first
}

// Tool matchers
export const toolMatchers = {
  // Execute script tools
  executeScript: (payload: ToolErrorPayload): boolean => {
    const toolName = payload.tool_name?.toLowerCase() || '';
    return toolName.includes("execute script") || toolName.includes("script");
  },

  // Web visit tools
  webVisit: (payload: ToolErrorPayload): boolean => {
    const toolName = payload.tool_name?.toLowerCase() || '';
    return toolName.includes("web") && 
           toolName.includes("visit") && 
           !!payload.input_params?.url;
  },

  // File operations
  fileOperation: (payload: ToolErrorPayload): boolean => {
    const toolName = payload.tool_name?.toLowerCase() || '';
    return toolName.includes("file") || 
           toolName.includes("read") || 
           toolName.includes("write") ||
           toolName.includes("upload");
  },

  // Shell operations
  shellOperation: (payload: ToolErrorPayload): boolean => {
    const toolName = payload.tool_name?.toLowerCase() || '';
    return (toolName.includes("shell") || 
            toolName.includes("command") || 
            toolName.includes("exec")) &&
           (!!payload.input_params?.command || 
            !!payload.input_params?.cmd || 
            !!payload.input_params?.script);
  },

  // Web search operations
  webSearch: (payload: ToolErrorPayload): boolean => {
    const toolName = payload.tool_name?.toLowerCase() || '';
    return toolName.includes("web_search");
  },

  // Image generation
  imageGeneration: (payload: ToolErrorPayload): boolean => {
    const toolName = payload.tool_name?.toLowerCase() || '';
    return toolName.includes("image") && toolName.includes("generate")
  }
};

// Tool error registry
export const toolErrorRegistry: ToolErrorConfig[] = [
  {
    matcher: toolMatchers.executeScript,
    component: ExecuteScriptError,
    priority: 100
  },
  {
    matcher: toolMatchers.webVisit,
    component: WebVisitFailure,
    priority: 90
  },
  {
    matcher: toolMatchers.fileOperation,
    component: FileOperationError,
    priority: 80
  },
  {
    matcher: toolMatchers.shellOperation,
    component: ShellOperationError,
    priority: 70
  },

  // Default fallback - always last with lowest priority
  {
    matcher: () => true, // Matches everything
    component: DefaultError,
    priority: 0
  }
];

// Function to find the appropriate component for a tool error
export function findToolErrorComponent(payload: ToolErrorPayload): ToolErrorComponent {
  // Sort by priority (highest first) and find the first matching configuration
  const sortedRegistry = [...toolErrorRegistry].sort((a, b) => b.priority - a.priority);
  
  for (const config of sortedRegistry) {
    if (config.matcher(payload)) {
      return config.component;
    }
  }
  
  // Fallback to default (should never reach here due to the catch-all matcher)
  return DefaultError;
}

// Helper function to register a new tool error configuration
export function registerToolError(config: ToolErrorConfig): void {
  // Remove any existing configuration with the same matcher
  const existingIndex = toolErrorRegistry.findIndex(
    existing => existing.matcher === config.matcher
  );
  
  if (existingIndex !== -1) {
    toolErrorRegistry.splice(existingIndex, 1);
  }
  
  // Add the new configuration
  toolErrorRegistry.push(config);
  
  // Re-sort by priority
  toolErrorRegistry.sort((a, b) => b.priority - a.priority);
} 