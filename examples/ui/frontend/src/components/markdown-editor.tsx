import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Link2,
  Hash,
  Unlink,
  Plus,
  GripVertical,
  GripHorizontal,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  Eraser,
} from "lucide-react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import { createLowlight } from "lowlight";
import {
  SlashCommand,
  slashCommandSuggestion,
} from "./slash-command-extension";
import "./tiptap-editor.css";

interface MarkdownEditorProps {
  content: string;
  onChange?: (html: string, hasChanges: boolean) => void;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  justSaved?: boolean;
  placeholder?: string;
  className?: string;
}

// Helper component for tooltip-wrapped toolbar buttons
const ToolbarButton = ({
  onClick,
  disabled = false,
  isActive = false,
  tooltip,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : isActive
            ? "bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{tooltip}</p>
    </TooltipContent>
  </Tooltip>
);

// Toolbar component
const Toolbar = ({
  editor,
  wordCount,
  onLinkClick,
  onEditLinkUrl,
}: {
  editor: Editor | null;
  wordCount: number;
  onLinkClick: () => void;
  onEditLinkUrl: () => void;
}) => {
  if (!editor) return null;

  return (
    <TooltipProvider>
      <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-1">
          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            tooltip="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            tooltip="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            tooltip="Inline Code"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Headings */}
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editor.isActive("heading", { level: 1 })}
            tooltip="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editor.isActive("heading", { level: 2 })}
            tooltip="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={editor.isActive("heading", { level: 3 })}
            tooltip="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            tooltip="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            tooltip="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Link */}
          <ToolbarButton
            onClick={editor.isActive("link") ? onEditLinkUrl : onLinkClick}
            isActive={editor.isActive("link")}
            tooltip={editor.isActive("link") ? "Edit Link" : "Add Link"}
          >
            <Link2 className="w-4 h-4" />
          </ToolbarButton>

          {/* Quote */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            tooltip="Quote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Word count */}
        <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center space-x-1">
            <Hash className="w-4 h-4" />
            <span>{wordCount} words</span>
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  onSave,
  hasUnsavedChanges = false,
  isSaving = false,
  justSaved = false,
  placeholder = "Type '/' for commands or click to start writing...",
  className = "",
}) => {
  const [wordCount, setWordCount] = useState(0);
  const [, forceUpdate] = useState({});
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const originalContentRef = useRef<string>("");
  const isInitializingRef = useRef(false);

  // Table control states
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(
    null
  );
  const [tablePosition, setTablePosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<{
    index: number;
    element: HTMLElement;
    top: number;
    height: number;
  } | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<{
    index: number;
    left: number;
    width: number;
  } | null>(null);
  const [showRowDropdown, setShowRowDropdown] = useState<{
    index: number;
    top: number;
    left: number;
  } | null>(null);
  const [showColumnDropdown, setShowColumnDropdown] = useState<{
    index: number;
    top: number;
    left: number;
  } | null>(null);

  // Tiptap editor setup
  const lowlight = createLowlight();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Typography,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: null,
          class: "editor-link",
        },
      }),
      Image,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      HorizontalRule,
      SlashCommand.configure({
        suggestion: slashCommandSuggestion,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();

      // If we're initializing, set the original content and don't call onChange yet
      if (isInitializingRef.current) {
        originalContentRef.current = htmlContent;
        isInitializingRef.current = false;
        return;
      }

      const hasChanges = htmlContent !== originalContentRef.current;
      onChange?.(htmlContent, hasChanges);

      // Update word count
      const text = editor.getText();
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
      setWordCount(words.length);

      // Update button states
      forceUpdate({});

      // Refresh table listeners after content changes
      setTimeout(() => {
        // Clean up any existing table controls first
        cleanupTableControls();
        setupTableHoverListeners();
      }, 100);
    },
    onSelectionUpdate: () => {
      // Force re-render to update button states
      forceUpdate({});
    },
  });

  // Clean up table controls when tables are removed
  const cleanupTableControls = useCallback(() => {
    setHoveredTable(null);
    setTablePosition(null);
    setHoveredRow(null);
    setHoveredColumn(null);
    setShowRowDropdown(null);
    setShowColumnDropdown(null);
  }, []);

  // Set up row and column hover listeners
  const setupRowColumnListeners = useCallback(
    (table: HTMLTableElement, containerRect: DOMRect) => {
      // Set up row listeners
      const rows = table.querySelectorAll("tr");
      rows.forEach((row, index) => {
        const htmlRow = row as HTMLElement;
        const rowRect = htmlRow.getBoundingClientRect();

        htmlRow.addEventListener("mouseenter", () => {
          setHoveredRow({
            index,
            element: htmlRow,
            top: rowRect.top - containerRect.top,
            height: rowRect.height,
          });
        });
      });

      // Set up column listeners by tracking cell hovers
      const firstRow = rows[0];
      if (firstRow) {
        const cells = firstRow.querySelectorAll("td, th");
        cells.forEach((cell, index) => {
          const htmlCell = cell as HTMLElement;
          const cellRect = htmlCell.getBoundingClientRect();

          htmlCell.addEventListener("mouseenter", () => {
            setHoveredColumn({
              index,
              left: cellRect.left - containerRect.left,
              width: cellRect.width,
            });
          });
        });
      }
    },
    []
  );

  // Set up table hover listeners
  const setupTableHoverListeners = useCallback(() => {
    if (!editor) return;

    const editorElement = document.querySelector(".tiptap-editor .ProseMirror");
    if (!editorElement) return;

    const editorContainer = document
      .querySelector(".tiptap-editor")
      ?.closest("div");
    if (!editorContainer) return;

    const tables = editorElement.querySelectorAll("table");

    // If no tables exist, clean up any lingering controls
    if (tables.length === 0) {
      cleanupTableControls();
      return;
    }

    const handleMouseEnter = (table: HTMLTableElement) => {
      const containerRect = editorContainer.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();

      setHoveredTable(table);
      setTablePosition({
        top: tableRect.top - containerRect.top,
        left: tableRect.left - containerRect.left,
        width: tableRect.width,
        height: tableRect.height,
      });

      // Set up row and column hover listeners
      setupRowColumnListeners(table, containerRect);
    };

    tables.forEach((table) => {
      const htmlTable = table as HTMLTableElement;
      htmlTable.addEventListener("mouseenter", () =>
        handleMouseEnter(htmlTable)
      );
    });

    // Cleanup function
    return () => {
      tables.forEach((table) => {
        const htmlTable = table as HTMLTableElement;
        htmlTable.removeEventListener("mouseenter", () =>
          handleMouseEnter(htmlTable)
        );
      });
    };
  }, [editor, setupRowColumnListeners, cleanupTableControls]);

  // Add table controls
  const handleAddRow = useCallback(() => {
    if (!editor || !hoveredTable) return;

    // Move cursor to last cell of the table to ensure we add at the end
    const rows = hoveredTable.querySelectorAll("tr");
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const cells = lastRow.querySelectorAll("td, th");
      if (cells.length > 0) {
        const lastCell = cells[cells.length - 1];
        const pos = editor.view.posAtDOM(lastCell, 0);
        editor.commands.setTextSelection(pos);
      }
    }

    editor.chain().focus().addRowAfter().run();
    setTimeout(() => setupTableHoverListeners(), 100);
  }, [editor, setupTableHoverListeners, hoveredTable]);

  const handleAddColumn = useCallback(() => {
    if (!editor || !hoveredTable) return;

    // Move cursor to last cell of the first row to ensure we add at the end
    const rows = hoveredTable.querySelectorAll("tr");
    if (rows.length > 0) {
      const firstRow = rows[0];
      const cells = firstRow.querySelectorAll("td, th");
      if (cells.length > 0) {
        const lastCell = cells[cells.length - 1];
        const pos = editor.view.posAtDOM(lastCell, 0);
        editor.commands.setTextSelection(pos);
      }
    }

    editor.chain().focus().addColumnAfter().run();
    setTimeout(() => setupTableHoverListeners(), 100);
  }, [editor, setupTableHoverListeners, hoveredTable]);

  // Dropdown handlers
  const handleShowRowDropdown = useCallback(
    (rowIndex: number, buttonTop: number, buttonLeft: number) => {
      setShowRowDropdown({
        index: rowIndex,
        top: buttonTop,
        left: buttonLeft + 25,
      });
      setShowColumnDropdown(null);
    },
    []
  );

  const handleShowColumnDropdown = useCallback(
    (columnIndex: number, buttonTop: number, buttonLeft: number) => {
      setShowColumnDropdown({
        index: columnIndex,
        top: buttonTop + 25,
        left: buttonLeft,
      });
      setShowRowDropdown(null);
    },
    []
  );

  // Table operation functions
  const handleRowOperation = useCallback(
    (operation: string, rowIndex: number) => {
      if (!editor || !hoveredTable) return;

      const rows = hoveredTable.querySelectorAll("tr");
      const targetRow = rows[rowIndex];
      if (!targetRow) return;

      // Position cursor in the target row
      const cells = targetRow.querySelectorAll("td, th");
      if (cells.length > 0) {
        const pos = editor.view.posAtDOM(cells[0], 0);
        editor.commands.setTextSelection(pos);
      }

      switch (operation) {
        case "addBefore":
          editor.chain().focus().addRowBefore().run();
          break;
        case "addAfter":
          editor.chain().focus().addRowAfter().run();
          break;
        case "duplicate":
          editor.chain().focus().addRowAfter().run();
          setTimeout(() => {
            const rows = hoveredTable.querySelectorAll("tr");
            const sourceRow = rows[rowIndex];
            const newRow = rows[rowIndex + 1];

            if (sourceRow && newRow) {
              const sourceCells = sourceRow.querySelectorAll("td, th");
              const newCells = newRow.querySelectorAll("td, th");

              let cellIndex = 0;
              const copyCellContent = () => {
                if (cellIndex < sourceCells.length) {
                  const sourceCell = sourceCells[cellIndex];
                  const newCell = newCells[cellIndex];

                  if (sourceCell && newCell && sourceCell.textContent) {
                    const content = sourceCell.textContent.trim();
                    if (content) {
                      newCell.innerHTML = `<p>${content}</p>`;
                    }
                  }
                  cellIndex++;
                  setTimeout(copyCellContent, 10);
                }
              };
              copyCellContent();
            }
          }, 50);
          break;
        case "clear":
          const cells = targetRow.querySelectorAll("td, th");
          cells.forEach((cell) => {
            if (cell.textContent && cell.textContent.trim() !== "") {
              try {
                const startPos = editor.view.posAtDOM(cell, 0);
                const endPos = editor.view.posAtDOM(
                  cell,
                  cell.childNodes.length
                );
                editor.commands.setTextSelection({
                  from: startPos,
                  to: endPos,
                });
                editor.commands.deleteSelection();
              } catch {
                cell.innerHTML = "";
              }
            }
          });
          break;
        case "delete":
          editor.chain().focus().deleteRow().run();
          break;
      }

      setShowRowDropdown(null);
      setTimeout(() => {
        cleanupTableControls();
        setupTableHoverListeners();
      }, 100);
    },
    [editor, hoveredTable, setupTableHoverListeners, cleanupTableControls]
  );

  const handleColumnOperation = useCallback(
    (operation: string, columnIndex: number) => {
      if (!editor || !hoveredTable) return;

      const rows = hoveredTable.querySelectorAll("tr");
      if (rows.length === 0) return;

      // Position cursor in the target column
      const targetCell = rows[0].querySelectorAll("td, th")[columnIndex];
      if (targetCell) {
        const pos = editor.view.posAtDOM(targetCell, 0);
        editor.commands.setTextSelection(pos);
      }

      switch (operation) {
        case "addBefore":
          editor.chain().focus().addColumnBefore().run();
          break;
        case "addAfter":
          editor.chain().focus().addColumnAfter().run();
          break;
        case "duplicate":
          editor.chain().focus().addColumnAfter().run();
          setTimeout(() => {
            const rows = hoveredTable.querySelectorAll("tr");

            let rowIndex = 0;
            const copyRowContent = () => {
              if (rowIndex < rows.length) {
                const row = rows[rowIndex];
                const cells = row.querySelectorAll("td, th");
                const sourceCell = cells[columnIndex];
                const newCell = cells[columnIndex + 1];

                if (sourceCell && newCell && sourceCell.textContent) {
                  const content = sourceCell.textContent.trim();
                  if (content) {
                    newCell.innerHTML = `<p>${content}</p>`;
                  }
                }
                rowIndex++;
                setTimeout(copyRowContent, 10);
              }
            };
            copyRowContent();
          }, 50);
          break;
        case "clear":
          const allRows = hoveredTable.querySelectorAll("tr");
          allRows.forEach((row) => {
            const cell = row.querySelectorAll("td, th")[columnIndex];
            if (cell && cell.textContent && cell.textContent.trim() !== "") {
              try {
                const startPos = editor.view.posAtDOM(cell, 0);
                const endPos = editor.view.posAtDOM(
                  cell,
                  cell.childNodes.length
                );
                editor.commands.setTextSelection({
                  from: startPos,
                  to: endPos,
                });
                editor.commands.deleteSelection();
              } catch {
                cell.innerHTML = "";
              }
            }
          });
          break;
        case "delete":
          editor.chain().focus().deleteColumn().run();
          break;
      }

      setShowColumnDropdown(null);
      setTimeout(() => {
        cleanupTableControls();
        setupTableHoverListeners();
      }, 100);
    },
    [editor, hoveredTable, setupTableHoverListeners, cleanupTableControls]
  );

  // Handle editing existing link URL
  const handleEditLinkUrl = useCallback(() => {
    if (!editor) return;

    const attrs = editor.getAttributes("link");
    setLinkUrl(attrs.href || "");
    setShowLinkDialog(true);
  }, [editor]);

  // Handle link insertion
  const handleLinkClick = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to) || "";

    // Check if the current selection is within a link
    const isInLink = editor.isActive("link");

    if (isInLink) {
      // Remove existing link from current selection/cursor position
      editor.chain().focus().unsetLink().run();
    } else {
      // Show dialog to add link
      setLinkUrl(selectedText.startsWith("http") ? selectedText : "");
      setShowLinkDialog(true);
    }
  };

  const handleLinkSubmit = () => {
    if (linkUrl && editor) {
      // If we're editing an existing link, we need to update the entire link
      if (editor.isActive("link")) {
        // Select the entire link first, then update its URL
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: linkUrl })
          .run();
      } else {
        // Creating a new link
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
    }
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  const handleUnlink = () => {
    if (editor) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isInitializingRef.current = true;
      editor.commands.setContent(content);

      // Update initial word count
      const text = editor.getText();
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
      setWordCount(words.length);

      // Set up table hover listeners
      setTimeout(() => {
        cleanupTableControls();
        setupTableHoverListeners();
      }, 100);
    }
  }, [editor, content, setupTableHoverListeners, cleanupTableControls]);

  // Reset original content reference when content is saved
  useEffect(() => {
    if (justSaved && editor) {
      originalContentRef.current = editor.getHTML();
    }
  }, [justSaved, editor]);

  return (
    <div
      className={`h-full flex flex-col bg-gray-50 dark:bg-gray-900 ${className}`}
    >
      <Toolbar
        editor={editor}
        wordCount={wordCount}
        onLinkClick={handleLinkClick}
        onEditLinkUrl={handleEditLinkUrl}
      />

      <div className="flex-1 p-0 md:p-6 overflow-auto bg-gray-100">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 min-h-full shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg relative">
          <div className="px-4 py-4 md:px-16 md:py-12">
            <EditorContent
              editor={editor}
              className="tiptap-editor focus:outline-none cursor-text"
            />

            {/* Table Controls */}
            {hoveredTable && tablePosition && (
              <>
                {/* Invisible hover zone that extends beyond the table */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: tablePosition.left - 20,
                    top: tablePosition.top - 20,
                    width: tablePosition.width + 60,
                    height: tablePosition.height + 60,
                    zIndex: 1,
                  }}
                  onMouseLeave={() => {
                    setHoveredTable(null);
                    setTablePosition(null);
                  }}
                >
                  {/* Hover zone borders */}
                  <div
                    className="pointer-events-auto"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "20px",
                    }}
                  />
                  <div
                    className="pointer-events-auto"
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "20px",
                    }}
                  />
                  <div
                    className="pointer-events-auto"
                    style={{
                      position: "absolute",
                      top: "20px",
                      bottom: "20px",
                      left: 0,
                      width: "20px",
                    }}
                  />
                  <div
                    className="pointer-events-auto"
                    style={{
                      position: "absolute",
                      top: "20px",
                      bottom: "20px",
                      right: 0,
                      width: "20px",
                    }}
                  />
                </div>

                {/* Add Column Button */}
                <button
                  onClick={handleAddColumn}
                  className="absolute bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md p-1.5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md"
                  style={{
                    left: tablePosition.left + tablePosition.width - 12,
                    top: tablePosition.top + tablePosition.height / 2 - 12,
                    zIndex: 20,
                  }}
                  title="Add column"
                >
                  <Plus className="w-3 h-3" />
                </button>

                {/* Add Row Button */}
                <button
                  onClick={handleAddRow}
                  className="absolute bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md p-1.5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md"
                  style={{
                    left: tablePosition.left + tablePosition.width / 2 - 12,
                    top: tablePosition.top + tablePosition.height - 12,
                    zIndex: 20,
                  }}
                  title="Add row"
                >
                  <Plus className="w-3 h-3" />
                </button>

                {/* Row Selection Button */}
                {hoveredRow && (
                  <>
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: tablePosition.left - 15,
                        top: hoveredRow.top - 5,
                        width: tablePosition.width + 20,
                        height: hoveredRow.height + 10,
                        zIndex: 1,
                      }}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <div
                        className="pointer-events-auto"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "15px",
                          height: "100%",
                        }}
                      />
                    </div>
                    <button
                      onClick={() =>
                        handleShowRowDropdown(
                          hoveredRow.index,
                          hoveredRow.top + hoveredRow.height / 2 - 8,
                          tablePosition.left - 8
                        )
                      }
                      className="absolute bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 border border-gray-200/50 dark:border-gray-600/50 hover:border-gray-200 dark:hover:border-gray-600 rounded-sm p-0.5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md opacity-60 hover:opacity-100"
                      style={{
                        left: tablePosition.left - 8,
                        top: hoveredRow.top + hoveredRow.height / 2 - 8,
                        zIndex: 20,
                      }}
                      title="Row options"
                    >
                      <GripVertical className="w-2.5 h-2.5" />
                    </button>
                  </>
                )}

                {/* Column Selection Button */}
                {hoveredColumn && (
                  <>
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: hoveredColumn.left - 5,
                        top: tablePosition.top - 15,
                        width: hoveredColumn.width + 10,
                        height: tablePosition.height + 20,
                        zIndex: 1,
                      }}
                      onMouseLeave={() => setHoveredColumn(null)}
                    >
                      <div
                        className="pointer-events-auto"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "15px",
                        }}
                      />
                    </div>
                    <button
                      onClick={() =>
                        handleShowColumnDropdown(
                          hoveredColumn.index,
                          tablePosition.top - 8,
                          hoveredColumn.left + hoveredColumn.width / 2 - 8
                        )
                      }
                      className="absolute bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 border border-gray-200/50 dark:border-gray-600/50 hover:border-gray-200 dark:hover:border-gray-600 rounded-sm p-0.5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md opacity-60 hover:opacity-100"
                      style={{
                        left: hoveredColumn.left + hoveredColumn.width / 2 - 8,
                        top: tablePosition.top - 8,
                        zIndex: 20,
                      }}
                      title="Column options"
                    >
                      <GripHorizontal className="w-2.5 h-2.5" />
                    </button>
                  </>
                )}

                {/* Row Dropdown Menu */}
                {showRowDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowRowDropdown(null)}
                    />
                    <div
                      className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-30 min-w-48"
                      style={{
                        top: showRowDropdown.top,
                        left: showRowDropdown.left,
                      }}
                    >
                      <div className="py-1">
                        <button
                          onClick={() =>
                            handleRowOperation(
                              "addBefore",
                              showRowDropdown.index
                            )
                          }
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <ArrowUp className="w-4 h-4" />
                          <span>Add row above</span>
                        </button>
                        <button
                          onClick={() =>
                            handleRowOperation(
                              "addAfter",
                              showRowDropdown.index
                            )
                          }
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <ArrowDown className="w-4 h-4" />
                          <span>Add row below</span>
                        </button>
                        <hr className="my-1 border-gray-200 dark:border-gray-600" />
                        <button
                          onClick={() =>
                            handleRowOperation(
                              "duplicate",
                              showRowDropdown.index
                            )
                          }
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Duplicate row</span>
                        </button>
                        <button
                          onClick={() =>
                            handleRowOperation("clear", showRowDropdown.index)
                          }
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <Eraser className="w-4 h-4" />
                          <span>Clear content</span>
                        </button>
                        <hr className="my-1 border-gray-200 dark:border-gray-600" />
                        <button
                          onClick={() =>
                            handleRowOperation("delete", showRowDropdown.index)
                          }
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete row</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Column Dropdown Menu */}
                {showColumnDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowColumnDropdown(null)}
                    />
                    <div
                      className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-30 min-w-48"
                      style={{
                        top: showColumnDropdown.top,
                        left: showColumnDropdown.left,
                      }}
                    >
                      <div className="py-1">
                        <button
                          onClick={() =>
                            handleColumnOperation(
                              "addBefore",
                              showColumnDropdown.index
                            )
                          }
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Add column left</span>
                        </button>
                        <button
                          onClick={() =>
                            handleColumnOperation(
                              "addAfter",
                              showColumnDropdown.index
                            )
                          }
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>Add column right</span>
                        </button>
                        <hr className="my-1 border-gray-200 dark:border-gray-600" />
                        <button
                          onClick={() =>
                            handleColumnOperation(
                              "duplicate",
                              showColumnDropdown.index
                            )
                          }
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Duplicate column</span>
                        </button>
                        <button
                          onClick={() =>
                            handleColumnOperation(
                              "clear",
                              showColumnDropdown.index
                            )
                          }
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <Eraser className="w-4 h-4" />
                          <span>Clear content</span>
                        </button>
                        <hr className="my-1 border-gray-200 dark:border-gray-600" />
                        <button
                          onClick={() =>
                            handleColumnOperation(
                              "delete",
                              showColumnDropdown.index
                            )
                          }
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete column</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editor?.isActive("link") ? "Edit Link" : "Add Link"}
            </h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLinkSubmit();
                } else if (e.key === "Escape") {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                }
              }}
            />
            <div className="flex justify-between">
              <div>
                {editor?.isActive("link") && (
                  <Button
                    onClick={handleUnlink}
                    variant="outline"
                    size="sm"
                    className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Remove Link
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkUrl("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLinkSubmit}
                  size="sm"
                  disabled={!linkUrl.trim()}
                >
                  {editor?.isActive("link") ? "Update Link" : "Add Link"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
