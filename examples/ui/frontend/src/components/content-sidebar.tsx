import React, { useState, useEffect, useRef } from "react";
import { FileImage, File } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import MarkdownEditor from "./markdown-editor";
import { markdownToHtml, htmlToMarkdown } from "./artifact-viewer";
import { updateArtifactFile, suggestArtifactName } from "@/lib/api/artifacts";
import SaveArtifactButton from "./save-artifact-button";
import { Button } from "./ui/button";
import ResizableSidebar from "./ui/resizable-sidebar";
import FileIcon from "./ui/file-icon";
import ExcelViewer from "./excel-viewer";
import IframeRenderer from "./ui/iframe-renderer";
import Papa from "papaparse";
import { getApiHeaders } from "@/lib/api/common";
import { config } from "@/lib/config";
import { toast } from "react-hot-toast";
import {
  getFileExtension,
  isExcelFile,
  validateContentType,
  getFileUrl,
  getArtifactFileUrl,
  getFileType,
} from "@/lib/utils";
import ArtifactActions from "./artifact-actions";
import { ArtifactData } from "@/types/artifact";
import { useSavedArtifacts } from "@/contexts/saved-artifacts-context";
import DashboardEditor from "./editor/dashboard-editor";
import ChartRenderer from "./events/chart-renderer";

export interface PreviewData {
  title?: string;
  filename?: string;
  url?: string;
  content?: string;
  type?: string;
  timestamp?: string;
}

interface ContentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  previewData?: PreviewData;
  width?: number;
  onResize?: (width: number) => void;
  conversationId?: string;
}

const ContentSidebar: React.FC<ContentSidebarProps> = ({
  isOpen,
  onClose,
  previewData,
  width,
  onResize,
  conversationId,
}) => {
  // Define iframe-like content types that should be treated similarly
  const IFRAME_LIKE_TYPES = ["iframe", "pxml"] as const;
  
  // Get saved artifacts context (now includes suggested names functionality)
  const { 
    saveArtifact: saveArtifactToContext, 
    getArtifact, 
    removeArtifact,
    saveSuggestedName: saveSuggestedNameToContext, 
    getSuggestedName: getSuggestedNameFromContext 
  } = useSavedArtifacts();
  
  // Utility function to normalize filenames (remove leading './' or '/' if present)
  const normalizeFilename = (filename: string): string => {
    if (!filename) return "";
    if (filename.startsWith("./")) {
      return filename.substring(2);
    }
    if (filename.startsWith("/")) {
      return filename.substring(1);
    }
    return filename;
  };

  // State for normalized filename and content
  const [normalizedFilename, setNormalizedFilename] = useState("");
  const [fileContent, setFileContent] = useState<string | ArrayBuffer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  // Saved state management
  const [isSaved, setIsSaved] = useState(false);
  const [savedArtifact, setSavedArtifact] = useState<ArtifactData | null>(null);

  // Markdown editor state
  const [editorContent, setEditorContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // State to trigger SaveArtifactButton dialog programmatically
  const [shouldOpenSaveDialog, setShouldOpenSaveDialog] = useState(false);
  const saveArtifactButtonRef = useRef<HTMLButtonElement>(null);

  // Suggested name state
  const [suggestedName, setSuggestedName] = useState<string>("");

  // State to trigger title editing from ArtifactActions
  const [shouldTriggerEdit, setShouldTriggerEdit] = useState(false);

  // Ref for triggering title edit from ArtifactActions
  const onEditTitleRef = useRef<(() => void) | null>(null);

  // Reset saved state when sidebar closes
  // Reusable function to reset sidebar state
  const resetSidebarState = () => {
    setIsSaved(false);
    setSavedArtifact(null);
    setHasUnsavedChanges(false);
    setIsSaving(false);
    setJustSaved(false);
    setFileContent(null);
    setSuggestedName("");
    setShouldTriggerEdit(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetSidebarState();
    }
  }, [isOpen]);

  const onSidebarClose = () => {
    resetSidebarState();
    onClose();
  };

  // Function to check for existing saved artifact
  const checkExistingArtifact = () => {
    if (!previewData?.filename || !previewData?.timestamp) {
      return;
    }

    const existingArtifact = getArtifact(previewData.filename, previewData.timestamp);
    if (existingArtifact) {
      setSavedArtifact(existingArtifact);
      setIsSaved(true);
      setSuggestedName(existingArtifact.name);
      return existingArtifact; // Found existing artifact
    }
    return; // No existing artifact
    
  };

  // Function to check for existing suggested name
  const checkExistingSuggestedName = () => {
    if (!previewData?.filename) {
      return;
    }

    const existingSuggestedName = getSuggestedNameFromContext(previewData.filename);
    if (existingSuggestedName) {
      setSuggestedName(existingSuggestedName);
      return existingSuggestedName; // Found existing suggested name
    }
    return; // No existing suggested name
  };

  // Function to get suggested name
  const getSuggestedName = async () => {
    if (
      !conversationId ||
      !previewData?.type ||
      (!previewData?.url && !previewData?.filename)
    ) {
      return;
    }

    try {
      const response = await suggestArtifactName(
        conversationId,
        {
          type: previewData.type,
          filepath: previewData.filename || previewData.url || "",
          content: (fileContent as string || "").substring(
            0,
            config.markdown.maxContentLength
          ),
        }
      );

      if (response.suggested_name) {
        setSuggestedName(response.suggested_name);
        
        // Save suggested name to context for future use
        if (previewData.filename) {
          saveSuggestedNameToContext(
            response.suggested_name,
            previewData.filename,
            conversationId
          );
        }
      }
    } catch (error) {
      console.error("Name suggestion error:", error);
      // Don't show error toast for name suggestion failures - just use default
    }
  };

  // Check for existing artifact and get suggested name when sidebar opens
  useEffect(() => {
    if (isOpen && previewData) {
      // First check if there's an existing saved artifact
      const hasExistingArtifact = checkExistingArtifact();
      
      // If no existing artifact, check for existing suggested name
      if (fileContent && ["markdown", "pxml"].includes(previewData?.type || "") && conversationId) {
        const hasExistingSuggestedName = checkExistingSuggestedName();
        
        // If no existing suggested name and we have the required data, get suggested name from API
        if (!hasExistingSuggestedName) {
          getSuggestedName();
        }
      }
    }
  }, [isOpen, previewData, fileContent, conversationId]);



  // Convert markdown content to HTML for editor
  useEffect(() => {
    if (fileContent && previewData?.type === "markdown") {
      const convertContent = async () => {
        try {
          const htmlContent = await markdownToHtml(fileContent as string);
          setEditorContent(htmlContent);
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error("Error converting markdown to HTML:", error);
          setEditorContent(fileContent as string);
          setHasUnsavedChanges(false);
        }
      };

      convertContent();
    }

    
  }, [fileContent, previewData?.type]);

  // Effect to trigger SaveArtifactButton click when shouldOpenSaveDialog becomes true
  useEffect(() => {
    if (shouldOpenSaveDialog && saveArtifactButtonRef.current) {
      // Use setTimeout to ensure the button is rendered before clicking
      setTimeout(() => {
        if (saveArtifactButtonRef.current) {
          saveArtifactButtonRef.current.click();
          setShouldOpenSaveDialog(false);
        }
      }, 100);
    }
  }, [shouldOpenSaveDialog]);

  // Effect to trigger title editing when shouldTriggerEdit becomes true
  useEffect(() => {
    if (shouldTriggerEdit && onEditTitleRef.current) {
      // Use setTimeout to ensure the dropdown closes before focusing
      setTimeout(() => {
        if (onEditTitleRef.current) {
          onEditTitleRef.current();
        }
        setShouldTriggerEdit(false);
      }, 150);
    }
  }, [shouldTriggerEdit]);

  // Fetch file content when previewData changes
  useEffect(() => {
    if (!previewData) {
      return;
    }


    let filename = previewData.filename || "index.html";

    if (!previewData.filename && previewData.type === "iframe" && previewData.url) {
      // Extract the path from the URL and use it as filename
      const url = new URL(previewData.url);
      const path = url.pathname;

      if (path && path !== "/") {
        // Remove leading slash and use as filename
        filename = path.startsWith("/") ? path.substring(1) : path;
      }
    }

    if (filename) {
      const normalized = normalizeFilename(filename);
      setNormalizedFilename(normalized);

      // Check if there's an existing saved artifact first
      const existingArtifact = checkExistingArtifact();
      
  
      const fileType = previewData.type || "text";
      if (fileType !== "image" && !previewData.content ) {
        fetchFileContent(filename, existingArtifact || null);
      } else if (previewData.content) {
        // If content was provided directly, use it
        setFileContent(previewData.content);
        setIsLoading(false);
        setError(null);
      }
    } else {
      setNormalizedFilename("");
      setFileContent(null);
      setIsLoading(false);
      setError(null);
    }
  }, [previewData]);

  // Handle editor content changes
  const handleEditorChange = (html: string, hasChanges: boolean) => {
    setEditorContent(html);
    setHasUnsavedChanges(hasChanges);
    if (hasChanges) {
      setJustSaved(false);
    }
  };

  /**
   * UNIFIED SAVE WORKFLOW FOR MARKDOWN EDITOR
   *
   * This function handles saving markdown content with different behaviors based on whether
   * the content has been saved as a creation before or not.
   *
   * WORKFLOW SCENARIOS:
   *
   * 1. FIRST TIME SAVE (No creation exists):
   *    - User clicks "Save" → Opens creation dialog (SaveArtifactButton)
   *    - User enters name and confirms
   *    - handleArtifactSaved is called with the new creation
   *    - If user had unsaved changes, handleArtifactSaved automatically updates the creation
   *      with the current editor content via updateArtifactFile
   *
   * 2. SUBSEQUENT SAVES (Creation already exists):
   *    - User clicks "Save" → Directly updates existing creation
   *    - Calls updateArtifactFile API to update the creation content
   *    - No dialog shown, immediate save operation
   *
   * SAVE BUTTON VISIBILITY:
   * - Shows when: hasUnsavedChanges OR !isSaved (never been saved)
   * - This allows saving original content as creation even without modifications
   */
  const handleSaveContent = async (directContent?: string) => {
    if (isSaving) return;

    // Skip if already saved and no changes
    if (!directContent && !hasUnsavedChanges && savedArtifact) return;

    // FIRST TIME SAVE: No creation exists yet
    if (!isSaved || !savedArtifact) {
      // Update preview data with current editor content before opening dialog
      if (previewData) {

        const savedContent =
          getFileType(previewData.filename as string) === "markdown"
            ? await htmlToMarkdown(editorContent)
            : fileContent || "";
  
        previewData.content = savedContent as string;

        // Trigger the SaveArtifactButton dialog to create new creation
        // Note: handleArtifactSaved will handle any unsaved changes after creation
        setShouldOpenSaveDialog(true);
      }
      return;
    }

    // SUBSEQUENT SAVES: Update existing creation directly
    setIsSaving(true);
    try {
      // Convert HTML back to markdown
      let savedContent = "";
      if (directContent) {
        savedContent = directContent
      } else {
        savedContent = (getFileType(savedArtifact.filepath) === "markdown"
          ? await htmlToMarkdown(editorContent)
          : fileContent || "") as string;
      }
      // Update the existing creation file
      await updateArtifactFile(
        savedArtifact.id,
        savedArtifact.filepath,
        savedContent
      );

      setFileContent(savedContent);
      setHasUnsavedChanges(false);
      setJustSaved(true);
      toast.success("Creation updated successfully");

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

  // Function to fetch file content
  const fetchFileContent = async (filename: string, existingArtifact: null | ArtifactData) => {
    if (!conversationId) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Use getArtifactFileUrl if we have a saved artifact, otherwise use getFileUrl
      const fileUrl = existingArtifact && existingArtifact?.id
        ? getArtifactFileUrl(existingArtifact.filepath, existingArtifact.id, true)
        : getFileUrl(filename, conversationId, true, previewData?.timestamp);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiHeaders: any = await getApiHeaders();

      const response = await fetch(fileUrl, { headers: apiHeaders });

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(
          errorMessage?.detail || `Failed to fetch file: ${response.status}!`
        );
      }

      let content: string | ArrayBuffer;
      // Check if it's an Excel file using reusable function
      if (isExcelFile(filename)) {
        const excelContent = await response.arrayBuffer();
        content = excelContent;
      } else {
        content = await response.text();
      }

      setFileContent(content);
    } catch (err) {
      console.error("Error fetching file content:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!previewData) return null;

  // Get language for syntax highlighting
  const getLanguage = (filename: string): string => {
    if (!filename) return "text";
    const extension = filename.split(".").pop()?.toLowerCase() || "";

    const languageMap: Record<string, string> = {
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
      txt: "markdown",
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
  const isFullHeightContent = (): boolean => {
    const type = previewData.type || "text";
    return (
      type === "code" ||
      type === "html" ||
      type === "text" ||
      IFRAME_LIKE_TYPES.includes(type as typeof IFRAME_LIKE_TYPES[number]) ||
      type === "table" ||
      type === "markdown"
    );
  };

  // Common line number styling
  const getLineNumberStyle = (): React.CSSProperties => ({
    minWidth: "3em",
    paddingRight: "1em",
    paddingLeft: "0.5em",
    color: "#9ca3af !important",
    backgroundColor: "#1f2937 !important",
    borderRight: "1px solid #374151",
    userSelect: "none" as const,
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

  // CSV Parser function using PapaParse
  const parseCSV = (csvText: string): string[][] => {
    if (!csvText) return [];

    try {
      // Use PapaParse with automatic delimiter detection
      const result = Papa.parse(csvText, {
        delimiter: "", // Auto-detect delimiter
        skipEmptyLines: true,
        transform: (value: string) => value.trim(),
        complete: () => {},
      });

      // Return the parsed data as string[][]
      return result.data as string[][];
    } catch (error) {
      console.error("Error parsing CSV:", error);
      return [];
    }
  };

  // Render content based on type
  const renderContent = () => {
    const type = previewData.type || "text";
    const content = fileContent || previewData.content || "";
    const currentFilename = normalizedFilename || previewData.url || "";

    // Validate content type using reusable function
    const validation = validateContentType(content, currentFilename);
    if (!validation.isValid) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-2xl mb-3">⚠️</div>
            <p className="font-medium text-destructive">
              Content validation failed
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {validation.error}
            </p>
          </div>
        </div>
      );
    }


    switch (type) {
      case "iframe":
        return <IframeRenderer url={previewData.url!} title={previewData.title} />;
      case "pxml":
        // Check if this is a chart PXML file
        const pxmlContent = content as string;
        if (pxmlContent && pxmlContent.trim().startsWith('<chart')) {
          return (
            <div className="h-full p-4 overflow-auto">
              <ChartRenderer pxmlContent={pxmlContent} conversationId={conversationId} />
            </div>
          );
        }
        // Render DashboardEditor if artifact exists, otherwise render iframe
        if (savedArtifact && fileContent) {
            return (
              <DashboardEditor
                content={fileContent as string}
                artifact={savedArtifact}
                onSave={handleSaveContent}
              />
            );
           
        }
        
        // For non-chart PXML files without saved artifact, use iframe
        return <IframeRenderer url={previewData.url!} title={previewData.title} />;
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
      case "table":
        // Check if it's an Excel file
        if (isExcelFile(currentFilename)) {
          return (
            <ExcelViewer
              fileName={normalizedFilename}
              content={content as ArrayBuffer}
            />
          );
        }

        // Handle CSV files with the existing logic
        const tableData = parseCSV(content as string);
        const fileExtension = getFileExtension(currentFilename);

        return (
          <div className="h-full flex flex-col">
            {/* Table Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {currentFilename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <span>{fileExtension.toUpperCase()}</span>
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
        // Render HTML content in iframe instead of showing code
        return <IframeRenderer url={content as string} title={previewData.title} />;
      case "image":
        if (!normalizedFilename || !conversationId) {
          return null;
        }
        // For images, construct the URL from the filename
        // Use getArtifactFileUrl if we have a saved artifact, otherwise use getFileUrl
        const imageUrl = savedArtifact?.id 
          ? getArtifactFileUrl(normalizedFilename, savedArtifact.id, false)
          : getFileUrl(normalizedFilename, conversationId, false, previewData?.timestamp);
        
        return (
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain rounded border"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const nextSibling = target.nextSibling as HTMLElement;
                if (nextSibling) nextSibling.style.display = "block";
              }}
            />
            <div className="hidden text-center text-gray-500 p-4">
              <FileImage className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Image preview not available</p>
              <p className="text-xs text-gray-400 mt-1">
                File: {normalizedFilename}
              </p>
            </div>
          </div>
        );
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
                    {(content as string).split("\n").length} lines
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
                    {content as string}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        );
      case "code":
        const filename = normalizedFilename || previewData.url || "";
        const extension = filename.split(".").pop()?.toLowerCase() || "";
        const languageMap: Record<string, string> = {
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
                <span>{(content as string).split("\n").length} lines</span>
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
                {content as string}
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



  /**
   * HANDLES COMPLETION OF FIRST-TIME SAVE WORKFLOW
   *
   * This function is called after the SaveArtifactButton successfully creates a new creation.
   * It handles the critical case where users made changes BEFORE saving the creation for the first time.
   *
   * WORKFLOW:
   * 1. Creation is initially saved with original file content (via SaveArtifactButton)
   * 2. This function checks if user had unsaved changes in the editor
   * 3. If yes, immediately sends a second request to update the creation with editor content
   * 4. This ensures user changes are never lost, regardless of when they made them
   *
   * SCENARIOS HANDLED:
   * - User opens file → clicks Save → creation saved with original content
   * - User opens file → makes changes → clicks Save → creation saved + updated with changes
   */
  const handleArtifactSaved = async (artifactData: {
    artifact: ArtifactData;
    detail: string;
  }) => {
    setIsSaved(true);
    setSavedArtifact(artifactData.artifact);
    setSuggestedName(artifactData.artifact.name);

    // Save artifact to context for global access
    if (conversationId && previewData?.filename && previewData?.timestamp) {
      saveArtifactToContext(
        artifactData.artifact,
        previewData.filename,
        previewData.timestamp,
        conversationId
      );
    }

    // CRITICAL: Check if user made changes before first save
    // If yes, we need to update the creation with current editor content
    if (hasUnsavedChanges) {
      try {
        // Convert current editor content to markdown
        const markdownContent = await htmlToMarkdown(editorContent);

        // Send immediate update to the newly created artifact
        await updateArtifactFile(
          artifactData.artifact.id,
          artifactData.artifact.filepath,
          markdownContent
        );

        setFileContent(markdownContent);
        setHasUnsavedChanges(false);
        setJustSaved(true);
        toast.success("Creation saved and updated with your changes");
      } catch (error) {
        console.error("Error updating artifact with changes:", error);
        toast.error("Creation saved but failed to update with your changes");
        // Keep hasUnsavedChanges true so user can manually retry
        return;
      }
    } else {
      // No changes were made, just mark as saved
      setHasUnsavedChanges(false);
      setJustSaved(true);
      toast.success("Creation saved successfully");
    }

    // Reset the "just saved" state after 2 seconds
    setTimeout(() => {
      setJustSaved(false);
    }, 2000);
  };

  // Handle artifact updated
  const handleArtifactUpdated = (updatedArtifact: ArtifactData) => {
    setSavedArtifact(updatedArtifact);
    
    // Update artifact in context
    if (conversationId && previewData?.filename && previewData?.timestamp) {
      saveArtifactToContext(
        updatedArtifact,
        previewData.filename,
        previewData.timestamp,
        conversationId
      );
    }
  };

  // Handle artifact deleted
  const handleArtifactDeleted = () => {
    setIsSaved(false);
    setSavedArtifact(null);
    
    // Remove artifact from context
    if (previewData?.filename && previewData?.timestamp) {
      removeArtifact(previewData.filename, previewData.timestamp);
    }
    
    onSidebarClose();
  };

  // Handle edit name - trigger title editing in ResizableSidebar
  const handleEditName = () => {
    setShouldTriggerEdit(true);
  };

  // Handle title change - update both suggestedName and potentially the saved artifact
  const handleTitleChange = async (newTitle: string) => {
    setSuggestedName(newTitle);
    
    // If we have a saved artifact, update it as well
    if (savedArtifact) {
      try {
        const { updateArtifact } = await import("@/lib/api/artifacts");
        const updatedArtifact = await updateArtifact(savedArtifact.id, {
          name: newTitle,
        });
        
        // Update the saved artifact state
        const updatedArtifactData = {
          ...savedArtifact,
          name: updatedArtifact.name,
        };
        setSavedArtifact(updatedArtifactData);
        
        // Update artifact in context
        if (conversationId && previewData?.filename && previewData?.timestamp) {
          saveArtifactToContext(
            updatedArtifactData,
            previewData.filename,
            previewData.timestamp,
            conversationId
          );
        }
        
        toast.success("Creation name updated successfully");
      } catch (error) {
        console.error("Failed to update artifact name:", error);
        if (error instanceof Error) {
          toast.error(`Failed to update creation name: ${error.message}`);
        } else {
          toast.error("Failed to update creation name");
        }
      }
    }
  };

  // Create header actions
  const headerActions = (
    <>
      {/* Save button for markdown editor - show when there are unsaved changes OR creation has never been saved */}
      {previewData.type === "markdown" && (hasUnsavedChanges || !isSaved) && (
        <Button
          onClick={(e) => {
            e.preventDefault();
            handleSaveContent();
          }}
          disabled={isSaving}
          size="sm"
          variant="default"
          title={!isSaved ? "Save as creation" : "Update creation"}
        >
          {isSaving && (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>{isSaving ? "Saving..." : "Save"}</span>
        </Button>
      )}
      {/* Just saved indicator */}
      {previewData.type === "markdown" && justSaved && !hasUnsavedChanges && (
        <span className="text-sm text-green-600 dark:text-green-400 px-3 py-1">
          Saved
        </span>
      )}
      {/* Hidden SaveArtifactButton for first-time saves - only for markdown files */}
      {previewData.type === "markdown" && !isSaved && (
        <div
          style={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            left: "-9999px",
          }}
        >
          <SaveArtifactButton
            ref={saveArtifactButtonRef}
            conversationId={conversationId}
            previewData={{
              type: previewData.type,
              url: previewData.url,
              filename: previewData.filename,
              content: previewData.content || (fileContent as string) || "",
              timestamp: previewData.timestamp,
            }}
            suggestedName={suggestedName}
            onSave={handleArtifactSaved}
          />
        </div>
      )}
      {/* Save artifact button - only show for iframe-like content when not saved */}
      {(previewData.type && IFRAME_LIKE_TYPES.includes(previewData.type as typeof IFRAME_LIKE_TYPES[number])) && !isSaved && (
        <SaveArtifactButton
          conversationId={conversationId}
          previewData={{
            type: previewData.type,
            url: previewData.url,
            filename: previewData.filename,
            content: previewData.content || (fileContent as string) || "",
          }}
          suggestedName={suggestedName}
          onSave={handleArtifactSaved}
        />
      )}
      {/* Artifact actions - unified download/share/ellipsis */}
      <ArtifactActions
        artifact={savedArtifact}
        onArtifactUpdated={handleArtifactUpdated}
        onArtifactDeleted={handleArtifactDeleted}
        onClose={onSidebarClose}
        isSaved={isSaved}
        previewData={previewData}
        conversationId={conversationId}
        onEditName={
          savedArtifact && suggestedName
            ? handleEditName
            : null
        }
      />
    </>
  );

  const subtitleHref =
    previewData.url ||
    (normalizedFilename && conversationId
      ? savedArtifact?.id 
        ? getArtifactFileUrl(normalizedFilename, savedArtifact.id, false, previewData?.timestamp)
        : getFileUrl(normalizedFilename, conversationId, false, previewData?.timestamp)
      : undefined);

  return (
    <>
      {/* Inject custom styles for syntax highlighter */}
      <style dangerouslySetInnerHTML={{ __html: customSyntaxStyles }} />

      <ResizableSidebar
        isOpen={isOpen}
        onClose={onSidebarClose}
        title={suggestedName || previewData.title}
        subtitle={
           normalizedFilename || previewData.url
            ? {
                text: normalizedFilename || previewData.url || "",
                href: subtitleHref,
              }
            : undefined
        }
        icon={
          <FileIcon
            type={previewData.type}
            filepath={normalizedFilename}
            className="w-4 h-4 text-blue-500 mr-2"
          />
        }
        actions={headerActions}
        width={width}
        onResize={onResize}
        loading={isLoading}
        error={error}
        className={isFullHeightContent() ? "[&>div:last-child]:p-0" : ""}
        editableTitle={!!(suggestedName)}
        onTitleChange={handleTitleChange}
        onEditTitle={(triggerEdit) => {
          onEditTitleRef.current = triggerEdit;
        }}
      >
        {isFullHeightContent() ? (
          <div className="h-full">{renderContent()}</div>
        ) : (
          renderContent()
        )}
      </ResizableSidebar>

    </>
  );
};

export default ContentSidebar;

// Add this to your global CSS file or inject it here
const globalStyles = `
  body.sidebar-open {
    overflow-x: hidden;
  }
  
  /* Direct targeting for main app container */
  .content-shrink {
    max-width: calc(100% - var(--sidebar-width));
    transition: max-width 0.3s ease;
  }
  
  /* Make sure chat interface and messages shrink */
  .content-shrink .max-w-4xl {
    width: 100%;
    max-width: calc(100% - 2rem) !important;
    transition: max-width 0.3s ease;
  }
  
  /* Ensure message cards shrink properly */
  .content-shrink .max-w-4xl .bg-white/70 {
    width: 100%;
  }
  
  /* Ensure the input area shrinks properly */
  .content-shrink .max-w-4xl textarea,
  .content-shrink .max-w-4xl .flex-1 {
    width: 100%;
  }
`;

// Inject the global styles
if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = globalStyles;
  document.head.appendChild(styleEl);
}
