import React from "react";
import {
  X,
  ExternalLink,
  FileCode,
  FileText,
  FileImage,
  File,
  Globe,
  Download,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import MarkdownRenderer from "./MarkdownRenderer";

const ContentSidebar = ({ isOpen, onClose, previewData }) => {
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
      type === "code" ||
      type === "html" ||
      type === "text" ||
      type === "iframe" ||
      type === "table"
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

  // CSV Parser function
  const parseCSV = (csvText) => {
    if (!csvText) return [];

    const lines = csvText.trim().split("\n");
    const result = [];

    for (let line of lines) {
      const row = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ";" && !inQuotes) {
          row.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      // Add the last field
      row.push(current.trim());
      result.push(row);
    }

    return result;
  };

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
      case "table":
        const tableFilename = previewData.url || "";
        const tableExtension = tableFilename.split(".").pop().toLowerCase();
        const tableData = parseCSV(content);

        return (
          <div className="h-full flex flex-col">
            {/* Table Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {tableFilename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <span>{tableExtension.toUpperCase()}</span>
                <span>{tableData.length} rows</span>
                {tableData.length > 0 && (
                  <span>{tableData[0].length} columns</span>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-hidden">
              {tableData.length > 0 ? (
                <div className="w-full h-full overflow-auto">
                  <table
                    className="w-full divide-y divide-gray-200"
                    style={{ minWidth: "max-content" }}
                  >
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {tableData[0].map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                            style={{ minWidth: "150px" }}
                          >
                            <div
                              className="truncate"
                              title={header || `Column ${index + 1}`}
                            >
                              {header || `Column ${index + 1}`}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableData.slice(1).map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                              style={{ minWidth: "150px", maxWidth: "400px" }}
                              title={cell}
                            >
                              <div className="truncate">{cell}</div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 p-8">
                  <div className="text-lg mb-2">No data available</div>
                  <div className="text-sm">
                    The file appears to be empty or could not be parsed.
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case "html":
        const htmlFilename = previewData.url || "";
        return (
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
          <div className="text-center text-gray-500 p-4">
            <File className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Unsupported file format</p>
            <p className="text-xs text-gray-400 mt-1">
              This file type cannot be previewed at the moment
            </p>
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
      case "table":
        return <FileText className="w-4 h-4 text-green-600 mr-1" />;
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

  // Handle file download
  const handleFileDownload = (filename) => {
    const downloadUrl = `${
      process.env.REACT_APP_API_URL || "http://localhost:8001"
    }/files/download?file_path=${encodeURIComponent(filename)}`;

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename.split("/").pop(); // Get just the filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex items-center space-x-2">
          {/* Download button - only show for actual files, not iframes */}
          {previewData.url && previewData.type !== "iframe" && (
            <button
              onClick={() => handleFileDownload(previewData.url)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={`Download as ${previewData.url
                .split(".")
                .pop()
                .replace("md", "pdf")
                .toUpperCase()}`}
            >
              <Download className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close preview"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
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
