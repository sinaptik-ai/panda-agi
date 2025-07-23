export interface EventData {
    data: {
      tool_name?: string;
      input_params?: unknown;
      output_params?: unknown;
      id?: string | null;
      event_type?: string;
    };
    event_type: string;
    timestamp:  string;
}

export interface Message {
    id: number;
    type: 'user' | 'error' | 'event';
    event?: EventData;
    timestamp: string;
    content?: string;  
}