import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { getServerURL } from "@/lib/server";

interface MarkdownRendererProps {
  children: string;
  baseUrl?: string | null;
  className?: string;
  linkStyle?: string;
  onPreviewClick?: (previewData: {
    url: string;
    content: string;
    title: string;
    type: string;
  }) => void;
}

// Helper function to check if URL is localhost, 127.0.0.1, .localhost, or ends with .e2b.app
const isHostedUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "localhost" ||
      urlObj.hostname === "127.0.0.1" ||
      urlObj.hostname.startsWith("127.") ||
      urlObj.hostname.endsWith(".localhost") ||
      urlObj.hostname.endsWith(".e2b.app") // TODO - HARDCODED - Add E2B app URLs because they are hosted
    );
  } catch {
    return false;
  }
};

// Helper to truncate text from the middle
function truncateMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const half = Math.floor((maxLength - 3) / 2);
  return text.slice(0, half) + "..." + text.slice(text.length - half);
}

// Function to manually detect and convert plain URLs to links as a fallback
const linkifyText = (
  text: string | React.ReactNode,
  onPreviewClick?: MarkdownRendererProps["onPreviewClick"],
  linkStyle?: string
): string | React.ReactNode => {
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
    const displayUrl = truncateMiddle(url, 80);

    // Check if URL is localhost/127.0.0.1 for special handling
    if (isHostedUrl(url) && onPreviewClick) {
      parts.push(
        <button
          key={match.index}
          onClick={() =>
            onPreviewClick({
              url: url,
              content: "", // Will be loaded via iframe
              title: `${new URL(url).hostname}${
                new URL(url).port ? ":" + new URL(url).port : ""
              }`,
              type: "iframe",
            })
          }
          className={`${linkStyle} hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit inline break-all whitespace-pre-wrap`}
        >
          {displayUrl}
        </button>
      );
    } else {
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkStyle} hover:underline break-all whitespace-pre-wrap`}
        >
          {displayUrl}
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
const processChildren = (
  children: React.ReactNode,
  onPreviewClick?: MarkdownRendererProps["onPreviewClick"],
  linkStyle?: string
): React.ReactNode => {
  if (typeof children === "string") {
    return linkifyText(children, onPreviewClick, linkStyle);
  }
  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === "string") {
        return (
          <React.Fragment key={index}>
            {linkifyText(child, onPreviewClick, linkStyle)}
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
  baseUrl = null,
  className = "",
  linkStyle = "text-blue-600",
  onPreviewClick,
}) => {
  if (!baseUrl) {
    baseUrl = getServerURL();
  }

  const transformUrl = (url: string) => {
    if (
      url.startsWith("http") ||
      url.startsWith("/") ||
      url.startsWith("#") ||
      url.startsWith("mailto:")
    ) {
      return url;
    }
    return new URL(url, baseUrl).toString();
  };

  return (
    <div
      className={`text-sm rounded prose prose-sm prose-gray max-w-none ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkBreaks]}
        components={{
          // Add manual URL detection for text nodes
          text: ({ children }) => {
            return linkifyText(children, onPreviewClick, linkStyle);
          },
          table: ({ children }) => (
            <table className="w-full border border-gray-300 border-collapse my-4">
              {children}
            </table>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-gray-300 last:border-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-sm font-semibold border border-gray-300">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm border border-gray-300">
              {children}
            </td>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">
              {processChildren(children, onPreviewClick, linkStyle)}
            </p>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-2">
              {processChildren(children, onPreviewClick, linkStyle)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mb-2">
              {processChildren(children, onPreviewClick, linkStyle)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mb-1">
              {processChildren(children, onPreviewClick, linkStyle)}
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
              {processChildren(children, onPreviewClick, linkStyle)}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-3 italic">
              {processChildren(children, onPreviewClick, linkStyle)}
            </blockquote>
          ),
          img: ({ node, ...props }) => {
            return (
              <img {...props} src={transformUrl(props.src?.toString() || "")} />
            );
          },
          // Style all links consistently, opening all links in content sidebar
          a: ({ href, children }) => {
            if (href) {
              const isLocal = isHostedUrl(href);
              const displayHref =
                typeof children === "string"
                  ? truncateMiddle(children, 80)
                  : children;

              const transformedHref = transformUrl(href) as string;
              if (!transformedHref) {
                return <span>{children}</span>;
              }

              if (onPreviewClick) {
                return (
                  <button
                    onClick={() => {
                      if (
                        transformedHref?.toString().endsWith(".pdf") ||
                        !isLocal
                      ) {
                        window.open(transformedHref, "_blank");
                      } else {
                        onPreviewClick({
                          url: transformedHref,
                          content: "", // Will be loaded via iframe
                          title: isLocal
                            ? `Preview: ${new URL(transformedHref).hostname}${
                                new URL(transformedHref).port
                                  ? ":" + new URL(transformedHref).port
                                  : ""
                              }`
                            : `External: ${transformedHref}`,
                          type: "iframe",
                        });
                      }
                    }}
                    className={`${linkStyle} hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit inline break-all whitespace-pre-wrap`}
                  >
                    {displayHref}
                  </button>
                );
              } else {
                // If no onPreviewClick, still try to use window.parent to open in sidebar
                return (
                  <button
                    onClick={() => {
                      // Try to communicate with parent window to open in sidebar
                      if (window.parent && window.parent !== window) {
                        window.parent.postMessage(
                          {
                            type: "OPEN_IN_SIDEBAR",
                            url: transformedHref,
                            title: isLocal
                              ? `Preview: ${new URL(transformedHref).hostname}${
                                  new URL(transformedHref).port
                                    ? ":" + new URL(transformedHref).port
                                    : ""
                                }`
                              : `External: ${transformedHref}`,
                          },
                          "*"
                        );
                      } else {
                        // Last resort - open in same window
                        window.open(transformedHref, "_blank");
                      }
                    }}
                    className={`${linkStyle} hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit inline break-all whitespace-pre-wrap`}
                  >
                    {displayHref}
                  </button>
                );
              }
            }
            return <span>{children}</span>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
