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
      // Connection events
      case "agent_connection_success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;

      // User events
      case "user_notification":
      case "user_question":
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;

      // Web operations
      case "web_search":
        return <Globe className="w-4 h-4 text-orange-500" />;
      case "web_search_result":
        return <Activity className="w-4 h-4 text-orange-500" />;
      case "web_navigation":
        return <Globe className="w-4 h-4 text-orange-600" />;
      case "web_navigation_result":
        return <Globe className="w-4 h-4 text-orange-600" />;

      // File operations
      case "file_read":
        return <FileText className="w-4 h-4 text-cyan-500" />;
      case "file_write":
        return <FileText className="w-4 h-4 text-green-600" />;
      case "file_replace":
        return <FileText className="w-4 h-4 text-yellow-600" />;
      case "file_find":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "file_explore":
        return <FileText className="w-4 h-4 text-blue-600" />;

      // Shell operations
      case "shell_exec":
        return <Activity className="w-4 h-4 text-purple-600" />;
      case "shell_view":
        return <Activity className="w-4 h-4 text-gray-600" />;
      case "shell_write":
        return <Activity className="w-4 h-4 text-yellow-600" />;

      // Image operations
      case "image_generation":
        return <Activity className="w-4 h-4 text-magenta-500" />;

      // Legacy event types (for backwards compatibility)
      case "connection_success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "tool_result":
        return <Activity className="w-4 h-4 text-blue-500" />;
      case "agent_request":
        return <Bot className="w-4 h-4 text-purple-500" />;
      case "web_visit_page":
        return <Globe className="w-4 h-4 text-orange-600" />;
      case "user_send_message":
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case "shell_exec_command":
        return <Activity className="w-4 h-4 text-purple-600" />;
      case "completion":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "unknown":
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      // Connection events
      case "agent_connection_success":
        return "bg-green-50 border-green-200";

      // User events
      case "user_notification":
      case "user_question":
        return "bg-indigo-50 border-indigo-200";

      // Web operations
      case "web_search":
        return "bg-orange-50 border-orange-200";
      case "web_search_result":
        return "bg-orange-50 border-orange-300";
      case "web_navigation":
        return "bg-orange-50 border-orange-300";
      case "web_navigation_result":
        return "bg-orange-50 border-orange-400";

      // File operations
      case "file_read":
        return "bg-cyan-50 border-cyan-200";
      case "file_write":
        return "bg-green-50 border-green-300";
      case "file_replace":
        return "bg-yellow-50 border-yellow-300";
      case "file_find":
        return "bg-blue-50 border-blue-200";
      case "file_explore":
        return "bg-blue-50 border-blue-300";

      // Shell operations
      case "shell_exec":
        return "bg-purple-50 border-purple-300";
      case "shell_view":
        return "bg-gray-50 border-gray-300";
      case "shell_write":
        return "bg-yellow-50 border-yellow-300";

      // Image operations
      case "image_generation":
        return "bg-purple-50 border-purple-200";

      // Legacy event types (for backwards compatibility)
      case "connection_success":
        return "bg-green-50 border-green-200";
      case "tool_result":
        return "bg-blue-50 border-blue-200";
      case "agent_request":
        return "bg-purple-50 border-purple-200";
      case "web_visit_page":
        return "bg-orange-50 border-orange-300";
      case "user_send_message":
        return "bg-indigo-50 border-indigo-200";
      case "shell_exec_command":
        return "bg-purple-50 border-purple-300";
      case "completion":
        return "bg-green-50 border-green-400";
      case "error":
        return "bg-red-50 border-red-200";
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

    // Handle list payloads (like web search results)
    if (Array.isArray(payload)) {
      if (eventType === "web_search_result") {
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Search Results:</p>
            <div className="mt-1 space-y-1">
              {payload.slice(0, 5).map((result, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
                >
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {result.title}
                  </a>
                  <p className="text-xs text-gray-500 mt-1">{result.url}</p>
                </div>
              ))}
              {payload.length > 5 && (
                <p className="text-xs text-gray-500 mt-1">
                  ... and {payload.length - 5} more results
                </p>
              )}
            </div>
          </div>
        );
      } else {
        // Generic list handling
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">
              Results ({payload.length} items):
            </p>
            <div className="mt-1 space-y-1">
              {payload.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
                >
                  {String(item).slice(0, 100)}...
                </div>
              ))}
              {payload.length > 3 && (
                <p className="text-xs text-gray-500 mt-1">
                  ... and {payload.length - 3} more items
                </p>
              )}
            </div>
          </div>
        );
      }
    }

    // Handle dictionary/object payloads
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

      case "web_navigation":
      case "web_navigation_result":
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">URL:</p>
            <div className="mt-1">
              <a
                href={payload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                {payload.url}
              </a>
            </div>
            {payload.content && (
              <div className="mt-2">
                <p className="text-sm text-gray-700 font-medium">
                  Content Preview:
                </p>
                <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {String(payload.content).slice(0, 200)}...
                </div>
              </div>
            )}
          </div>
        );

      case "file_write":
      case "file_read":
      case "file_replace":
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">File:</p>
            <div className="mt-1">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {payload.file || payload.path}
              </code>
            </div>
            {payload.content && (
              <div className="mt-2">
                <p className="text-sm text-gray-700 font-medium">
                  Content Preview:
                </p>
                <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {String(payload.content).slice(0, 200)}...
                </div>
              </div>
            )}
          </div>
        );

      case "shell_exec":
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Command:</p>
            <div className="mt-1">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {payload.command}
              </code>
            </div>
            {payload.id && (
              <div className="mt-1">
                <p className="text-xs text-gray-500">Session: {payload.id}</p>
              </div>
            )}
          </div>
        );

      case "user_notification":
      case "user_question":
        return (
          <div className="mt-2">
            <MarkdownRenderer>
              {payload.text || payload.message}
            </MarkdownRenderer>
            {payload.attachments && payload.attachments.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-700 font-medium">
                  Attachments:
                </p>
                <div className="mt-1 space-y-1">
                  {payload.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-600 bg-gray-50 p-1 rounded"
                    >
                      📎 {attachment}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "image_generation":
        return (
          <div className="mt-2">
            {payload.prompt && (
              <div>
                <p className="text-sm text-gray-700 font-medium">Prompt:</p>
                <div className="mt-1">
                  <MarkdownRenderer>{payload.prompt}</MarkdownRenderer>
                </div>
              </div>
            )}
            {payload.filename && (
              <div className="mt-2">
                <p className="text-sm text-gray-700 font-medium">Generated:</p>
                <div className="mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {payload.filename}
                  </code>
                </div>
              </div>
            )}
          </div>
        );

      // Legacy handling for tool_result
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
                  <p className="text-xs text-gray-500 mt-1">
                    ... and {payload.length - 3} more results
                  </p>
                )}
              </div>
            </div>
          );
        }
        break;

      default:
        // For unknown event types, show a generic payload view
        if (
          payload &&
          typeof payload === "object" &&
          Object.keys(payload).length > 0
        ) {
          return (
            <div className="mt-2">
              <p className="text-sm text-gray-700 font-medium">Details:</p>
              <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                <pre>{JSON.stringify(payload, null, 2)}</pre>
              </div>
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
