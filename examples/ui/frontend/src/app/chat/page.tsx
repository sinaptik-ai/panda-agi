"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Plus,
  Paperclip,
  X,
  FileText,
  Image,
  File,
  Code,
  Archive,
  FileCode,
  LogOut,
  Crown,
} from "lucide-react";
import EventList from "@/components/event-list";
import MessageCard from "@/components/message-card";
import ContentSidebar, { PreviewData } from "@/components/content-sidebar";
import { Message } from "@/lib/types/event-message";
import { UploadedFile, FileUploadResult } from "@/lib/types/file";

import { getBackendServerURL } from "@/lib/server";
import { getApiHeaders } from "@/lib/api/common";
import { getAccessToken, isAuthRequired, logout } from "@/lib/api/auth";
import { GridView } from "@/components/ui/grid-view";
import { formatAgentMessage } from "@/lib/utils";
import { getFileType } from "@/lib/utils";
import UpgradeModal from "@/components/upgrade-modal";
import { useSearchParams } from "next/navigation";
import { PLATFORM_MODE } from "@/lib/config";

interface RequestBody {
  query: string;
  conversation_id?: string;
}

function App() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentMessage, setAgentMessage] = useState<string>("Panda is thinking...");
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(900); // Default sidebar width (match initial in ContentSidebar)
  const [previewData, setPreviewData] = useState<PreviewData>();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Handle URL parameters for upgrade modal
  useEffect(() => {
    const upgradeParam = searchParams.get('upgrade');
    if (upgradeParam === 'open') {
      setShowUpgradeModal(true);
    }
  }, [searchParams]);

  // Handle multiple file uploads
  const handleFilesUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setUploadingFiles(true);
      setAgentMessage(formatAgentMessage("file_upload"));

      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);

          if (conversationId) {
            formData.append("conversation_id", conversationId);
          }

          const apiUrl = getBackendServerURL("/files/upload");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const apiHeaders: any = await getApiHeaders(false);

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: apiHeaders,
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
          }

          const result: FileUploadResult = await response.json();
          // Add file to pending files instead of immediately showing as event
          const uploadedFile: UploadedFile = {
            id: Date.now() + Math.random(),
            filename: result.filename,
            original_filename: result.original_filename,
            size: result.size,
            path: result.path,
          };
          
          if (result.conversation_id) {
            setConversationId(result.conversation_id);
          }

          setPendingFiles((prev) => [...prev, uploadedFile]);
        }
      } catch (error) {
        console.error("Upload error:", error);

        let errorText = "Error: Unable to upload file";

        if (error instanceof Error) {
          errorText = error.message;
          if (errorText === "Failed to fetch") {
            errorText = "Server is not responding. Please try again in a few minutes.";
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
    [conversationId, setMessages, setPendingFiles, setUploadingFiles]
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Drag and drop handlers
  useEffect(() => {
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Only set isDragging to false if we're leaving the drop zone
      // and not entering a child element
      if (e.currentTarget === dropZoneRef.current) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        await handleFilesUpload(droppedFiles);
      }
    };

    // Add event listeners to the drop zone
    const dropZone = dropZoneRef.current;
    if (dropZone) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dropZone.addEventListener("dragover", handleDragOver as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dropZone.addEventListener("dragenter", handleDragEnter as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dropZone.addEventListener("dragleave", handleDragLeave as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dropZone.addEventListener("drop", handleDrop as any);
    }

    // Cleanup
    return () => {
      if (dropZone) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dropZone.removeEventListener("dragover", handleDragOver as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dropZone.removeEventListener("dragenter", handleDragEnter as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dropZone.removeEventListener("dragleave", handleDragLeave as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dropZone.removeEventListener("drop", handleDrop as any);
      }
    };
  }, [handleFilesUpload]);

  const handlePreviewClick = (data: PreviewData) => {
    setPreviewData(data);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setPreviewData(undefined);
  };


  // Function to open file in sidebar - content fetching is handled by ContentSidebar
  const handleFileClick = (filename: string) => {
    const fileType = getFileType(filename);

    setPreviewData({
      filename: filename,
      title: `File: ${filename.split("/").pop()}`,
      type: fileType,
    });
    setSidebarOpen(true);
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

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
    setIsLoading(true);

    try {
      const apiUrl = getBackendServerURL("/agent/run");
      
      const requestBody: RequestBody = {
        query: messageContent,
      };

      // Include conversation_id if we have one (for follow-up messages)
      if (conversationId) {
        requestBody.conversation_id = conversationId;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiHeaders: any = await getApiHeaders();

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.detail || errorData?.error || `HTTP error! status: ${response.status}`);
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
              try {
                const eventData = JSON.parse(eventBuffer);

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
                    setAgentMessage(formatAgentMessage(eventData.data.tool_name));
                    continue;
                  }

                  // Check if tool call has ended
                  if (eventData.data && eventData.event_type === "tool_end") {
                    setAgentMessage("Panda is thinking...");
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
              } catch (e) {
                console.error("Error parsing event data:", e, "Data:", eventBuffer);
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
      let errorText: string = "Unable to process request, try again!"
      
      if (error instanceof Error) {
        errorText = error.message
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
      setIsLoading(false);
      setIsConnected(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setSidebarOpen(false);
    setPreviewData(undefined);
  };

  // Trigger file input click
  const handleFileUpload = () => {
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
      return <Image className={`${iconClass} text-green-500`} />;
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

  // Authentication check - placed after all hooks to follow Rules of Hooks
  useEffect(() => {
    // Check if authentication is required
    if (isAuthRequired()) {
      // Check if user is authenticated
      const token = getAccessToken();
      
      if (!token) {
        // User is not authenticated, redirect to login
        router.push("/login");
        return;
      }
    }
    
    // User is authenticated or auth is not required
    setIsAuthenticating(false);
  }, [router]);

  // Listen for messages from iframe content to open URLs in sidebar
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_IN_SIDEBAR') {
        const { url, title } = event.data;
        setPreviewData({
          url: url,
          content: "",
          title: title || `External: ${url}`,
          type: "iframe",
        });
        setSidebarOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Don't render the chat if still checking authentication
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 relative mb-4 mx-auto">
            <span className="text-4xl select-none absolute inset-0 flex items-center justify-center">
              🐼
            </span>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Checking authentication status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Main content */}
      <div
        className="flex flex-col transition-all duration-300 w-full"
        style={{
          width: sidebarOpen ? `calc(100% - ${sidebarWidth}px)` : "100%",
        }}
      >
        {/* Header - positioned absolutely over content */}
        <div
          className="glass-header p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-xl bg-white/80"
          style={{
            width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
          }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-2xl select-none">🐼</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  PandaAGI
                </h1>
                <p className="text-sm text-gray-500">
                  {isConnected ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    "Ready to help"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* New Conversation Button */}
              {messages.length > 0 && (
                <button
                  onClick={startNewConversation}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </button>
              )}

              {/* Upgrade Button */}
              { PLATFORM_MODE && <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  title="Upgrade Subscription"
                >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade</span>
                </button>
               }

              {/* Logout Button - only show if authentication is required */}
              {isAuthRequired() && (
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages - full height with top padding for header */}
        <div
          ref={dropZoneRef}
          className={`flex-1 overflow-y-auto scrollbar-hide ${
            isDragging
              ? "bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-lg"
              : ""
          }`}
          style={{
            paddingTop: "100px",
            paddingBottom: "140px",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            position: "relative",
          }}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-50/70 backdrop-blur-sm z-10">
              <div className="text-center p-6 rounded-xl bg-white/80 shadow-lg border border-blue-200">
                <Paperclip className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Drop files here
                </h3>
                <p className="text-sm text-gray-500">Release to upload</p>
              </div>
            </div>
          )}
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-6 transition-transform duration-300 hover:scale-110 animate-bounce">
                  🐼
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Welcome to PandaAGI
                </h3>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                  I can help you with coding, research, and much more. What
                  would you like to work on today?
                </p>

                {/* Suggestion cards with example prompts */}
                <GridView
                  items={[
                    {
                      icon: <FileText className="w-5 h-5 mr-2" />,
                      title: "Data Analysis",
                      description:
                        "Analyze this CSV data and create a visualization of the monthly sales trends",
                      onClick: () =>
                        setInputValue(
                          "Analyze this CSV data and create a visualization of the monthly sales trends"
                        ),
                      titleClassName: "font-medium text-blue-600 mb-2 flex items-center",
                    },
                    {
                      icon: <Code className="w-5 h-5 mr-2" />,
                      title: "Landing Page",
                      description:
                        "Help me generate a modern landing page for my SaaS product that focuses on AI workflow automation",
                      onClick: () =>
                        setInputValue(
                          "Help me generate a modern landing page for my SaaS product that focuses on AI workflow automation"
                        ),
                      titleClassName: "font-medium text-green-600 mb-2 flex items-center",
                    },
                    {
                      icon: <FileCode className="w-5 h-5 mr-2" />,
                      title: "Research Reports",
                      description:
                        "Create a comprehensive report on the latest trends in renewable energy based on online research",
                      onClick: () =>
                        setInputValue(
                          "Create a comprehensive report on the latest trends in renewable energy based on online research"
                        ),
                      titleClassName: "font-medium text-orange-600 mb-2 flex items-center",
                    },
                    {
                      icon: <Image className="w-5 h-5 mr-2" />,
                      title: "Dashboard Design",
                      description:
                        "Build a dashboard that visualizes market data for my product's performance across different regions",
                      onClick: () =>
                        setInputValue(
                          "Build a dashboard that visualizes market data for my product's performance across different regions"
                        ),
                      titleClassName: "font-medium text-purple-600 mb-2 flex items-center",
                    },
                  ]}
                />
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
                    onPreviewClick={handlePreviewClick}
                    onFileClick={handleFileClick}
                    openUpgradeModal={() => setShowUpgradeModal(true)}
                  />
                )}
              </div>
            ))}

            {(isLoading || uploadingFiles) && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2 px-3 py-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {agentMessage}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - positioned absolutely at bottom */}
        <div
          className="p-4 fixed bottom-0 left-0 right-0"
          style={{
            width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
          }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-2xl border border-white/30 rounded-2xl p-3 shadow-2xl">
              {/* Pending Files Display - Integrated inside input container */}
              {pendingFiles.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50/50 rounded-xl border border-gray-200/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 flex items-center">
                      <Paperclip className="w-3 h-3 mr-1" />
                      {pendingFiles.length} attachment
                      {pendingFiles.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => setPendingFiles([])}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingFiles.map((file) => (
                      <div
                        key={file.id}
                        className="group flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg px-2.5 py-1.5 text-xs hover:bg-white transition-all duration-200 hover:shadow-sm"
                      >
                        {getFileIcon(file.filename)}
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-800 font-medium truncate max-w-[120px]">
                            {file.filename}
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          onClick={() => removePendingFile(file.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all duration-200 p-0.5"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="*/*"
                />

                {/* Upload button */}
                <button
                  onClick={handleFileUpload}
                  disabled={uploadingFiles}
                  className="p-2 text-gray-900 hover:text-gray-600 hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={uploadingFiles ? "Uploading..." : "Upload files"}
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      // Trigger resize on next frame to ensure content is updated
                      setTimeout(resizeTextarea, 0);
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask the panda anything..."
                    className="w-full bg-transparent text-gray-900 placeholder-gray-500 resize-none border-none outline-none text-md leading-relaxed"
                    rows={1}
                    disabled={isLoading}
                    style={{ minHeight: "24px", maxHeight: "120px" }}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <ContentSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        previewData={previewData}
        conversationId={conversationId}
        width={sidebarWidth}
        onResize={setSidebarWidth}
      />

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}

export default App;