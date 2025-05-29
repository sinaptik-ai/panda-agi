import React, { useState, useRef, useEffect } from "react";
import { Send, Plus, Paperclip } from "lucide-react";
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePreviewClick = (data) => {
    setPreviewData(data);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setPreviewData(null);
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
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
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
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
          className="flex-1 overflow-y-auto scrollbar-hide"
          style={{
            paddingTop: "100px",
            paddingBottom: "140px",
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}
        >
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
                  />
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-2 px-3 py-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs text-gray-500">
                    Panda is thinking
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
              <div className="flex items-center space-x-3">
                {/* Upload button */}
                <button
                  className="p-2 text-gray-900 hover:text-gray-300 hover:bg-white/10 rounded-xl transition-all duration-200"
                  title="Upload file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
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
