import React from "react";
import { FileText, Globe, File, FileCode, FileImage } from "lucide-react";

interface FileIconProps {
  filepath?: string;
  type?: string;
  className?: string;
}

export function getFileIcon(filepath?: string, type?: string) {
  if (type) {
    switch (type) {
      case "code":
        return FileCode;
      case "table":
        return FileText;
      case "image":
        return FileImage;
      case "pdf":
        return File;
      case "markdown":
        return FileText;
      case "html":
        return FileCode;
      case "iframe":
        return Globe;
      default:
        return FileText;
    }
  }

  if (!filepath) return File;

  const extension = filepath.split(".").pop()?.toLowerCase() || "";

  switch (extension) {
    // Code files
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "py":
    case "css":
    case "scss":
    case "json":
    case "xml":
    case "yaml":
    case "yml":
    case "php":
    case "rb":
    case "go":
    case "java":
    case "c":
    case "cpp":
    case "sh":
    case "sql":
      return FileCode;

    // Images
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return FileImage;

    // Markup/Web
    case "html":
    case "htm":
      return FileCode;

    // Markdown/Documentation
    case "md":
    case "markdown":
    case "txt":
      return FileText;

    // Data/Tables
    case "csv":
    case "xlsx":
    case "xls":
      return FileText;

    // PDF
    case "pdf":
      return File;

    default:
      return File;
  }
}

export default function FileIcon({ filepath, type, className = "w-4 h-4" }: FileIconProps) {
  const IconComponent = getFileIcon(filepath, type);

  return <IconComponent className={className} />;
}
