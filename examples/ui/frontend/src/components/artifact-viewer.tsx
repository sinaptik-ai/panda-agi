import React, { useState, useEffect, useRef, useCallback } from "react";
import FileIcon from "./ui/file-icon";
import { Button } from "./ui/button";
import { getApiHeaders } from "@/lib/api/common";
import { updateArtifact, updateArtifactFile } from "@/lib/api/artifacts";
import { ArtifactData, ArtifactViewerCallbacks } from "@/types/artifact";
import ArtifactActions from "./artifact-actions";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import MarkdownEditor from "./markdown-editor";
import DashboardEditor from "./editor/dashboard-editor";

// Re-export from types for backward compatibility
export type { ArtifactData };

interface ArtifactViewerProps extends ArtifactViewerCallbacks {
  isOpen: boolean;
  onClose: () => void;
  artifact?: ArtifactData;
}

import { unified } from "unified"

// Markdown → HTML
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"

// HTML → Markdown
import rehypeParse from "rehype-parse"
import rehypeRemark from "rehype-remark"
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify"

// Markdown → HTML with empty line preservation
export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown) return "";
  
  // Pre-process markdown to preserve multiple consecutive empty lines
  // We'll convert multiple consecutive newlines to a special placeholder
  const processedMarkdown = markdown.replace(/\n\n\n+/g, (match) => {
    const emptyLineCount = match.length - 2; // subtract the first two newlines
    return '\n\n' + '<!---EMPTY-LINE-PLACEHOLDER--->\n'.repeat(emptyLineCount);
  });
  
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processedMarkdown);
  
  let html = String(file);
  
  // Convert placeholders back to empty paragraphs - note the 3 dashes!
  html = html.replace(/<!---EMPTY-LINE-PLACEHOLDER--->/g, '<p></p>');
  return html;
}

// HTML → Markdown with empty line preservation
export async function htmlToMarkdown(html: string): Promise<string> {
  if (!html) return "";
  
  // Better approach: Replace all empty paragraphs with special markers before unified processing
  let processedHtml = html;
  
  // Replace empty paragraphs with a special marker that unified won't collapse
  processedHtml = processedHtml.replace(/<p><\/p>/g, '<div data-empty-line="true">EMPTY_LINE_MARKER</div>');
  
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(processedHtml);
  
  let markdown = String(file);
  
  // Post-process: Convert markers back to empty lines
  // Each marker should add just one newline: \n\nMARKER\n\n becomes \n\n\n
  // Use a simple iterative approach since global replace doesn't work well with overlapping patterns
  while (markdown.includes('EMPTY_LINE_MARKER') || markdown.includes('EMPTY\\_LINE\\_MARKER')) {
    const beforeReplace = markdown;
    markdown = markdown.replace(/\n\nEMPTY\\_LINE\\_MARKER\n\n/, '\n\n\n');
    markdown = markdown.replace(/\n\nEMPTY_LINE_MARKER\n\n/, '\n\n\n');
    // Safety check to prevent infinite loop
    if (beforeReplace === markdown) break;
  }
  
  // Clean up any extra newlines at the end
  markdown = markdown.replace(/\n+$/, '\n');
  return markdown;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  isOpen,
  onClose,
  artifact,
  onArtifactUpdated,
  onArtifactDeleted,
}) => {
  // State for file content
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [titleEditJustTriggered, setTitleEditJustTriggered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fileBaseUrl = `${window.location.origin}/creations/${artifact?.id}/`;

  // Fetch file content when artifact changes
  useEffect(() => {
    if (!artifact) {
      setFileContent(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Function to fetch artifact content
    const fetchArtifactContent = async () => {
      if (!artifact) return;

      setIsLoading(true);
      setError(null);

      try {
        // For PXML files, fetch compiled version by default (not raw)
        const isPXMLFile = artifact.filepath.toLowerCase().endsWith('.pxml');
        const fileUrl = `${fileBaseUrl}${encodeURIComponent(artifact.filepath)}${
          isPXMLFile ? '' : '?raw=true'
        }`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiHeaders: any = await getApiHeaders();

        const response = await fetch(fileUrl, { headers: apiHeaders });

        if (!response.ok) {
          const errorMessage = await response.json();
          throw new Error(
            errorMessage?.detail ||
              `Failed to fetch artifact: ${response.status}!`
          );
        }

        const content = await response.text();
        setFileContent(content);
      } catch (err) {
        console.error("Error fetching artifact content:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtifactContent();
  }, [artifact, fileBaseUrl]);

  // Handle title change
  const handleTitleChange = async (newTitle: string) => {
    if (!artifact) return;

    try {
      await updateArtifact(artifact.id, {
        name: newTitle,
      });

      // Update the artifact locally without triggering a full reload
      artifact.name = newTitle;
    } catch (error) {
      console.error("Failed to update artifact title:", error);
      throw error;
    }
  };

  // Handle edit title
  const handleEditTitle = () => {
    setTitleEditJustTriggered(true);
    setIsEditingTitle(true);
    // Clear the flag after a short delay and focus the input
    setTimeout(() => {
      setTitleEditJustTriggered(false);
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 200);
  };

  const handleSaveTitle = async (newTitle: string) => {
    await handleTitleChange(newTitle);
    setIsEditingTitle(false);
  };

  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
  };

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirmed) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Handle editor content changes
  const handleEditorChange = (html: string, hasChanges: boolean) => {
    setEditorContent(html);
    setHasUnsavedChanges(hasChanges);
    if (hasChanges) {
      setJustSaved(false);
    }
  };


  // Custom markdown parser that preserves empty lines (fallback)
  const parseMarkdownWithEmptyLines = (markdown: string): string => {
    if (!markdown) return "";

    const lines = markdown.split("\n");
    const htmlLines: string[] = [];
    let inList = false;
    let listType = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Empty line - preserve it and close any open list
      if (line.trim() === "") {
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        htmlLines.push("<p></p>");
        continue;
      }

      let processedLine = line;

      // Headers
      if (line.startsWith("### ")) {
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        processedLine = `<h3>${line.substring(4)}</h3>`;
      } else if (line.startsWith("## ")) {
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        processedLine = `<h2>${line.substring(3)}</h2>`;
      } else if (line.startsWith("# ")) {
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        processedLine = `<h1>${line.substring(2)}</h1>`;
      } else if (line.trim().startsWith("- ")) {
        // Unordered list item
        if (!inList || listType !== "ul") {
          if (inList) htmlLines.push(`</${listType}>`);
          htmlLines.push("<ul>");
          inList = true;
          listType = "ul";
        }
        const listItemContent = line
          .trim()
          .substring(2)
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>");
        processedLine = `<li>${listItemContent}</li>`;
      } else if (/^\d+\.\s/.test(line.trim())) {
        // Numbered list item (1. 2. 3. etc.)
        if (!inList || listType !== "ol") {
          if (inList) htmlLines.push(`</${listType}>`);
          htmlLines.push("<ol>");
          inList = true;
          listType = "ol";
        }
        const listItemContent = line
          .trim()
          .replace(/^\d+\.\s/, "")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>");
        processedLine = `<li>${listItemContent}</li>`;
      } else {
        // Regular content
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        processedLine = line
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>");
        processedLine = `<p>${processedLine}</p>`;
      }

      htmlLines.push(processedLine);
    }

    // Close any remaining open list
    if (inList) {
      htmlLines.push(`</${listType}>`);
    }

    return htmlLines.join("");
  };

  // Update editor content when file content changes
  useEffect(() => {
    if (fileContent !== null) {
      // Convert markdown to HTML using the markdownToHtml function
      const convertContent = async () => {
        try {
          const htmlContent = await markdownToHtml(fileContent);
          setEditorContent(htmlContent);
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error("Error converting markdown to HTML:", error);
          // Fallback to the custom parser if markdownToHtml fails
          const htmlContent = parseMarkdownWithEmptyLines(fileContent);
          setEditorContent(htmlContent);
          setHasUnsavedChanges(false);
        }
      };
      
      convertContent();
    }
  }, [fileContent]);


  const handleSaveContent = async (directContent?: string) => {
    if (!artifact || isSaving) return;

    // If we don't have direct content and no unsaved changes, don't save
    if (!directContent && !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      // Use direct content if provided, otherwise fall back to existing logic
      let content: string;
      if (directContent) {
        content = directContent;
      } else {
        // For markdown files, we should convert HTML back to markdown
        // For other files (including dashboard PXML), use fileContent directly
        content =
          getFileType(artifact.filepath) === "markdown"
            ? await htmlToMarkdown(editorContent)
            : fileContent || "";
      }
      
      await updateArtifactFile(artifact.id, artifact.filepath, content);

      // Always update fileContent with the saved content
      setFileContent(content);
      
      setHasUnsavedChanges(false);
      setJustSaved(true);

      // Show success toast
      toast.success("Dashboard saved successfully!");

      // Reset the "just saved" state after 2 seconds
      setTimeout(() => {
        setJustSaved(false);
      }, 2000);
    } catch (err) {
      console.error("Error saving content:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save content";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };


  if (!artifact) return null;

  // Get file extension and determine type
  const getFileExtension = (filepath: string): string => {
    return filepath.split(".").pop()?.toLowerCase() || "";
  };

  const getFileType = (filepath: string): string => {
    const extension = getFileExtension(filepath);

    if (extension === "md" || extension === "markdown") {
      return "markdown";
    } else if (extension === "pxml") {
      return "dashboard";
    } else if (extension === "html" || extension === "htm") {
      return "iframe";
    } else {
      return "markdown"; // Default to markdown for other file types
    }
  };


  // Render content based on type
  const renderContent = () => {
    const type = getFileType(artifact.filepath);

    switch (type) {
      case "markdown":
        return (
          <MarkdownEditor
            content={editorContent}
            onChange={handleEditorChange}
            onSave={handleSaveContent}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
            justSaved={justSaved}
          />
        );
      case "dashboard":
        return (
          <DashboardEditor
            content={fileContent || ""}
            artifact={artifact}
            onSave={handleSaveContent}
          />
        );
      case "iframe":
        return (
          <div className="h-full">
            <iframe
              src={`${fileBaseUrl}${encodeURIComponent(artifact.filepath)}`}
              className="w-full h-full border-0"
              title={artifact.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
            />
            
          </div>
        );
      default:
        return (
          <div className="h-full overflow-auto">
            <div className="max-w-none mx-auto px-8 py-6">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border">
                <code className="text-gray-800 dark:text-gray-200">
                  {fileContent || ""}
                </code>
              </pre>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      {/* Full-screen editor modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div
          className="w-full h-full max-w-[95vw] max-h-[95vh] mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <FileIcon
                filepath={artifact.filepath}
                className="w-5 h-5 text-blue-500 flex-shrink-0"
              />
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  defaultValue={artifact.name}
                  className="flex-1 px-2 py-1 text-lg font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 focus:border-gray-400 dark:focus:border-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveTitle(e.currentTarget.value);
                    } else if (e.key === "Escape") {
                      handleCancelTitleEdit();
                    }
                  }}
                  onBlur={(e) => {
                    if (!titleEditJustTriggered) {
                      handleSaveTitle(e.currentTarget.value);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <h1
                  className="text-lg font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex-1 min-w-0"
                  onClick={handleEditTitle}
                  title="Click to edit title"
                >
                  {artifact.name}
                </h1>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {justSaved && !hasUnsavedChanges ? (
                <span className="text-sm text-gray-600 dark:text-gray-400 px-3 py-1">
                  Saved
                </span>
              ) : hasUnsavedChanges ? (
                <Button
                  onClick={() => handleSaveContent()}
                  size="sm"
                  title="Save changes"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              ) : null}

              <ArtifactActions
                artifact={artifact}
                onArtifactUpdated={onArtifactUpdated}
                onArtifactDeleted={onArtifactDeleted}
                onClose={onClose}
                onEditName={handleEditTitle}
                isSaved={true}
                previewData={{
                  type: "markdown",
                  filename: artifact.filepath,
                  content: fileContent || ""
                }}
                conversationId={artifact.id}
              />
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
                title="Close editor"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="text-red-500 text-lg mb-2">⚠️ Error</div>
                  <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
              </div>
            ) : (
              <div className="h-full">{renderContent()}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtifactViewer;