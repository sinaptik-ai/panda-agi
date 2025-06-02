import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import EventCard from "./components/EventCard";
import MessageCard from "./components/MessageCard";
import ContentSidebar from "./components/ContentSidebar";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const textareaRef = useRef(null);

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

  // Handle multiple file uploads
  const handleFilesUpload = useCallback(
    async (files) => {
      if (files.length === 0) return;

      setUploadingFiles(true);

      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);

          if (conversationId) {
            formData.append("conversation_id", conversationId);
          }

          const response = await fetch(
            `${
              process.env.REACT_APP_API_URL || "http://localhost:8001"
            }/files/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          // Add file to pending files instead of immediately showing as event
          const uploadedFile = {
            id: Date.now() + Math.random(),
            filename: result.filename,
            original_filename: result.original_filename,
            size: result.size,
            path: result.path,
          };

          setPendingFiles((prev) => [...prev, uploadedFile]);
        }
      } catch (error) {
        console.error("Upload error:", error);
        // Show error notification
        const errorMessage = {
          id: Date.now() + Math.random(),
          type: "message",
          role: "system",
          content: `Error uploading file: ${error.message}`,
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
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Only set isDragging to false if we're leaving the drop zone
      // and not entering a child element
      if (e.currentTarget === dropZoneRef.current) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e) => {
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
      dropZone.addEventListener("dragover", handleDragOver);
      dropZone.addEventListener("dragenter", handleDragEnter);
      dropZone.addEventListener("dragleave", handleDragLeave);
      dropZone.addEventListener("drop", handleDrop);
    }

    // Cleanup
    return () => {
      if (dropZone) {
        dropZone.removeEventListener("dragover", handleDragOver);
        dropZone.removeEventListener("dragenter", handleDragEnter);
        dropZone.removeEventListener("dragleave", handleDragLeave);
        dropZone.removeEventListener("drop", handleDrop);
      }
    };
  }, [handleFilesUpload]);

  const handlePreviewClick = (data) => {
    setPreviewData(data);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setPreviewData(null);
  };

  // Helper function to determine file type based on extension
  const getFileType = (filename) => {
    if (!filename) return "text";
    const extension = filename.split(".").pop().toLowerCase();

    if (["csv", "xls", "xlsx"].includes(extension)) return "table";
    if (["md", "markdown"].includes(extension)) return "markdown";
    if (["html", "htm"].includes(extension)) return "html";
    if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension))
      return "image";
    if (extension === "pdf") return "pdf";
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
        "yaml",
        "yml",
      ].includes(extension)
    )
      return "code";
    return "text";
  };

  // Function to fetch and open file in sidebar
  const handleFileClick = async (filename) => {
    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:8001"
        }/files/read?file_path=${encodeURIComponent(filename)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }

      const fileData = await response.json();

      if (fileData.status === "success") {
        const fileType = fileData.type || getFileType(filename);

        setPreviewData({
          url: filename,
          content: fileData.content,
          title: `File: ${fileData.filename}`,
          type: fileType,
        });
        setSidebarOpen(true);
      } else {
        console.error("Failed to read file:", fileData.message);
        // Could show a toast notification here
      }
    } catch (error) {
      console.error("Error reading file:", error);
      // Could show a toast notification here
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    // Add user message and any pending file upload events
    const newMessages = [userMessage];

    // Add upload events for pending files
    pendingFiles.forEach((file) => {
      const uploadMessage = {
        id: Date.now() + Math.random(),
        type: "event",
        event: {
          data: {
            type: "file_upload",
            payload: {
              filename: file.filename,
              original_filename: file.original_filename,
              size: file.size,
              path: file.path,
            },
            timestamp: new Date().toISOString(),
          },
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
      const apiUrl =
        process.env.NODE_ENV === "production"
          ? "/api/agent/run"
          : "http://localhost:8001/agent/run";

      const requestBody = {
        query: inputValue,
      };

      // Include conversation_id if we have one (for follow-up messages)
      if (conversationId) {
        requestBody.conversation_id = conversationId;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setIsConnected(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6));

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

                // Check for token/credit errors in user_notification events
                if (
                  eventData.data &&
                  eventData.data.type === "user_notification" &&
                  eventData.data.payload &&
                  eventData.data.payload.error &&
                  (eventData.data.payload.error.includes("token") ||
                    eventData.data.payload.error.includes("credit"))
                ) {
                  // Add visual indicator to show this is an important error
                  setIsLoading(false);
                }

                const eventMessage = {
                  id: Date.now() + Math.random(),
                  type: "event",
                  event: eventData,
                  timestamp: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, eventMessage]);
              } else {
                console.warn("Received malformed event data:", eventData);
              }
            } catch (e) {
              console.error("Error parsing event data:", e, "Line:", line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        id: Date.now(),
        type: "error",
        content: `Connection error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsConnected(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setSidebarOpen(false);
    setPreviewData(null);
  };

  // Trigger file input click
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      handleFilesUpload(files);
    }
  };

  const removePendingFile = (fileId) => {
    setPendingFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  // ...
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    const iconClass = "w-4 h-4";

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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Main content */}
      <div
        className={`flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-[calc(100%-24rem)]" : "w-full"
        }`}
      >
        {/* Header - positioned absolutely over content */}
        <div
          className="glass-header p-4 fixed top-0 left-0 right-0 z-10"
          style={{ width: sidebarOpen ? "calc(100vw - 24rem)" : "100vw" }}
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
              <div className="text-center py-12">
                <div className="text-6xl mb-4 transition-transform duration-300 hover:scale-110 animate-bounce">
                  🐼
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to PandaAGI
                </h3>
                <p className="text-gray-500">
                  Ask me anything, I'm here to help!
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="animate-slide-up">
                {(message.type === "user" || message.type === "error") && (
                  <MessageCard message={message} />
                )}

                {message.type === "event" && (
                  <EventCard
                    message={message}
                    onPreviewClick={handlePreviewClick}
                    onFileClick={handleFileClick}
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
                    {uploadingFiles
                      ? "Uploading files..."
                      : "Panda is thinking"}
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
          style={{ width: sidebarOpen ? "calc(100vw - 24rem)" : "100vw" }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/70 backdrop-blur-xl border border-black/20 rounded-2xl p-3 shadow-2xl">
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
                    rows="1"
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
      />
    </div>
  );
}

export default App;
