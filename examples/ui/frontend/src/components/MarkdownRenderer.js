import React from "react";
import ReactMarkdown from "react-markdown";

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

export default MarkdownRenderer;
