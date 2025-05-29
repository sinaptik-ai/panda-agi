import React, { useState } from "react";
import {
  X,
  ExternalLink,
  FileCode,
  FileText,
  FileImage,
  File,
  Code,
  Eye,
  Globe,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import MarkdownRenderer from "./MarkdownRenderer";

const ContentSidebar = ({ isOpen, onClose, previewData }) => {
  const [htmlViewMode, setHtmlViewMode] = useState("preview"); // "code" or "preview"

  if (!isOpen || !previewData) return null;

  // Get language for syntax highlighting
  const getLanguage = (filename) => {
    if (!filename) return "text";
    const extension = filename.split(".").pop().toLowerCase();

    const languageMap = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      py: "python",
      css: "css",
      scss: "scss",
      html: "html",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      php: "php",
      rb: "ruby",
      go: "go",
      java: "java",
      c: "c",
      cpp: "cpp",
      sh: "bash",
      sql: "sql",
    };

    return languageMap[extension] || "text";
  };

  // Check if content should use full height editor
  const isFullHeightContent = () => {
    const type = previewData.type || "text";
    return (
      type === "code" || type === "html" || type === "text" || type === "iframe"
    );
  };

  // Common line number styling
  const getLineNumberStyle = () => ({
    minWidth: "3em",
    paddingRight: "1em",
    paddingLeft: "0.5em",
    color: "#9ca3af !important",
    backgroundColor: "#1f2937 !important",
    borderRight: "1px solid #374151",
    userSelect: "none",
    display: "inline-block",
    textAlign: "right",
  });

  // Common syntax highlighter styling
  const getCommonStyle = () => ({
    margin: 0,
    padding: "1rem 1rem 1rem 1.5rem",
    backgroundColor: "#1f2937",
    fontSize: "0.875rem",
    lineHeight: "1.5",
    height: "100%",
  });

  // Custom styles to override syntax highlighter defaults
  const customSyntaxStyles = `
    .syntax-highlighter .linenumber {
      color: #9ca3af !important;
      background-color: #1f2937 !important;
      border-right: 1px solid #374151 !important;
      padding-right: 1em !important;
      margin-right: 1.5em !important;
      display: inline-block !important;
      text-align: right !important;
      user-select: none !important;
      min-width: 3em !important;
    }
  `;

  // Render content based on type
  const renderContent = () => {
    const type = previewData.type || "text";
    const content = previewData.content || "";

    switch (type) {
      case "iframe":
        return (
          <div className="h-full">
            <iframe
              src={previewData.url}
              className="w-full h-full border-0"
              title={previewData.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        );
      case "markdown":
        return (
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer>{content}</MarkdownRenderer>
          </div>
        );
      case "html":
        const htmlFilename = previewData.url || "";
        return (
          <div className="flex flex-col h-full">
            {/* Toggle buttons */}
            <div className="flex space-x-2 mb-4 border-b pb-2 flex-shrink-0">
              <button
                onClick={() => setHtmlViewMode("preview")}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${
                  htmlViewMode === "preview"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setHtmlViewMode("code")}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${
                  htmlViewMode === "code"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Code</span>
              </button>
            </div>

            <div className="flex-1 min-h-0">
              {htmlViewMode === "preview" ? (
                <div className="border rounded bg-white h-full">
                  <iframe
                    srcDoc={content}
                    className="w-full h-full border-0 rounded"
                    title="HTML Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              ) : (
                <div className="editor-container bg-gray-900 text-gray-100 rounded overflow-hidden h-full flex flex-col">
                  {/* Editor Header - same style as other code files */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-xs text-gray-300 ml-2">
                        {htmlFilename.split("/").pop()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-400">
                      <span>HTML</span>
                      <span>{content.split("\n").length} lines</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <SyntaxHighlighter
                      language="html"
                      style={vscDarkPlus}
                      showLineNumbers={true}
                      lineNumberStyle={getLineNumberStyle()}
                      customStyle={getCommonStyle()}
                      className="syntax-highlighter"
                      codeTagProps={{
                        style: {
                          fontFamily:
                            'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                        },
                      }}
                    >
                      {content}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case "image":
        // For images, the content could be a data URL, file path, or base64
        if (
          content.startsWith("data:image") ||
          content.startsWith("http") ||
          content.includes("base64")
        ) {
          return (
            <div className="flex justify-center">
              <img
                src={content}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain rounded border"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
              <div className="hidden text-center text-gray-500 p-4">
                <FileImage className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Image preview not available</p>
                <p className="text-xs text-gray-400 mt-1">
                  File: {previewData.url}
                </p>
              </div>
            </div>
          );
        } else {
          return (
            <div className="text-center text-gray-500 p-4">
              <FileImage className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Image file detected</p>
              <p className="text-xs text-gray-400 mt-1">
                Content preview not available
              </p>
              <div
                className="mt-4 editor-container bg-gray-900 text-gray-100 rounded overflow-hidden flex flex-col"
                style={{ height: "60vh" }}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                  <span className="text-xs text-gray-300">Image Data</span>
                  <span className="text-xs text-gray-400">
                    {content.split("\n").length} lines
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  <SyntaxHighlighter
                    language="text"
                    style={vscDarkPlus}
                    showLineNumbers={true}
                    lineNumberStyle={getLineNumberStyle()}
                    customStyle={getCommonStyle()}
                    className="syntax-highlighter"
                  >
                    {content}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          );
        }
      case "pdf":
        return (
          <div className="text-center text-gray-500 p-4">
            <File className="w-12 h-12 mx-auto mb-2 text-red-500" />
            <p>PDF file detected</p>
            <p className="text-xs text-gray-400 mt-1">
              PDF preview not available in browser
            </p>
            {previewData.url && (
              <a
                href={previewData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Open PDF in new tab
              </a>
            )}
            {content && (
              <div
                className="mt-4 editor-container bg-gray-900 text-gray-100 rounded overflow-hidden flex flex-col"
                style={{ height: "50vh" }}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                  <span className="text-xs text-gray-300">
                    PDF Content (if readable)
                  </span>
                  <span className="text-xs text-gray-400">
                    {content.split("\n").length} lines
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  <SyntaxHighlighter
                    language="text"
                    style={vscDarkPlus}
                    showLineNumbers={true}
                    lineNumberStyle={getLineNumberStyle()}
                    customStyle={getCommonStyle()}
                    className="syntax-highlighter"
                  >
                    {content}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        );
      case "code":
        const filename = previewData.url || "";
        const extension = filename.split(".").pop().toLowerCase();
        const languageMap = {
          js: "JavaScript",
          jsx: "React JSX",
          ts: "TypeScript",
          tsx: "React TSX",
          py: "Python",
          css: "CSS",
          scss: "SCSS",
          json: "JSON",
          xml: "XML",
          yaml: "YAML",
          yml: "YAML",
        };
        const language = languageMap[extension] || extension.toUpperCase();
        const syntaxLanguage = getLanguage(filename);

        return (
          <div className="editor-container bg-gray-900 text-gray-100 rounded overflow-hidden h-full flex flex-col">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs text-gray-300 ml-2">
                  {filename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span>{language}</span>
                <span>{content.split("\n").length} lines</span>
              </div>
            </div>

            {/* Code with syntax highlighting */}
            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language={syntaxLanguage}
                style={vscDarkPlus}
                showLineNumbers={true}
                lineNumberStyle={getLineNumberStyle()}
                customStyle={getCommonStyle()}
                className="syntax-highlighter"
                codeTagProps={{
                  style: {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  },
                }}
              >
                {content}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      default:
        return (
          <div className="editor-container bg-gray-900 text-gray-100 rounded overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <span className="text-xs text-gray-300">Text File</span>
              <span className="text-xs text-gray-400">
                {content.split("\n").length} lines
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language="text"
                style={vscDarkPlus}
                showLineNumbers={true}
                lineNumberStyle={getLineNumberStyle()}
                customStyle={getCommonStyle()}
                className="syntax-highlighter"
              >
                {content}
              </SyntaxHighlighter>
            </div>
          </div>
        );
    }
  };

  // Get file type icon
  const getFileIcon = () => {
    const type = previewData.type || "text";

    switch (type) {
      case "code":
        return <FileCode className="w-4 h-4 text-blue-500 mr-1" />;
      case "image":
        return <FileImage className="w-4 h-4 text-green-500 mr-1" />;
      case "pdf":
        return <File className="w-4 h-4 text-red-500 mr-1" />;
      case "markdown":
        return <FileText className="w-4 h-4 text-purple-500 mr-1" />;
      case "html":
        return <FileCode className="w-4 h-4 text-orange-500 mr-1" />;
      case "iframe":
        return <Globe className="w-4 h-4 text-blue-500 mr-1" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500 mr-1" />;
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full max-w-[800px] w-[100vw] bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      {/* Inject custom styles */}
      <style dangerouslySetInnerHTML={{ __html: customSyntaxStyles }} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate flex items-center">
            {getFileIcon()}
            {previewData.title}
          </h3>
          {previewData.url && (
            <a
              href={previewData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center space-x-1 mt-1"
            >
              <span className="truncate">{previewData.url}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
          title="Close preview"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div
        className={`flex-1 min-h-0 ${
          isFullHeightContent() ? "" : "overflow-y-auto p-4"
        }`}
      >
        {isFullHeightContent() ? (
          <div className="h-full p-4">{renderContent()}</div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};

export default ContentSidebar;
