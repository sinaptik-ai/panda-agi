"use client";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Send,
  Square,
  Paperclip,
  X,
  FileText,
  Image,
  File,
  Code,
  Archive,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import EventList from "@/components/event-list";
import MessageCard from "@/components/message-card";
import { Message } from "@/lib/types/event-message";
import { UploadedFile, FileUploadResult } from "@/lib/types/file";
import { getBackendServerURL } from "@/lib/server";
import { getApiHeaders } from "@/lib/api/common";
import { PreviewData } from "@/components/content-sidebar";
import { useGlobalModals } from "@/contexts/global-modals-context";
import { formatAgentMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";
import LoginModal from "@/components/login-modal";
import { AnimatedText } from "@/components/ui/animated-text";
import CSVPreview from "@/components/ui/csv-preview";
import CSVModal from "@/components/ui/csv-modal";
import toast from "react-hot-toast";

interface RequestBody {
  query: string;
  conversation_id?: string;
  file_names?: string[];
}

export interface ChatBoxRef {
  stopCurrentConversation: () => void;
}

interface ChatBoxProps {
  conversationId: string | undefined;
  setConversationId: (id: string | undefined) => void;
  onPreviewClick: (data: PreviewData) => void;
  onFileClick: (filename: string) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  sidebarOpen: boolean;
  sidebarWidth: number;
  isInitialLoading?: boolean;
  initialQuery?: string | null;
  onCreditsRefetch?: () => Promise<void>;
  onUserMessage?: () => void;
}

const ChatBox = forwardRef<ChatBoxRef, ChatBoxProps>(
  (
    {
      conversationId,
      setConversationId,
      onPreviewClick,
      onFileClick,
      setIsConnected,
      sidebarOpen,
      sidebarWidth,
      isInitialLoading = false,
      initialQuery = null,
      onCreditsRefetch,
      onUserMessage,
    }: ChatBoxProps,
    ref
  ) => {
    const { showUpgradeModal } = useGlobalModals();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
    const [uploadingFilesPreviews, setUploadingFilesPreviews] = useState<
      {
        id: number;
        name: string;
        size: number;
        progress: number;
        status: "uploading" | "completed" | "error";
        error?: string;
        content?: string;
      }[]
    >([]);
    const [isDragging, setIsDragging] = useState(false);
    const [currentActivity, setCurrentActivity] = useState<string>("");
    const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [hasSubmittedInitialQuery, setHasSubmittedInitialQuery] =
      useState(false);
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [csvModalData, setCSVModalData] = useState<{
      filename: string;
      content: string;
    } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Function to stop current conversation stream without resetting messages
    const stopCurrentStream = useCallback(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Stop streaming state but keep messages
      setIsLoading(false);
      setIsConnected(false);
      setCurrentActivity("");

      // Reload credits when stream is interrupted
      if (onCreditsRefetch) {
        onCreditsRefetch().catch((error) => {
          console.error("Failed to refetch credits after stopping:", error);
        });
      }
    }, [setIsConnected, onCreditsRefetch]);

    // Function to stop current conversation and reset to default state
    const stopCurrentConversation = useCallback(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Reset all conversation state
      setIsLoading(false);
      setIsConnected(false);
      setMessages([]);
      setInputValue("");
      setPendingFiles([]);
      setUploadingFilesPreviews([]);
      setCurrentActivity("");

      // Reload credits when stream is interrupted
      if (onCreditsRefetch) {
        onCreditsRefetch().catch((error) => {
          console.error("Failed to refetch credits after stopping:", error);
        });
      }
    }, [setIsConnected, onCreditsRefetch]);

    // Expose the stop function to parent components
    useImperativeHandle(
      ref,
      () => ({
        stopCurrentConversation,
      }),
      [stopCurrentConversation]
    );

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Helper function to read CSV file content
    const readCSVFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve((e.target?.result as string) || "");
        };
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
        reader.readAsText(file);
      });
    };

    // Auto-resize textarea based on content
    const resizeTextarea = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "24px"; // Reset to minimum height
        const scrollHeight = textarea.scrollHeight;
        const maxHeight = 120; // Maximum height in pixels
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      }
    };

    // Resize textarea when input value changes
    useEffect(() => {
      resizeTextarea();
    }, [inputValue]);

    // Clear messages when starting a new conversation
    useEffect(() => {
      if (!conversationId) {
        setMessages([]);
        setInputValue("");
        setPendingFiles([]);
        setUploadingFilesPreviews([]);
        setHasSubmittedInitialQuery(false);
      }
    }, [conversationId]);

    // Handle initial query from URL parameter
    useEffect(() => {
      if (initialQuery && !isInitialLoading) {
        setInputValue(initialQuery);
      }
    }, [initialQuery, isInitialLoading]);

    // Auto-submit initial query once input value is set
    useEffect(() => {
      if (
        initialQuery &&
        inputValue === initialQuery &&
        !isInitialLoading &&
        !hasSubmittedInitialQuery
      ) {
        // sendMessage already handles authentication checks and login modal
        setHasSubmittedInitialQuery(true);
        sendMessage();
      }
    }, [initialQuery, inputValue, isInitialLoading, hasSubmittedInitialQuery]);

    // Handle multiple file uploads
    const handleFilesUpload = useCallback(
      async (files: File[]) => {
        if (files.length === 0) return;

        // Check if authentication is required and user is not authenticated
        if (isAuthRequired()) {
          const token = getAccessToken();
          if (!token) {
            setShowLoginModal(true);
            return;
          }
        }

        // Filter files to only allow CSV files
        const csvFiles = files.filter((file) =>
          file.name.toLowerCase().endsWith(".csv")
        );

        const nonCsvFiles = files.filter(
          (file) => !file.name.toLowerCase().endsWith(".csv")
        );

        // Show error message for non-CSV files
        if (nonCsvFiles.length > 0) {
          toast.error(
            `Unsupported file${
              nonCsvFiles.length > 1 ? "s" : ""
            }: only CSV files are allowed.`
          );

          // If no CSV files, return early
          if (csvFiles.length === 0) {
            return;
          }
        }

        // Create new file previews to add to existing ones (cumulative)
        const baseId = Date.now();
        const newFilePreviews = await Promise.all(
          Array.from(csvFiles).map(async (file, index) => {
            let content = undefined;

            // Read CSV files for preview
            if (file.size < 1024 * 1024) {
              // Only read CSV files under 1MB
              try {
                content = await readCSVFile(file);
              } catch (error) {
                console.warn("Failed to read CSV file:", error);
              }
            }

            return {
              id: baseId + index + Math.random() * 1000, // Ensure unique IDs
              name: file.name,
              size: file.size,
              progress: 0,
              status: "uploading" as const,
              content,
            };
          })
        );

        // Add new files to existing previews (cumulative)
        setUploadingFilesPreviews((prev) => [...prev, ...newFilePreviews]);
        setUploadingFiles(true);

        try {
          const uploadPromises = Array.from(files).map(async (file, index) => {
            const filePreviewId = newFilePreviews[index].id;

            try {
              const formData = new FormData();
              formData.append("file", file);

              if (conversationId) {
                formData.append("conversation_id", conversationId);
              }

              const apiUrl = getBackendServerURL("/files/upload");
              const apiHeaders = await getApiHeaders(false);

              // Simulate progress updates (since we can't get real progress from fetch)
              const progressInterval = setInterval(() => {
                setUploadingFilesPreviews((prev) =>
                  prev.map((f) =>
                    f.id === filePreviewId && f.progress < 90
                      ? {
                          ...f,
                          progress: Math.min(
                            90,
                            f.progress + Math.random() * 20
                          ),
                        }
                      : f
                  )
                );
              }, 200);

              const response = await fetch(apiUrl, {
                method: "POST",
                headers: apiHeaders,
                body: formData,
              });

              clearInterval(progressInterval);

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData?.detail || `HTTP error! status: ${response.status}`
                );
              }

              const result: FileUploadResult = await response.json();

              // Update preview to completed
              setUploadingFilesPreviews((prev) =>
                prev.map((f) =>
                  f.id === filePreviewId
                    ? { ...f, progress: 100, status: "completed" as const }
                    : f
                )
              );

              // Add to pending files
              const uploadedFile: UploadedFile = {
                id: filePreviewId,
                filename: result.filename,
                original_filename: result.original_filename,
                size: result.size,
                path: result.path,
              };

              if (result.conversation_id) {
                setConversationId(result.conversation_id);
              }

              // Add to pending files cumulatively
              setPendingFiles((prev) => [...prev, uploadedFile]);

              return uploadedFile;
            } catch (error) {
              // Mark this file as errored
              const errorMessage =
                error instanceof Error ? error.message : "Upload failed";
              setUploadingFilesPreviews((prev) =>
                prev.map((f) =>
                  f.id === filePreviewId
                    ? { ...f, status: "error" as const, error: errorMessage }
                    : f
                )
              );
              throw error;
            }
          });

          await Promise.allSettled(uploadPromises);

          // Keep completed uploads visible - they'll be cleared when message is sent
          // Don't automatically clear uploading previews
        } catch (error) {
          console.error("Upload error:", error);

          let errorText = "Error: Unable to upload files";
          if (error instanceof Error) {
            errorText = error.message;
            if (errorText === "Failed to fetch") {
              errorText =
                "Server is not responding. Please try again in a few minutes.";
            }
          }

          const errorMessage: Message = {
            id: Date.now(),
            type: "error",
            content: `${errorText}`,
            timestamp: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setUploadingFiles(false);
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      },
      [
        conversationId,
        setConversationId,
        setMessages,
        setPendingFiles,
        setUploadingFiles,
        setUploadingFilesPreviews,
      ]
    );

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    // Drag and drop event handlers
    const handleDragOver = useCallback((e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    }, []);

    const handleDragEnter = useCallback((e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
      async (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer?.files) {
          // Check authentication before processing files
          if (isAuthRequired()) {
            const token = getAccessToken();
            if (!token) {
              setShowLoginModal(true);
              return;
            }
          }

          const files = Array.from(e.dataTransfer.files);
          await handleFilesUpload(files);
        }
      },
      [handleFilesUpload]
    );

    // Set up global drag and drop event listeners
    useEffect(() => {
      // Add event listeners to the document to handle drops anywhere on the page
      document.addEventListener("dragover", handleDragOver);
      document.addEventListener("dragenter", handleDragEnter);
      document.addEventListener("dragleave", handleDragLeave);
      document.addEventListener("drop", handleDrop);

      // Cleanup
      return () => {
        document.removeEventListener("dragover", handleDragOver);
        document.removeEventListener("dragenter", handleDragEnter);
        document.removeEventListener("dragleave", handleDragLeave);
        document.removeEventListener("drop", handleDrop);
      };
    }, [handleDragOver, handleDragEnter, handleDragLeave, handleDrop]);

    const sendMessage = async () => {
      const hasUploadingFiles = uploadingFilesPreviews.some(
        (f) => f.status === "uploading"
      );
      if (!inputValue.trim() || hasUploadingFiles) return;

      // Check if authentication is required and user is not authenticated
      if (isAuthRequired()) {
        const token = getAccessToken();
        if (!token) {
          setShowLoginModal(true);
          return;
        }
      }

      // Create file references for pending files
      const fileReferences = pendingFiles
        .map((file) => `[./${file.original_filename || file.filename}]`)
        .join(" ");

      // Combine input value with file references
      const messageContent = fileReferences
        ? `${inputValue.trim()} ${fileReferences}`
        : inputValue;

      const userMessage: Message = {
        id: Date.now(),
        type: "user",
        content: inputValue.trim(),
        timestamp: new Date().toISOString(),
      };

      // Add user message and any pending file upload events
      const newMessages = [userMessage];

      // Add upload events for pending files
      pendingFiles.forEach((file) => {
        const uploadMessage: Message = {
          id: Date.now() + Math.random(),
          type: "event",
          event: {
            data: {
              output_params: {
                filename: file.filename,
                original_filename: file.original_filename,
                size: file.size,
                path: file.path,
              },
              tool_name: "file_upload",
            },
            event_type: "file_upload",
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
        newMessages.push(uploadMessage);
      });

      setMessages((prev) => [...prev, ...newMessages]);
      setInputValue("");
      setPendingFiles([]); // Clear pending files
      setUploadingFilesPreviews([]); // Clear upload previews when message is sent
      setIsLoading(true);

      // Track user activity for inactivity timer
      onUserMessage?.();

      try {
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();

        const apiUrl = getBackendServerURL("/agent/run");

        const requestBody: RequestBody = {
          query: messageContent,
        };

        // Include conversation_id if we have one (for follow-up messages)
        if (conversationId) {
          requestBody.conversation_id = conversationId;
        }

        if (pendingFiles.length > 0) {
          requestBody.file_names = pendingFiles.map((file) => file.filename);
        }

        const apiHeaders = await getApiHeaders();

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: apiHeaders,
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData?.detail ||
              errorData?.error ||
              `HTTP error! status: ${response.status}`
          );
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        setIsConnected(true);

        // Buffer to collect partial event data
        let eventBuffer = "";
        let isCollectingEvent = false;

        if (!reader) {
          throw new Error("Reader is not available");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);

          // Process the chunk to find and collect events
          let currentPosition = 0;

          while (currentPosition < chunk.length) {
            // Look for event start if not already collecting
            if (!isCollectingEvent) {
              const startTag = "<event>";
              const startPos = chunk.indexOf(startTag, currentPosition);

              if (startPos !== -1) {
                // Found the start of an event
                isCollectingEvent = true;
                currentPosition = startPos + startTag.length;
                eventBuffer = ""; // Reset buffer for new event
              } else {
                // No event start found in this chunk
                break;
              }
            } else {
              // Already collecting an event, look for the end tag
              const endTag = "</event>";
              const endPos = chunk.indexOf(endTag, currentPosition);

              if (endPos !== -1) {
                // Found the end of the event
                eventBuffer += chunk.substring(currentPosition, endPos);
                currentPosition = endPos + endTag.length;
                isCollectingEvent = false;

                // Process the complete event
                let eventData;
                try {
                  eventData = JSON.parse(eventBuffer);
                } catch (e) {
                  console.error(
                    "Error parsing event data:",
                    e,
                    "Data:",
                    eventBuffer
                  );
                  continue;
                }

                // Validate that eventData has the expected structure
                if (eventData && typeof eventData === "object") {
                  // Handle conversation_started event
                  if (
                    eventData.data &&
                    eventData.data.type === "conversation_started" &&
                    eventData.data.payload &&
                    eventData.data.payload.conversation_id
                  ) {
                    setConversationId(eventData.data.payload.conversation_id);
                    continue; // Don't add this as a visible message
                  }

                  // Check for any errors in user_notification or error events
                  if (
                    (eventData.data &&
                      eventData.data.type === "user_notification" &&
                      eventData.data.payload &&
                      eventData.data.payload.error) ||
                    (eventData.data && eventData.data.type === "error")
                  ) {
                    // Set loading to false for any error event
                    setIsLoading(false);
                  }

                  // Check if tool calling is to start
                  if (eventData.data && eventData.event_type === "tool_start") {
                    // Tool started - cancel any pending clear timeout and update current activity
                    if (activityTimeoutRef.current) {
                      clearTimeout(activityTimeoutRef.current);
                      activityTimeoutRef.current = null;
                    }
                    const toolName = eventData.data.tool_name || "";
                    setCurrentActivity(toolName);
                    continue;
                  }

                  // Check if tool call has ended
                  if (eventData.data && eventData.event_type === "tool_end") {
                    // Tool ended - clear current activity after a brief delay
                    // Clear any existing timeout and set a new one
                    if (activityTimeoutRef.current) {
                      clearTimeout(activityTimeoutRef.current);
                    }
                    activityTimeoutRef.current = setTimeout(() => {
                      setCurrentActivity("");
                      activityTimeoutRef.current = null;
                    }, 500);
                  }

                  // Check if conversation is completed
                  if (
                    eventData.data &&
                    (eventData.data.tool_name === "completed_task" ||
                      ["exception", "error"].includes(
                        eventData.data.event_type
                      ))
                  ) {
                    // Conversation completed - refetch credits
                    if (onCreditsRefetch) {
                      // Call the function and handle the promise properly
                      onCreditsRefetch().catch((error) => {
                        console.error("Failed to refetch credits:", error);
                      });
                    }
                  }

                  const message: Message = {
                    id: Date.now() + Math.random(),
                    type: "event",
                    event: eventData,
                    timestamp: new Date().toISOString(),
                  };

                  setMessages((prev) => [...prev, message]);
                } else {
                  console.warn("Received malformed event data:", eventData);
                }
              } else {
                // Event continues beyond this chunk
                eventBuffer += chunk.substring(currentPosition);
                break;
              }
            }
          }
        }
      } catch (error) {
        // Handle aborted requests gracefully
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request was aborted");
          return;
        }

        let errorText: string = "Unable to process request, try again!";

        if (error instanceof Error) {
          errorText = error.message;
          if (errorText === "Failed to fetch") {
            errorText = "Server is not responding, try again later";
          }
        }
        const errorMessage: Message = {
          id: Date.now(),
          type: "error",
          content: `Error: ${errorText}`,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        // Clean up abort controller
        abortControllerRef.current = null;
        setIsLoading(false);
        setIsConnected(false);
        // Note: Don't clear currentActivity here - let tool_end events handle it
      }
    };

    // Trigger file input click
    const handleFileUpload = () => {
      // Check authentication before opening file dialog
      if (isAuthRequired()) {
        const token = getAccessToken();
        if (!token) {
          setShowLoginModal(true);
          return;
        }
      }

      fileInputRef.current?.click();
    };

    // Handle file input change
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFilesUpload(Array.from(files));
      }
    };

    const removePendingFile = (fileId: number) => {
      setPendingFiles((prev) => prev.filter((file) => file.id !== fileId));
    };

    const clearAllFiles = () => {
      // Only clear if no files are currently uploading
      const hasUploadingFiles = uploadingFilesPreviews.some(
        (f) => f.status === "uploading"
      );
      if (!hasUploadingFiles) {
        setPendingFiles([]);
        setUploadingFilesPreviews([]);
      }
    };

    // ...
    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileIcon = (filename: string) => {
      const extension = filename.split(".").pop()?.toLowerCase();
      const iconClass = "w-4 h-4";

      if (!extension) {
        return <File className={`${iconClass} text-gray-500`} />;
      }

      if (
        ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension)
      ) {
        return (
          <Image className={`${iconClass} text-green-500`} aria-hidden="true" />
        );
      }
      if (
        [
          "js",
          "jsx",
          "ts",
          "tsx",
          "py",
          "java",
          "c",
          "cpp",
          "go",
          "rb",
          "php",
          "css",
          "scss",
          "json",
          "xml",
          "html",
          "htm",
        ].includes(extension)
      ) {
        return <Code className={`${iconClass} text-blue-500`} />;
      }
      if (["md", "txt", "doc", "docx", "pdf"].includes(extension)) {
        return <FileText className={`${iconClass} text-orange-500`} />;
      }
      if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
        return <Archive className={`${iconClass} text-purple-500`} />;
      }
      return <File className={`${iconClass} text-gray-500`} />;
    };

    const handleCloseLoginModal = () => {
      setShowLoginModal(false);
    };

    const handleExpandCSV = (filename: string, content: string) => {
      setCSVModalData({ filename, content });
      setShowCSVModal(true);
    };

    const handleCloseCSVModal = () => {
      setShowCSVModal(false);
      setCSVModalData(null);
    };

    const handleRemoveCSV = () => {
      // Clear all files when CSV is removed
      setPendingFiles([]);
      setUploadingFilesPreviews([]);
    };

    return (
      <div
        className="relative transition-all duration-300 w-full bg-gradient-to-br from-slate-50/90 via-white/60 to-slate-100/80 overflow-hidden"
        style={{
          width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
          height: "100vh",
        }}
      >
        {/* Unique Annie Pattern Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle design elements */}
          <div className="absolute top-20 left-[8%] w-0.5 h-8 bg-slate-300/20 rounded-full rotate-12"></div>
          <div className="absolute top-40 right-[12%] w-0.5 h-6 bg-slate-300/25 rounded-full -rotate-12"></div>
          <div className="absolute bottom-32 left-[15%] w-0.5 h-10 bg-slate-300/20 rounded-full rotate-45"></div>
          <div className="absolute bottom-48 right-[20%] w-0.5 h-4 bg-slate-300/30 rounded-full -rotate-45"></div>

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
              radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0)
            `,
              backgroundSize: "40px 40px",
            }}
          ></div>
        </div>
        {/* Messages - full height with top padding for header */}
        <div
          ref={dropZoneRef}
          className={`absolute inset-0 ${
            messages.length === 0 ? "overflow-hidden" : "overflow-y-auto"
          } scrollbar-hide ${
            isDragging
              ? "bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-lg"
              : ""
          }`}
          style={{
            paddingTop: "140px",
            paddingBottom: "140px",
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-xl z-10">
              <div className="text-center p-8 rounded-2xl bg-white/90 shadow-2xl border border-slate-200/50 backdrop-blur-sm">
                <Paperclip className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Drop CSV files here
                </h3>
                <p className="text-sm text-slate-600">
                  Only CSV files are supported
                </p>
              </div>
            </div>
          )}
          <div className="max-w-3xl mx-auto space-y-4 h-full">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-4">
                {/* Clean Welcome */}
                <div className="text-center mb-16">
                  <h3 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                    {(() => {
                      const hour = new Date().getHours();
                      const greeting =
                        hour < 12
                          ? "Morning"
                          : hour < 18
                          ? "Afternoon"
                          : "Evening";
                      return `${greeting} 👋`;
                    })()}
                  </h3>
                  <p className="text-slate-500 text-lg font-light mb-10">
                    What do you want to see?
                  </p>

                  {/* Clean Dashboard Options */}
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                    {[
                      {
                        title: "Sales",
                        prompt:
                          "Show me sales performance this month vs last month with revenue trends and top deals",
                      },
                      {
                        title: "Marketing",
                        prompt:
                          "Create a marketing dashboard showing campaign ROI, ad spend, and conversion rates",
                      },
                      {
                        title: "Team",
                        prompt:
                          "Build a team dashboard tracking productivity, goal completion, and performance metrics",
                      },
                      {
                        title: "Finance",
                        prompt:
                          "Show me financial overview with cash flow, monthly expenses, and profit margins",
                      },
                      {
                        title: "Customers",
                        prompt:
                          "Create customer analytics showing acquisition trends, retention rates, and lifetime value",
                      },
                    ].map((item, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="dashboard"
                        onClick={() => setInputValue(item.prompt)}
                      >
                        {item.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message: Message) => (
              <div key={message.id} className="animate-slide-up">
                {(message.type === "user" || message.type === "error") && (
                  <MessageCard message={message} />
                )}

                {message.type === "event" && (
                  <EventList
                    message={message}
                    conversationId={conversationId}
                    onPreviewClick={onPreviewClick}
                    onFileClick={onFileClick}
                    openUpgradeModal={showUpgradeModal}
                  />
                )}
              </div>
            ))}

            {(() => {
              // Only show "Annie is thinking..." when actively processing AND the last message
              // wasn't from the assistant. This prevents showing the thinking indicator
              // immediately after Annie has just responded or completed a task.
              //
              // Assistant messages are identified by:
              // - user_send_message: When Annie sends a response to the user
              // - completed_task: When Annie indicates a task has been completed
              const lastMessage = messages[messages.length - 1];
              const isLastMessageFromAssistant =
                lastMessage?.type === "event" &&
                (lastMessage.event?.data?.tool_name === "user_send_message" ||
                  lastMessage.event?.event_type === "user_send_message" ||
                  lastMessage.event?.data?.tool_name === "completed_task" ||
                  lastMessage.event?.event_type === "completed_task");

              return (isLoading || uploadingFiles) &&
                !isLastMessageFromAssistant ? (
                <div className="flex justify-start mb-4">
                  <div className="flex items-center space-x-2 px-4 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></div>
                    <AnimatedText
                      text={
                        currentActivity
                          ? formatAgentMessage(currentActivity)
                          : "Annie is thinking"
                      }
                      className="text-sm text-slate-600"
                    />
                  </div>
                </div>
              ) : null;
            })()}

            <div ref={messagesEndRef} className="h-20 sm:h-32" />
          </div>
        </div>

        {/* Input - positioned absolutely at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 sm:p-8 p-3"
          style={{
            width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
          }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/98 backdrop-blur-3xl border border-slate-200/40 rounded-[2rem] sm:p-5 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/2 relative overflow-hidden transition-all duration-500 hover:shadow-[0_25px_50px_rgba(0,0,0,0.12)]">
              {/* Subtle activity indicator */}
              {(isLoading || uploadingFiles) && (
                <div className="absolute top-0 left-0 right-0 h-0.5">
                  <div className="h-full bg-gradient-to-r from-blue-400/30 via-indigo-400/30 to-blue-500/30 animate-pulse"></div>
                </div>
              )}
              {/* Files Display - Show all files (uploading, completed, and attached) */}
              {(uploadingFilesPreviews.length > 0 ||
                pendingFiles.length > 0) && (
                <div className="mb-4">
                  {(() => {
                    // Check if we should show CSV preview
                    const allFiles = [
                      ...uploadingFilesPreviews,
                      ...pendingFiles.filter(
                        (pf) =>
                          !uploadingFilesPreviews.some(
                            (upf) => upf.id === pf.id
                          )
                      ),
                    ];

                    // Show CSV preview if there's exactly one file and it's a CSV with content
                    const firstFile = allFiles[0];
                    const fileName =
                      "name" in firstFile ? firstFile.name : firstFile.filename;
                    const shouldShowCSVPreview =
                      allFiles.length === 1 &&
                      fileName.toLowerCase().endsWith(".csv") &&
                      (uploadingFilesPreviews[0]?.content ||
                        !("status" in firstFile) ||
                        firstFile.status !== "uploading");

                    if (shouldShowCSVPreview) {
                      const csvFile = allFiles[0];
                      const csvFileName =
                        "name" in csvFile ? csvFile.name : csvFile.filename;
                      const csvStatus =
                        "status" in csvFile ? csvFile.status : undefined;
                      const csvContent =
                        uploadingFilesPreviews[0]?.content || "";
                      return (
                        <div className="space-y-3">
                          <CSVPreview
                            filename={csvFileName}
                            content={csvContent}
                            onExpand={() =>
                              handleExpandCSV(csvFileName, csvContent)
                            }
                            onRemove={handleRemoveCSV}
                          />
                          {csvStatus === "uploading" && (
                            <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Uploading...</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Default file list display
                    return (
                      <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700 flex items-center">
                            <Paperclip className="w-4 h-4 mr-2" />
                            {allFiles.length} attachment
                            {allFiles.length !== 1 ? "s" : ""}
                            {uploadingFilesPreviews.some(
                              (f) => f.status === "uploading"
                            ) && (
                              <span className="ml-2 text-slate-600">
                                <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                              </span>
                            )}
                          </span>
                          <button
                            onClick={clearAllFiles}
                            className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center font-medium"
                            disabled={uploadingFilesPreviews.some(
                              (f) => f.status === "uploading"
                            )}
                            title={
                              uploadingFilesPreviews.some(
                                (f) => f.status === "uploading"
                              )
                                ? "Wait for uploads to complete"
                                : "Clear all files"
                            }
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {/* Show uploading/completed files from preview */}
                          {uploadingFilesPreviews.map((file) => {
                            return (
                              <div
                                key={`preview-${file.id}`}
                                className="relative group flex items-center space-x-2 bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-xl px-3 py-2 text-sm transition-all duration-200 overflow-hidden hover:bg-white hover:shadow-md"
                              >
                                {/* Progress background for uploading files */}
                                {file.status === "uploading" && (
                                  <div
                                    className="absolute inset-0 bg-slate-100/40 transition-all duration-300"
                                    style={{ width: `${file.progress}%` }}
                                  />
                                )}
                                {/* Completed background */}
                                {file.status === "completed" && (
                                  <div className="absolute inset-0 bg-slate-50/60" />
                                )}

                                <div className="relative z-10 flex items-center space-x-2">
                                  {file.status === "uploading" && (
                                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                                  )}
                                  {file.status === "completed" && (
                                    <CheckCircle2 className="w-4 h-4 text-slate-600" />
                                  )}
                                  {file.status === "error" && (
                                    <AlertCircle className="w-4 h-4 text-slate-500" />
                                  )}

                                  <div className="flex flex-col min-w-0">
                                    <span className="text-slate-800 font-semibold truncate max-w-[140px]">
                                      {file.name}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-slate-500 text-xs">
                                        {formatFileSize(file.size)}
                                      </span>
                                      {file.status === "uploading" && (
                                        <span className="text-slate-600 text-xs font-medium">
                                          {Math.round(file.progress)}%
                                        </span>
                                      )}
                                      {file.status === "completed" && (
                                        <span className="text-slate-600 text-xs font-medium">
                                          Ready
                                        </span>
                                      )}
                                      {file.status === "error" && (
                                        <span
                                          className="text-slate-500 text-xs font-medium"
                                          title={file.error}
                                        >
                                          Failed
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Only show remove button if not uploading */}
                                  {file.status !== "uploading" && (
                                    <button
                                      onClick={() => {
                                        // Remove from upload previews
                                        setUploadingFilesPreviews((prev) =>
                                          prev.filter((f) => f.id !== file.id)
                                        );
                                        // Also remove from pending files if it exists there
                                        setPendingFiles((prev) =>
                                          prev.filter((f) => f.id !== file.id)
                                        );
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-all duration-200 p-1 rounded-lg hover:bg-slate-100"
                                      title="Remove"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Show pending files that are not in upload previews */}
                          {pendingFiles
                            .filter(
                              (pf) =>
                                !uploadingFilesPreviews.some(
                                  (upf) => upf.id === pf.id
                                )
                            )
                            .map((file) => (
                              <div
                                key={`pending-${file.id}`}
                                className="group flex items-center space-x-2 bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-xl px-3 py-2 text-sm hover:bg-white transition-all duration-200 hover:shadow-md"
                              >
                                {getFileIcon(file.filename)}
                                <div className="flex flex-col min-w-0">
                                  <span className="text-slate-800 font-semibold truncate max-w-[140px]">
                                    {file.filename}
                                  </span>
                                  <span className="text-slate-500 text-xs">
                                    {formatFileSize(file.size)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => removePendingFile(file.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-all duration-200 p-1 rounded-lg hover:bg-slate-100"
                                  title="Remove"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex items-center sm:space-x-5 space-x-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".csv"
                />

                {/* Upload button */}
                <button
                  onClick={handleFileUpload}
                  disabled={uploadingFiles || isInitialLoading}
                  className="sm:p-3.5 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-2xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden cursor-pointer"
                  title={uploadingFiles ? "Uploading..." : "Upload CSV files"}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                  <Paperclip className="w-5 h-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10" />
                </button>

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      // Auto-resize after value update
                      window.requestAnimationFrame(resizeTextarea);
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        inputValue.trim()
                      ) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={
                      isInitialLoading
                        ? "Annie is waking up..."
                        : uploadingFilesPreviews.some(
                            (f) => f.status === "uploading"
                          )
                        ? "Uploading files..."
                        : "How can I help you?"
                    }
                    className={`w-full bg-transparent text-slate-900 placeholder-slate-500/70 resize-none border-none outline-none text-base leading-relaxed font-medium py-1 selection:bg-blue-100/50 transition-colors duration-200 ${
                      isLoading || isInitialLoading
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                    rows={1}
                    disabled={
                      isLoading ||
                      isInitialLoading ||
                      uploadingFilesPreviews.some(
                        (f) => f.status === "uploading"
                      )
                    }
                    style={{ minHeight: "32px", maxHeight: "120px" }}
                    autoFocus
                    spellCheck
                    autoComplete="off"
                  />
                </div>

                {/* Send/Stop button */}
                {isLoading ? (
                  <Button
                    onClick={stopCurrentStream}
                    variant="stop"
                    size="send"
                    title="Stop conversation"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-700/10 to-slate-800/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Square className="w-4 h-4 relative z-10" />
                  </Button>
                ) : (
                  <Button
                    onClick={sendMessage}
                    disabled={
                      !inputValue.trim() ||
                      isInitialLoading ||
                      uploadingFilesPreviews.some(
                        (f) => f.status === "uploading"
                      )
                    }
                    variant="send"
                    size="send"
                    title={
                      uploadingFilesPreviews.some(
                        (f) => f.status === "uploading"
                      )
                        ? "Wait for files to finish uploading"
                        : "Send message"
                    }
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-700/10 to-slate-800/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-300 relative z-10" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Login Modal */}
        <LoginModal isOpen={showLoginModal} onClose={handleCloseLoginModal} />

        {/* CSV Modal */}
        {csvModalData && (
          <CSVModal
            isOpen={showCSVModal}
            onClose={handleCloseCSVModal}
            filename={csvModalData.filename}
            content={csvModalData.content}
          />
        )}
      </div>
    );
  }
);

ChatBox.displayName = "ChatBox";

export default ChatBox;
