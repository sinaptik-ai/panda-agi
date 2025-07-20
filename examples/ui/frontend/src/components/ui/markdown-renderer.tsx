import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from 'remark-breaks'

interface MarkdownRendererProps {
  children: string;
  className?: string;
  onPreviewClick?: (previewData: {
    url: string;
    content: string;
    title: string;
    type: string;
  }) => void;
}

// Helper function to check if URL is localhost or 127.0.0.1
const isLocalhost = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "localhost" ||
      urlObj.hostname === "127.0.0.1" ||
      urlObj.hostname.startsWith("127.") ||
      urlObj.hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
};

// Function to manually detect and convert plain URLs to links as a fallback
const linkifyText = (text: string | React.ReactNode, onPreviewClick?: MarkdownRendererProps["onPreviewClick"]): string | React.ReactNode => {
  if (typeof text !== "string") return text;

  // Comprehensive URL regex that properly captures full URLs
  // Allow normal URL characters but use negative lookahead to exclude trailing markdown syntax
  const urlRegex = /(https?:\/\/[^\s<>"'\\]+?)(?=\*{2,}|\s|$|[<>"'\\])/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the URL as a clickable link
    const url = match[0];

    // Check if URL is localhost/127.0.0.1 for special handling
    if (isLocalhost(url) && onPreviewClick) {
      parts.push(
        <button
          key={match.index}
          onClick={() =>
            onPreviewClick({
              url: url,
              content: "", // Will be loaded via iframe
              title: `Preview: ${new URL(url).hostname}${
                new URL(url).port ? ":" + new URL(url).port : ""
              }`,
              type: "iframe",
            })
          }
          className="text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit inline"
        >
          {url}
        </button>
      );
    } else {
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {url}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 1 ? parts : text;
};

// Helper function to process children and linkify text
const processChildren = (children: React.ReactNode, onPreviewClick?: MarkdownRendererProps["onPreviewClick"]): React.ReactNode => {
  if (typeof children === "string") {
    return linkifyText(children, onPreviewClick);
  }
  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === "string") {
        return (
          <React.Fragment key={index}>
            {linkifyText(child, onPreviewClick)}
          </React.Fragment>
        );
      }
      return child;
    });
  }
  return children;
};


// Reusable markdown renderer component
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  children, 
  className = "", 
  onPreviewClick
}) => {

  return (
    <div
      className={`text-sm rounded prose prose-sm prose-gray max-w-none ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Add manual URL detection for text nodes
          text: ({ children }) => {
            return linkifyText(children, onPreviewClick);
          },
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">
              {processChildren(children, onPreviewClick)}
            </p>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-2">
              {processChildren(children, onPreviewClick)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mb-2">
              {processChildren(children, onPreviewClick)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mb-1">
              {processChildren(children, onPreviewClick)}
            </h3>
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
          li: ({ children }) => (
            <li className="mb-1">
              {processChildren(children, onPreviewClick)}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-3 italic">
              {processChildren(children, onPreviewClick)}
            </blockquote>
          ),
          // Style all links consistently, with special handling for localhost URLs
          a: ({ href, children }) => {
            if (href && isLocalhost(href) && onPreviewClick) {
              return (
                <button
                  onClick={() =>
                    onPreviewClick({
                      url: href,
                      content: "", // Will be loaded via iframe
                      title: `Preview: ${new URL(href).hostname}${
                        new URL(href).port ? ":" + new URL(href).port : ""
                      }`,
                      type: "iframe",
                    })
                  }
                  className="text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit inline"
                >
                  {children}
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;