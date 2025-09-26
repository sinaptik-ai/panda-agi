import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Papa from "papaparse";
import { getFileExtension } from "@/lib/utils";

interface ContentSidebarTableProps {
  content: string;
  filename: string;
}

const ContentSidebarTable: React.FC<ContentSidebarTableProps> = ({
  content,
  filename,
}) => {
  // Scroll-based loading state
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<string[][]>([]);
  const [parseProgress, setParseProgress] = useState(0);
  const [visibleRows, setVisibleRows] = useState<string[][]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Refs for scroll handling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const loadingTriggerRef = useRef<HTMLDivElement>(null);

  // Parse CSV content only once when content changes
  useEffect(() => {
    if (!content) {
      setTableData([]);
      setVisibleRows([]);
      return;
    }

    setIsLoading(true);
    setParseProgress(0);
    
    // Simulate progress for large files
    const progressInterval = setInterval(() => {
      setParseProgress(prev => {
        if (prev >= 90) return prev; // Don't go to 100% until parsing is complete
        return prev + Math.random() * 10;
      });
    }, 100);
    
    // Use setTimeout to prevent blocking the UI
    const parseTimeout = setTimeout(() => {
      try {
        Papa.parse(content, {
          worker: true,
          skipEmptyLines: true,
          complete: (results) => {
            clearInterval(progressInterval);
            console.log("CSV parsing completed:", results.data.length, "rows");
            const parsedData = results.data as string[][];
            setTableData(parsedData);
            
            // Initially show first 100 rows for better performance
            const initialRows = constructVisibleRows(parsedData, 100);
            setVisibleRows(initialRows);
            
            setParseProgress(100);
            setIsLoading(false);
          },
          error: (error: Error) => {
            clearInterval(progressInterval);
            console.error("Error parsing CSV:", error);
            setTableData([]);
            setVisibleRows([]);
            setParseProgress(0);
            setIsLoading(false);
          }
        });
      } catch (error) {
        clearInterval(progressInterval);
        console.error("Error parsing CSV:", error);
        setTableData([]);
        setVisibleRows([]);
        setParseProgress(0);
        setIsLoading(false);
      }
    }, 0);

    return () => {
      clearTimeout(parseTimeout);
      clearInterval(progressInterval);
    };
  }, [content]);

  const fileExtension = getFileExtension(filename);

  // Helper function to construct visible rows with header
  const constructVisibleRows = useCallback((data: string[][], endIndex?: number) => {
    if (!data.length) return [];
    
    const dataRows = endIndex ? data.slice(1, endIndex + 1) : data.slice(1);
    return [data[0], ...dataRows]; // Header + data rows
  }, []);

  // Load more data when scrolling near the bottom
  const loadMoreData = useCallback(() => {
    if (isLoadingMore || !tableData.length || visibleRows.length >= tableData.length) {
      return;
    }

    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const currentVisibleCount = visibleRows.length - 1; // Exclude header
      const nextBatchSize = 100;
      const endIndex = currentVisibleCount + nextBatchSize;
      
      const newVisibleRows = constructVisibleRows(tableData, endIndex);
      setVisibleRows(newVisibleRows);
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, tableData, visibleRows.length, constructVisibleRows]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreData();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingTriggerRef.current) {
      observer.observe(loadingTriggerRef.current);
    }

    return () => {
      if (loadingTriggerRef.current) {
        observer.unobserve(loadingTriggerRef.current);
      }
    };
  }, [loadMoreData]);

  // Calculate total rows for display
  const totalRows = tableData.length > 0 ? tableData.length - 1 : 0; // Exclude header row
  const visibleDataRows = visibleRows.length > 0 ? visibleRows.length - 1 : 0; // Exclude header row

  return (
    <div className="h-full flex flex-col">
      {/* Table Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {filename.split("/").pop()}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <span>{fileExtension.toUpperCase()}</span>
          <span>{totalRows} rows</span>
          {tableData.length > 0 && (
            <span>{tableData[0].length} columns</span>
          )}
          {visibleDataRows < totalRows && (
            <span>Showing {visibleDataRows} of {totalRows}</span>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center w-full max-w-md">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-sm text-gray-500 mb-2">Parsing CSV data...</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${parseProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400">{Math.round(parseProgress)}% complete</div>
            </div>
          </div>
        ) : visibleRows.length > 0 ? (
          <div ref={tableContainerRef} className="w-full h-full overflow-auto">
            <table
              className="w-full divide-y divide-gray-200"
              style={{ minWidth: "max-content" }}
            >
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {visibleRows[0].map((header, index) => (
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
                {visibleRows.slice(1).map((row, rowIndex) => (
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
            
            {/* Loading trigger for infinite scroll */}
            {visibleDataRows < totalRows && (
              <div ref={loadingTriggerRef} className="flex justify-center py-4">
                {isLoadingMore ? (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span>Loading more data...</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    Scroll down to load more data
                  </div>
                )}
              </div>
            )}
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
};

export default ContentSidebarTable;
