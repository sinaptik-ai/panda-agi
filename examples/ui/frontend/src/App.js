import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Bot,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  FileText,
  MessageSquare,
} from "lucide-react";
import "./App.css";

// Reusable markdown renderer component
const MarkdownRenderer = ({ children, className = "" }) => (
  <div
    className={`text-sm text-gray-600 bg-gray-50 p-3 rounded prose prose-sm prose-gray max-w-none ${className}`}
  >
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mb-1">{children}</h3>
        ),
        code: ({ children }) => (
          <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-gray-200 p-2 rounded text-xs overflow-x-auto">
            {children}
          </pre>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2">{children}</ol>
        ),
        li: ({ children }) => <li className="mb-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);

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

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "connection_success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "tool_result":
        return <Activity className="w-4 h-4 text-blue-500" />;
      case "agent_request":
        return <Bot className="w-4 h-4 text-purple-500" />;
      case "web_search":
        return <Globe className="w-4 h-4 text-orange-500" />;
      case "web_visit_page":
        return <Globe className="w-4 h-4 text-orange-600" />;
      case "file_write":
        return <FileText className="w-4 h-4 text-green-600" />;
      case "user_send_message":
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "shell_exec_command":
        return <Activity className="w-4 h-4 text-purple-600" />;
      case "completion":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "unknown":
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case "connection_success":
        return "bg-green-50 border-green-200";
      case "tool_result":
        return "bg-blue-50 border-blue-200";
      case "agent_request":
        return "bg-purple-50 border-purple-200";
      case "web_search":
        return "bg-orange-50 border-orange-200";
      case "web_visit_page":
        return "bg-orange-50 border-orange-300";
      case "file_write":
        return "bg-green-50 border-green-300";
      case "user_send_message":
        return "bg-indigo-50 border-indigo-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "shell_exec_command":
        return "bg-purple-50 border-purple-300";
      case "completion":
        return "bg-green-50 border-green-400";
      case "unknown":
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getBadgeColor = (eventSource) => {
    switch (eventSource) {
      case "input":
        return "bg-blue-100 text-blue-800";
      case "output":
        return "bg-green-100 text-green-800";
      case "client":
        return "bg-blue-100 text-blue-800";
      case "agent":
        return "bg-purple-100 text-purple-800";
      case "unknown":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderEventPayload = (payload, eventType) => {
    if (!payload) return null;

    switch (eventType) {
      case "agent_request":
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Query:</p>
            <div className="mt-1">
              <MarkdownRenderer>{payload.query}</MarkdownRenderer>
            </div>
          </div>
        );

      case "web_search":
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Search Query:</p>
            <div className="mt-1">
              <MarkdownRenderer>{payload.query}</MarkdownRenderer>
            </div>
          </div>
        );

      case "tool_result":
        if (Array.isArray(payload)) {
          return (
            <div className="mt-2">
              <p className="text-sm text-gray-700 font-medium">
                Search Results:
              </p>
              <div className="mt-1 space-y-1">
                {payload.slice(0, 3).map((result, index) => (
                  <div
                    key={index}
                    className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
                  >
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {result.title}
                    </a>
                  </div>
                ))}
                {payload.length > 3 && (
                  <p className="text-xs text-gray-500">
                    ... and {payload.length - 3} more results
                  </p>
                )}
              </div>
            </div>
          );
        }

        if (payload.message) {
          return (
            <div className="mt-2">
              <MarkdownRenderer>{payload.message}</MarkdownRenderer>
            </div>
          );
        }

        if (payload.file_system) {
          return (
            <div className="mt-2">
              <p className="text-sm text-gray-700 font-medium">File System:</p>
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                <p>
                  <strong>Status:</strong> {payload.file_system.status}
                </p>
                {payload.file_system.directory && (
                  <p>
                    <strong>Directory:</strong> {payload.file_system.directory}
                  </p>
                )}
                {payload.file_system.structure && (
                  <div className="mt-1">
                    <strong>Structure:</strong>
                    <pre className="text-xs mt-1 overflow-x-auto">
                      {JSON.stringify(payload.file_system.structure, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (payload.status) {
          return (
            <div className="mt-2">
              <span
                className={`event-badge ${
                  payload.status === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {payload.status}
              </span>
              {payload.message && (
                <div className="mt-1">
                  <MarkdownRenderer>{payload.message}</MarkdownRenderer>
                </div>
              )}
            </div>
          );
        }

        // Handle generic object payloads
        if (typeof payload === "object" && payload !== null) {
          return (
            <div className="mt-2">
              <p className="text-sm text-gray-700 font-medium">Details:</p>
              <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          );
        }
        break;

      case "file_write":
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">File:</p>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1 font-mono">
              {payload.file}
            </p>
          </div>
        );

      case "user_send_message":
        return (
          <div className="mt-2">
            <MarkdownRenderer>{payload.text}</MarkdownRenderer>
          </div>
        );

      case "shell_exec_command":
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Command:</p>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1 font-mono">
              {payload.command}
            </p>
            {payload.exec_dir && (
              <div className="mt-1">
                <p className="text-sm text-gray-700 font-medium">Directory:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1 font-mono">
                  {payload.exec_dir}
                </p>
              </div>
            )}
          </div>
        );

      default:
        if (typeof payload === "string") {
          return (
            <div className="mt-2">
              <MarkdownRenderer>{payload}</MarkdownRenderer>
            </div>
          );
        }
        break;
    }

    return null;
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
      const response = await fetch("http://localhost:8001/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: inputValue,
          timeout: null,
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
                Panda AGI Assistant
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
                Welcome to Panda AGI
              </h3>
              <p className="text-gray-500">
                Start a conversation to see real-time agent events
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="animate-slide-up">
              {message.type === "user" && (
                <div className="flex justify-end">
                  <div className="chat-message bg-blue-500 text-white max-w-xs lg:max-w-md">
                    <div className="flex items-start space-x-2">
                      <User className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-blue-100 mt-1">
                          {formatTimestamp(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {message.type === "event" &&
                message.event &&
                message.event.data && (
                  <div className="flex justify-start">
                    <div
                      className={`event-card max-w-2xl ${getEventColor(
                        message.event.data.type || "unknown"
                      )}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getEventIcon(message.event.data.type || "unknown")}
                          <span className="font-medium text-sm text-gray-900">
                            {(message.event.data.type || "unknown")
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                          <span
                            className={`event-badge ${getBadgeColor(
                              message.event.event_source || "unknown"
                            )}`}
                          >
                            {message.event.event_source || "unknown"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(
                            message.event.data.timestamp || message.timestamp
                          )}
                        </span>
                      </div>

                      {message.event.data.id && (
                        <p className="text-xs text-gray-400 font-mono mb-2">
                          ID: {message.event.data.id}
                        </p>
                      )}

                      {renderEventPayload(
                        message.event.data.payload,
                        message.event.data.type || "unknown"
                      )}

                      {message.event.data.status && (
                        <div className="mt-2">
                          <span
                            className={`event-badge ${
                              message.event.data.status === "success"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {message.event.data.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {message.type === "error" && (
                <div className="flex justify-center">
                  <div className="chat-message bg-red-50 border-red-200 text-red-800 max-w-md">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-red-600 mt-1">
                          {formatTimestamp(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="event-card bg-gray-50 border-gray-200 max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse"></div>
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
