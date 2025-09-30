import React, { useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: {
    text: string;
    href?: string;
  };
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  error?: string | null;
  // Title editing props
  editableTitle?: boolean;
  onTitleChange?: (newTitle: string) => Promise<void>;
  onEditTitle?: (triggerEdit: () => void) => void;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  loading = false,
  error = null,
  editableTitle = false,
  onTitleChange,
  onEditTitle,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(
    typeof title === "string" ? title : ""
  );
  const [titleEditJustTriggered, setTitleEditJustTriggered] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Update title value when title prop changes
  useEffect(() => {
    if (typeof title === "string") {
      setTitleValue(title);
    }
  }, [title]);

  // Handle title editing
  const handleEditTitle = () => {
    setTitleEditJustTriggered(true);
    setIsEditingTitle(true);
    // Clear the flag after a short delay and focus the input
    setTimeout(() => {
      setTitleEditJustTriggered(false);
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 200);
  };

  const handleSaveTitle = async (newTitle: string) => {
    if (onTitleChange) {
      try {
        await onTitleChange(newTitle);
      } catch (error) {
        console.error("Failed to save title:", error);
        // Reset to original value on error
        setTitleValue(typeof title === "string" ? title : "");
      }
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitleEdit = () => {
    setTitleValue(typeof title === "string" ? title : "");
    setIsEditingTitle(false);
  };

  // Handle close with confirmation logic can be added here if needed
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Expose edit trigger function
  useEffect(() => {
    if (onEditTitle) {
      onEditTitle(handleEditTitle);
    }
  }, [onEditTitle]);

  // Render loading state
  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center">
        <div className="text-red-500 text-lg mb-2">⚠️ Error</div>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      {/* Full-screen modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div
          className={cn(
            "w-full h-full max-w-[99vw] max-h-[98vh] mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {icon}
              <div className="flex-1 min-w-0">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    defaultValue={titleValue}
                    className="flex-1 px-2 py-1 text-lg font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 focus:border-gray-400 dark:focus:border-gray-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveTitle(e.currentTarget.value);
                      } else if (e.key === "Escape") {
                        handleCancelTitleEdit();
                      }
                    }}
                    onBlur={(e) => {
                      if (!titleEditJustTriggered) {
                        handleSaveTitle(e.currentTarget.value);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div className="space-y-1">
                    <h1
                      className={cn(
                        "text-lg font-semibold text-gray-900 dark:text-white truncate",
                        editableTitle && "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      )}
                      onClick={editableTitle ? handleEditTitle : undefined}
                      title={editableTitle ? "Click to edit title" : undefined}
                    >
                      {typeof title === "string" ? title : title}
                    </h1>
                    {subtitle && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {subtitle.href ? (
                          <a
                            href={subtitle.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {subtitle.text}
                          </a>
                        ) : (
                          subtitle.text
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {actions}
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {loading ? renderLoadingState() : error ? renderErrorState() : (
              <div className="h-full">{children}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalWrapper;