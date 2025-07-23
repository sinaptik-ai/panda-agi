export interface UploadedFile {
    id: number;
    filename: string;
    original_filename: string;
    size: number;
    path: string;
  }
  
  export interface FileUploadResult {
    filename: string;
    original_filename: string;
    size: number;
    path: string;
    conversation_id?: string;
  }
  