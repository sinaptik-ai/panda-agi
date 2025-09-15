import React, { useState, useEffect, useRef, ReactNode } from "react";
import {
  X,
  Loader2,
  Maximize2,
  Minimize2,
  Share2,
  MoreVertical,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";

interface ResizableSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: {
    text: string;
    href?: string;
  };
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: number;
  onResize?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  loading?: boolean;
  error?: string | null;
  className?: string;
  // New props for enhanced functionality
  editableTitle?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onEditTitle?: (triggerEdit: () => void) => void;
  onShare?: () => void;
  onDelete?: () => void;
  enableFullMode?: boolean;
  isFullMode?: boolean;
  onToggleFullMode?: () => void;
}

const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  actions,
  children,
  width,
  onResize,
  minWidth = 400,
  maxWidth = 1100,
  loading = false,
  error = null,
  className,
  // New props
  editableTitle = false,
  onTitleChange,
  onEditTitle,
  onShare,
  onDelete,
  enableFullMode = false,
  isFullMode = false,
  onToggleFullMode,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return width || 1100;

    // On mobile (screen width < 768px), always use full width
    const isMobile = window.innerWidth < 768;
    if (isMobile) return window.innerWidth;

    return width || 1200;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(
    typeof title === "string" ? title : ""
  );
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Check if we're on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Update title value when title prop changes
  useEffect(() => {
    if (typeof title === "string") {
      setTitleValue(title);
    }
  }, [title]);

  // Handle title editing
  const handleTitleClick = () => {
    if (editableTitle && !isEditingTitle) {
      setIsEditingTitle(true);
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 100);
    }
  };

  // Create a stable reference for the trigger function
  const triggerEditRef = useRef(handleTitleClick);
  triggerEditRef.current = handleTitleClick;

  // Expose trigger edit function via callback
  useEffect(() => {
    if (onEditTitle) {
      // Call the callback with a stable wrapper function
      onEditTitle(() => triggerEditRef.current());
    }
  }, [onEditTitle]);

  const handleTitleBlur = async () => {
    if (!isEditingTitle || isSavingTitle) return;

    const newTitle = titleValue.trim();
    if (newTitle !== title && newTitle !== "") {
      setIsSavingTitle(true);
      try {
        if (onTitleChange) {
          onTitleChange(newTitle);
        }
      } catch (error) {
        console.error("Failed to update title:", error);
        toast.error("Failed to update title");
        setTitleValue(typeof title === "string" ? title : "");
      } finally {
        setIsSavingTitle(false);
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setTitleValue(typeof title === "string" ? title : "");
      setIsEditingTitle(false);
    }
  };

  const handleShareClick = () => {
    if (onShare) {
      onShare();
    }
  };

  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const handleFullModeClick = () => {
    if (onToggleFullMode) {
      onToggleFullMode();
    } else {
      // Fallback: Toggle full mode directly if no handler provided
      const newWidth = isFullMode ? width || 1100 : window.innerWidth;
      setSidebarWidth(newWidth);
      if (onResize) {
        onResize(newWidth);
      }
    }
  };

  // Handle mount animation
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  // Update internal state when width prop changes
  useEffect(() => {
    const currentIsMobile =
      typeof window !== "undefined" && window.innerWidth < 768;
    if (currentIsMobile) {
      setSidebarWidth(window.innerWidth);
      return;
    }

    if (width && width !== sidebarWidth) {
      setSidebarWidth(width);
    }
  }, [width, sidebarWidth]);

  // Add resize event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || isMobile) return; // Don't resize on mobile

      let newWidth = window.innerWidth - e.clientX;
      const maxAllowedWidth = Math.min(maxWidth, window.innerWidth);
      newWidth = Math.max(minWidth, Math.min(maxAllowedWidth, newWidth));

      setSidebarWidth(newWidth);

      if (onResize) {
        onResize(newWidth);
      }

      e.preventDefault();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

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

  // Handle window resize to keep sidebar within bounds
  useEffect(() => {
    const handleWindowResize = () => {
      const isCurrentlyMobile = window.innerWidth < 768;

      if (isCurrentlyMobile) {
        // On mobile, always use full width
        setSidebarWidth(window.innerWidth);
        if (onResize) {
          onResize(window.innerWidth);
        }
      } else {
        // On desktop, constrain to maxWidth
        const maxAllowedWidth = Math.min(maxWidth, window.innerWidth);
        if (sidebarWidth > maxAllowedWidth) {
          setSidebarWidth(maxAllowedWidth);
          if (onResize) {
            onResize(maxAllowedWidth);
          }
        }
      }
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [sidebarWidth, maxWidth, onResize]);

  const startResizing = () => {
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Apply sidebar open class to body for main content shrinking
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("sidebar-open");
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

  if (!isOpen) return null;

  // Render loading state
  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-2xl mb-3">⚠️</div>
        <p className="font-medium text-destructive">Error loading content</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full bg-background border-l shadow-lg z-50 flex flex-col",
        "transition-all duration-200 ease-out",
        className
      )}
      style={{
        width: `${sidebarWidth}px`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--sidebar-width" as any]: `${sidebarWidth}px`,
        transform: mounted ? "translateX(0)" : "translateX(100%)",
        transition:
          "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms ease-out",
      }}
    >
      {/* Resize handle - only show on desktop */}
      {!isMobile && (
        <div
          ref={resizeRef}
          className={cn(
            "absolute left-0 top-0 w-1 h-full cursor-col-resize z-50",
            "hover:bg-primary/50 transition-colors duration-200"
          )}
          onMouseDown={startResizing}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between p-6 border-b bg-muted/30"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 200ms ease-out 150ms",
        }}
      >
        <div className="flex items-center gap-2">
          {/* Full mode toggle - only show on desktop */}
          {enableFullMode && !isMobile && (
            <button
              onClick={handleFullModeClick}
              className="h-8 w-8 rounded-md hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
              title={isFullMode ? "Exit full mode" : "Enter full mode"}
            >
              {isFullMode ? (
                <Minimize2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground flex items-center gap-2">
              {icon}
              <div className="flex-1 min-w-0">
                {editableTitle && isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    disabled={isSavingTitle}
                    className="bg-transparent border-none outline-none font-semibold text-foreground w-full min-w-[300px] max-w-[600px] px-2 py-1 -mx-2 -my-1 rounded focus:bg-accent"
                    style={{ width: 'max(300px, min(600px, 100%))' }}
                  />
                ) : (
                  <div
                    onClick={handleTitleClick}
                    className={cn(
                      "inline-flex items-center gap-2 group",
                      editableTitle
                        ? "cursor-pointer hover:bg-accent/50 px-2 py-1 -mx-2 -my-1 rounded transition-colors"
                        : ""
                    )}
                    title={editableTitle ? "Click to edit" : undefined}
                  >
                    <span className="whitespace-nowrap">
                      {typeof title === "string" ? title : title}
                    </span>
                    {editableTitle && (
                      <Pencil className="h-4 w-4 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}

          {/* Share button */}
          {onShare && (
            <button
              onClick={handleShareClick}
              className="h-8 w-8 rounded-md hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
              title="Share"
            >
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* More options dropdown */}
          {onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-8 w-8 rounded-md hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
                  title="More options"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            onClick={onClose}
            className={cn(
              "h-8 w-8 rounded-md hover:bg-accent transition-colors",
              "flex items-center justify-center cursor-pointer"
            )}
            title="Close preview"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-6"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 200ms ease-out 300ms",
        }}
      >
        {loading ? renderLoadingState() : error ? renderErrorState() : children}
      </div>
    </div>
  );
};

export default ResizableSidebar;
