import React, { useState, useEffect, useMemo } from "react";
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
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<string[][]>([]);
  const [parseProgress, setParseProgress] = useState(0);

  // Parse CSV content only once when content changes
  useEffect(() => {
    if (!content) {
      setTableData([]);
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
        const result = Papa.parse(content, {
          worker: true,
          skipEmptyLines: true,
          complete: (results) => {
            clearInterval(progressInterval);
            console.log("CSV parsing completed:", results.data.length, "rows");
            setTableData(results.data as string[][]);
            setParseProgress(100);
            setIsLoading(false);
          },
          error: (error: any) => {
            clearInterval(progressInterval);
            console.error("Error parsing CSV:", error);
            setTableData([]);
            setParseProgress(0);
            setIsLoading(false);
          }
        });
      } catch (error) {
        clearInterval(progressInterval);
        console.error("Error parsing CSV:", error);
        setTableData([]);
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

  // Memoized pagination logic to prevent unnecessary recalculations
  const paginationData = useMemo(() => {
    const totalRows = tableData.length > 0 ? tableData.length - 1 : 0; // Exclude header row
    const totalPages = Math.ceil(totalRows / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = tableData.length > 0 ? [
      tableData[0], // Header row
      ...tableData.slice(1).slice(startIndex, endIndex) // Data rows
    ] : [];

    return {
      totalRows,
      totalPages,
      startIndex,
      endIndex,
      paginatedData
    };
  }, [tableData, currentPage, itemsPerPage]);

  const { totalRows, totalPages, startIndex, endIndex, paginatedData } = paginationData;

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (isLoading) return; // Prevent page changes while loading
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    if (isLoading) return; // Prevent changes while loading
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

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
          {totalPages > 1 && (
            <span>Page {currentPage} of {totalPages}</span>
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
        ) : paginatedData.length > 0 ? (
          <div className="w-full h-full overflow-auto">
            <table
              className="w-full divide-y divide-gray-200"
              style={{ minWidth: "max-content" }}
            >
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {paginatedData[0].map((header, index) => (
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
                {paginatedData.slice(1).map((row, rowIndex) => (
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

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="items-per-page" className="text-sm text-gray-700">
                Rows per page:
              </label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, totalRows)} of {totalRows} rows
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      currentPage === pageNum
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentSidebarTable;
