import React, { useMemo } from "react";
import { ChevronRight, Database, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CSVPreviewProps {
  filename: string;
  content?: string;
  fileSize?: number;
  maxRows?: number;
  maxColumns?: number;
  onExpand?: () => void;
  onRemove?: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

const CSVPreview: React.FC<CSVPreviewProps> = ({
  filename,
  content,
  fileSize,
  maxRows = 3,
  maxColumns = 8,
  onExpand,
  onRemove,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const csvData = useMemo(() => {
    if (!content) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        totalColumns: 0,
        isLargeFile: false,
      };
    }

    try {
      // Check if file is large based on original file size, not content length
      const isLargeFile = (fileSize || content.length) > 1024 * 1024;

      // For large files, find complete lines within first chunk for preview
      let previewContent = content;
      if (isLargeFile) {
        const chunk = content.substring(0, 50000);
        // Find the last complete line to avoid cutting off in the middle
        const lastNewlineIndex = chunk.lastIndexOf('\n');
        previewContent = lastNewlineIndex > 0 ? chunk.substring(0, lastNewlineIndex) : chunk;
      }

      const lines = previewContent.trim().split("\n").filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        return {
          headers: [],
          rows: [],
          totalRows: 0,
          totalColumns: 0,
          isLargeFile,
        };
      }

      // Parse CSV - simple implementation for basic cases
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"' && !inQuotes) {
            inQuotes = true;
          } else if (char === '"' && inQuotes) {
            const nextChar = line[i + 1];
            if (nextChar === '"') {
              current += '"';
              i++; // Skip the next quote
            } else {
              inQuotes = false;
            }
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }

        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      
      // Fallback: if no headers detected, try to show at least some content
      if (headers.length === 0 || headers.every(h => h.trim() === '')) {
        // Try to parse first line as data and create generic headers
        const firstDataLine = parseCSVLine(lines[0]);
        if (firstDataLine.length > 0) {
          const genericHeaders = firstDataLine.map((_, index) => `Column ${index + 1}`);
          const previewRows = [firstDataLine];
          
          return {
            headers: genericHeaders,
            rows: previewRows,
            totalRows: isLargeFile ? Math.max(1, content.split("\n").length - 1) : 1,
            totalColumns: genericHeaders.length,
            isLargeFile,
          };
        }
      }

      // Only parse rows needed for preview + a few extra for accurate count
      const maxLinesToParse = Math.min(lines.length - 1, 20);
      const previewRows = lines
        .slice(1, maxLinesToParse + 1)
        .map((line) => parseCSVLine(line))
        .filter((row) => row.some((cell) => cell.length > 0));

      // Calculate total rows
      let estimatedTotalRows;
      if (isLargeFile) {
        // For large files, we can't accurately count rows from partial content
        // So we'll just indicate it's a large file without a specific count
        estimatedTotalRows = "many";
      } else {
        // For small files, count all data rows (excluding header)
        const allDataRows = lines
          .slice(1)
          .map((line) => parseCSVLine(line))
          .filter((row) => row.some((cell) => cell.length > 0));
        estimatedTotalRows = allDataRows.length;
      }

      return {
        headers,
        rows: previewRows,
        totalRows: estimatedTotalRows,
        totalColumns: headers.length,
        isLargeFile,
      };
    } catch (error) {
      console.error("Error parsing CSV:", error);
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        totalColumns: 0,
        isLargeFile: false,
      };
    }
  }, [content, fileSize]);

  // Use fewer columns/rows on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const mobileMaxColumns = 3;
  const mobileMaxRows = 1;

  const effectiveMaxColumns = isMobile ? mobileMaxColumns : maxColumns;
  const effectiveMaxRows = isMobile ? mobileMaxRows : maxRows;

  const displayHeaders = csvData.headers.slice(0, effectiveMaxColumns);
  const displayRows = csvData.rows.slice(0, effectiveMaxRows);
  const hasMoreColumns = csvData.headers.length > effectiveMaxColumns;
  const hasMoreRows = csvData.rows.length > effectiveMaxRows;

  if (!content || csvData.headers.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl sm:p-4 p-3 shadow-sm">
        <div className="flex items-center justify-between sm:text-sm text-xs text-slate-600">
          <div className="flex items-center sm:space-x-2 space-x-1">
            <Database className="sm:w-4 sm:h-4 w-3 h-3 text-slate-500" />
            <span className="font-medium truncate">{filename}</span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="hidden sm:inline">CSV file</span>
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <X className="sm:w-4 sm:h-4 w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden">
      {/* Continuous wave overlay */}
      {isUploading && (
        <div className="absolute inset-0 z-30 overflow-hidden rounded-2xl pointer-events-none">
          {/* Sweeping wave effect */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(148, 163, 184, 0.15) 50%, transparent 100%)",
              width: "150%",
            }}
            animate={{
              x: ["-150%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Progress indicator */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-slate-600 pointer-events-auto">
            {Math.round(uploadProgress)}%
          </div>
        </div>
      )}
      {/* Header */}
      <div className="sm:px-4 sm:py-3 px-3 py-2 border-b border-slate-200/50 bg-slate-50/50 relative z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center sm:space-x-2 space-x-1">
            <Database className="sm:w-4 sm:h-4 w-3 h-3 text-slate-500" />
            <span className="font-medium text-slate-800 truncate sm:text-sm text-xs">
              {filename}
            </span>
            <span className="text-slate-400 sm:text-sm text-xs hidden sm:inline">
              {csvData.isLargeFile
                ? `${csvData.totalColumns} columns`
                : `${csvData.totalRows} rows × ${csvData.totalColumns} columns`}
            </span>
            {isUploading && (
              <span className="text-slate-600 sm:text-sm text-xs font-medium">
                Uploading {Math.round(uploadProgress)}%
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {hasMoreRows && onExpand && (
              <button
                onClick={onExpand}
                className="hidden sm:flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-3 h-3" />
                <span>View all</span>
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="sm:p-1.5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <X className="sm:w-4 sm:h-4 w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full sm:text-sm text-xs relative z-20">
          {/* Headers */}
          <thead>
            <tr className="border-b border-slate-200/50">
              {displayHeaders.map((header, index) => (
                <th
                  key={index}
                  className="sm:px-3 sm:py-2 px-2 py-1 text-left font-medium text-slate-700 bg-slate-50/30 border-r border-slate-200/30 last:border-r-0"
                >
                  <div className="truncate sm:max-w-32 max-w-20" title={header}>
                    {header}
                  </div>
                </th>
              ))}
              {hasMoreColumns && (
                <th className="sm:px-3 sm:py-2 px-2 py-1 text-left font-medium text-slate-400 bg-slate-50/30">
                  <div className="text-xs">
                    +{csvData.headers.length - effectiveMaxColumns} more
                  </div>
                </th>
              )}
            </tr>
          </thead>

          {/* Data Rows */}
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  "border-b border-slate-200/30 hover:bg-slate-50/50 transition-colors",
                  rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                )}
              >
                {displayHeaders.map((_, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="sm:px-3 sm:py-2 px-2 py-1 border-r border-slate-200/30 last:border-r-0"
                  >
                    <div
                      className="truncate sm:max-w-32 max-w-16"
                      title={row[cellIndex] || ""}
                    >
                      {row[cellIndex] || ""}
                    </div>
                  </td>
                ))}
                {hasMoreColumns && (
                  <td className="sm:px-3 sm:py-2 px-2 py-1 text-slate-400">
                    <div className="text-xs">...</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Gradient fade overlay */}
        {hasMoreRows && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default CSVPreview;
