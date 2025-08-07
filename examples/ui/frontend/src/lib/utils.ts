import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


const toolNameMap: Record<string, string> = {
  "planning": "Panda is planning...",
  "file_upload": "Panda is uploading files...",
  "shell_exec_command": "Panda is executing a command...",
  "web_search": "Panda is searching the web...",
  "web_visit_page": "Panda is visiting the web pages...",
  "file_read": "Panda is reading files...",
  "file_write": "Panda is writing files...",
  "deploy_server": "Panda is deploying a server...",
  "execute_script": "Panda is executing a script..."
}

export function formatAgentMessage(toolName: string) {
  return toolNameMap[toolName] ?? 'Panda is thinking...';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generatePayload(eventType: string, eventData: any) {
  
  if (eventType === "planning") {
    return {
        text:  eventData.input_params.content
    }
  } else if (eventType === "user_send_message") {
    return {
       text:  eventData.input_params.text,
       attachments: eventData.input_params.attachments
    }
  } else if (eventType === "file_write") {
    return {
      path: eventData.output_params.path,
      file: eventData.output_params.file,
      content: eventData.input_params.content
    }
  } else if (eventType === "deploy_server") {
    return {
        tool_name: eventData.tool_name,
        parameters: eventData.input_params,
        result: {
          data: eventData.output_params
        }
    }
  } else if (eventType === "shell_exec_command"){
    return {
      command: eventData.input_params.command,
      output: eventData.output_params.stdout
    }
  } else if (eventType === "error") {
    return {
      error: eventData.error
    }
  } else if (eventType === "file_read") { 
    return  {
        file: eventData.input_params.file,
        path: eventData.input_params.path,
        content: eventData.output_params.content,
        start_line: eventData.input_params.start_line,
        end_line: eventData.input_params.end_line
    }
  } else if (eventType === "file_upload") {
    return eventData.output_params
  } else if (eventType === "web_search") {
    return {
      query: eventData.input_params.query,
      results: eventData.output_params.results
    }
  } else if (eventType === "web_visit_page") {
    return {
      url: eventData.input_params.url,
    }
  } else {
    // Generic fallback for any unknown tool
    return {
      tool_name: eventType,
      parameters: eventData.input_params || {},
      result: {
        data: eventData.input_params || eventData.result || "Tool executed successfully"
      }
    };
  }
}


export async function downloadWithCheck(url: string, filename: string) {
    const res = await fetch(url);
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.detail || `Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
}