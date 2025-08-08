import React, { useState, useEffect, useRef } from "react";
import {
    ExternalLink,
  X,
} from "lucide-react";
import MarkdownRenderer from "./ui/markdown-renderer";
import { getBackendServerURL } from "@/lib/server";
import { getApiHeaders } from "@/lib/api/common";

export interface ArtifactData {
  id: string;
  name: string;
  filepath: string;
  conversation_id: string;
  created_at: string;
  metadata: Record<string, any>;
}

interface ArtifactViewerProps {
  isOpen: boolean;
  onClose: () => void;
  artifact?: ArtifactData;
  width?: number;
  onResize?: (width: number) => void;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  isOpen,
  onClose,
  artifact,
  width,
  onResize,
}) => {
  // State for sidebar width - use props if provided, otherwise default to 900
  const [sidebarWidth, setSidebarWidth] = useState(width || 900);

  // Update internal state when width prop changes
  useEffect(() => {
    if (width && width !== sidebarWidth) {
      setSidebarWidth(width);
    }
  }, [width, sidebarWidth]);
  
  const [isResizing, setIsResizing] = useState(false);
  const minWidth = 400;
  const maxWidth = 1050;
  const resizeRef = useRef<HTMLDivElement>(null);

  // Add resize event listeners with improved handling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate new width based on mouse position
      let newWidth = window.innerWidth - e.clientX;

      // Apply constraints with smoothing
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      // Always update width when resizing for smoother experience
      setSidebarWidth(newWidth);

      // Notify parent component about width changes if callback is provided
      if (onResize) {
        onResize(newWidth);
      }

      // Prevent text selection during resize
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    // Handle cases where mouse moves outside the window
    const handleMouseLeave = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isResizing, minWidth, maxWidth, onResize]);

  // Start resizing
  const startResizing = () => {
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Apply sidebar open class to body for main content shrinking
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("sidebar-open");
      // Add specific class to app container element for better targeting
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.add("content-shrink");
      }
    } else {
      document.body.classList.remove("sidebar-open");
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.remove("content-shrink");
      }
    }

    return () => {
      document.body.classList.remove("sidebar-open");
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.remove("content-shrink");
      }
    };
  }, [isOpen]);

  // State for file content
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch file content when artifact changes
  useEffect(() => {
    if (!artifact) {
      setFileContent(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    fetchArtifactContent();
  }, [artifact]);

  // Function to fetch artifact content
  const fetchArtifactContent = async () => {
    if (!artifact) return;

    setIsLoading(true);
    setError(null);

    try {
      const fileUrl = getBackendServerURL(
        `/artifacts/${artifact.id}/${encodeURIComponent(artifact.filepath)}`
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiHeaders: any = await getApiHeaders();

      const response = await fetch(fileUrl, { headers: apiHeaders });

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(errorMessage?.detail || `Failed to fetch artifact: ${response.status}!`);
      }

      const content = await response.text();
      setFileContent(content);
    } catch (err) {
      console.error("Error fetching artifact content:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !artifact) return null;

  // Get file extension and determine type
  const getFileExtension = (filepath: string): string => {
    return filepath.split(".").pop()?.toLowerCase() || "";
  };

  const getFileType = (filepath: string): string => {
    const extension = getFileExtension(filepath);
    
    if (extension === "md" || extension === "markdown") {
      return "markdown";
    } else if (extension === "html" || extension === "htm") {
      return "iframe";
    } else {
      return "markdown"; // Default to markdown for other file types
    }
  };

  // Render content based on type
  const renderContent = () => {
    const type = getFileType(artifact.filepath);
    const content = fileContent || "";

    // Show loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col text-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Loading artifact content...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-500">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="font-medium">Error loading artifact</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </div>
      );
    }

    switch (type) {
      case "markdown":
        const fileUrl = getBackendServerURL(
            `/artifacts/${artifact.id}/`
          );
        return (
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer baseUrl={fileUrl}>{content}</MarkdownRenderer>
          </div>
        );
      case "iframe":
        return (
          <div className="h-full">
            <iframe
              src={getBackendServerURL(
                `/artifacts/${artifact.id}/${encodeURIComponent(artifact.filepath)}`
              )}
              className="w-full h-full border-0"
              title={artifact.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        );
      default:
        return (
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer>{content}</MarkdownRenderer>
          </div>
        );
    }
  };

  return (
    <div
      className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col"
      style={{
        width: `${sidebarWidth}px`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--sidebar-width" as any]: `${sidebarWidth}px`,
      }}
    >
      {/* Resize handle */}
      <div
        ref={resizeRef}
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50 z-50"
        onMouseDown={startResizing}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {artifact.name}
          </h3>
          <a
              href={
                getBackendServerURL(
                    `/artifacts/${artifact.id}/${encodeURIComponent(artifact.filepath)}`
                  )
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center space-x-1 mt-1"
            >
              <span className="truncate">
                {artifact.filepath}
              </span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close preview"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default ArtifactViewer;

// Add this to your global CSS file or inject it here
const globalStyles = `
  body.sidebar-open {
    overflow-x: hidden;
  }
  
  /* Direct targeting for main app container */
  .content-shrink {
    max-width: calc(100% - var(--sidebar-width));
    transition: max-width 0.3s ease;
  }
  
  /* Make sure chat interface and messages shrink */
  .content-shrink .max-w-4xl {
    width: 100%;
    max-width: calc(100% - 2rem) !important;
    transition: max-width 0.3s ease;
  }
  
  /* Ensure message cards shrink properly */
  .content-shrink .max-w-4xl .bg-white/70 {
    width: 100%;
  }
  
  /* Ensure the input area shrinks properly */
  .content-shrink .max-w-4xl textarea,
  .content-shrink .max-w-4xl .flex-1 {
    width: 100%;
  }
`;

// Inject the global styles
if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.type = "text/css";
  styleEl.innerHTML = globalStyles;
  document.head.appendChild(styleEl);
} 