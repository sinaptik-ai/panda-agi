import React, { useState, useRef, useEffect } from "react";
import { Send, Bot } from "lucide-react";
import EventCard from "./components/EventCard";
import MessageCard from "./components/MessageCard";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: inputValue,
        }),
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                PandaAGI Assistant
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
          <div className="text-sm text-gray-500">
            {messages.filter((m) => m.type === "event").length} events
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to PandaAGI
              </h3>
              <p className="text-gray-500">
                Start a conversation to see real-time agent events
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="animate-slide-up">
              {(message.type === "user" || message.type === "error") && (
                <MessageCard message={message} />
              )}

              {message.type === "event" && <EventCard message={message} />}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="event-card max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">
                    Agent is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask the agent anything..."
                className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="1"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-2 p-2 text-blue-500 hover:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
