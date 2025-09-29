import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Papa from "papaparse";
import { getFileExtension } from "@/lib/utils";

interface CSVViewerProps {
  content: string;
  filename: string;
  className?: string;
  showHeader?: boolean;
  maxHeight?: string;
}

const CSVViewer: React.FC<CSVViewerProps> = ({
  content,
  filename,
  className = "",
  showHeader = true,
  maxHeight = "h-full",
}) => {
  // Scroll-based loading state
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<string[][]>([]);
  const [parseProgress, setParseProgress] = useState(0);
  const [visibleRows, setVisibleRows] = useState<string[][]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Refs for scroll handling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const loadingTriggerRef = useRef<HTMLDivElement>(null);

  const fileExtension = getFileExtension(filename);

  // Helper function to construct visible rows with header
  const constructVisibleRows = useCallback((data: string[][], endIndex?: number) => {
    if (!data.length) return [];
    
    const dataRows = endIndex ? data.slice(1, endIndex + 1) : data.slice(1);
    return [data[0], ...dataRows]; // Header + data rows
  }, []);

  // Sorting function
  const sortData = useCallback((columnIndex: number, direction: 'asc' | 'desc') => {
    if (!tableData.length) return;
    
    const sortedData = [...tableData];
    const header = sortedData[0];
    const dataRows = sortedData.slice(1);
    
    dataRows.sort((a, b) => {
      const aVal = a[columnIndex] || '';
      const bVal = b[columnIndex] || '';
      
      // Handle null/undefined values
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      // Try to parse as numbers for better sorting
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);
      
      let comparison = 0;
      
      // If both are valid numbers, compare numerically
      if (!isNaN(aNum) && !isNaN(bNum)) {
        comparison = aNum - bNum;
      } else {
        // Otherwise, compare as strings
        comparison = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
    
    // Reconstruct the sorted table data with header
    const newTableData = [header, ...dataRows];
    setTableData(newTableData);
    
    // Update visible rows with sorted data
    const newVisibleRows = constructVisibleRows(newTableData, visibleRows.length > 0 ? visibleRows.length - 1 : 100);
    setVisibleRows(newVisibleRows);
  }, [tableData, constructVisibleRows, visibleRows.length]);

  // Handle column header click for sorting
  const handleColumnSort = useCallback((columnIndex: number) => {
    if (sortColumn === columnIndex) {
      // Same column clicked, toggle direction
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      sortData(columnIndex, newDirection);
    } else {
      // New column clicked, start with ascending
      setSortColumn(columnIndex);
      setSortDirection('asc');
      sortData(columnIndex, 'asc');
    }
  }, [sortColumn, sortDirection, sortData]);

  // Parse CSV content only once when content changes
  useEffect(() => {
    if (!content) {
      setTableData([]);
      setVisibleRows([]);
      setSortColumn(null);
      setSortDirection('asc');
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
  }, [content, constructVisibleRows]);

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
    <div className={`flex flex-col ${className}`}>
      {/* Table Header - Matching data modal style */}
      {showHeader && (
        <div className="flex items-center justify-between p-3 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <i className="fas fa-table text-blue-600 flex-shrink-0"></i>
            <h3 className="text-lg font-semibold text-gray-900 truncate min-w-0" title={filename.split("/").pop()}>
              {filename.split("/").pop()}
            </h3>
            <span className="text-sm text-gray-500 flex-shrink-0">
              ({totalRows.toLocaleString()} rows)
            </span>
          </div>
        </div>
      )}

      {/* Table Content - Matching data modal style */}
      <div >
        {isLoading ? (
          <div className={`flex items-center justify-center h-full min-h-[80vh]`}>
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
            <div className="w-full">
            <div
              ref={tableContainerRef}
              style={maxHeight ? { maxHeight: "85vh" } : {}}
            >
            <table
              className="min-w-full divide-y divide-gray-200"
              style={{ minWidth: "max-content" }}
            >
        
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {visibleRows[0].map((header, index) => {
                    // Helper function to convert column index to Excel-like letter
                    const getExcelColumnName = (index: number): string => {
                      let name = '';
                      let idx = index;
                      while (idx >= 0) {
                        name = String.fromCharCode((idx % 26) + 65) + name;
                        idx = Math.floor(idx / 26) - 1;
                      }
                      return name;
                    };

                    const excelColumnName = getExcelColumnName(index);
                    const formattedHeader = header ? header.charAt(0).toUpperCase() + header.slice(1).replace(/_/g, ' ') : `Column ${index + 1}`;
                    
                    const isSorted = sortColumn === index;
                    const isAsc = isSorted && sortDirection === 'asc';
                    
                    return (
                      <th
                        key={index}
                        className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors duration-150 min-w-0 border-r border-gray-200"
                        title={`${excelColumnName}: ${formattedHeader}`}
                        style={{ maxWidth: "200px" }}
                        onClick={() => handleColumnSort(index)}
                      >
                        <div className="flex items-center justify-between min-w-0 w-full">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{excelColumnName}</span>
                            <span className="truncate min-w-0 flex-1 uppercase tracking-wider" style={{ maxWidth: "120px" }}>
                              {formattedHeader}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            {isSorted ? (
                              <span className="text-xs text-blue-600 font-medium">
                                {isAsc ? '↑' : '↓'}
                              </span>
                            ) : (
                              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleRows.slice(1).map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`hover:bg-blue-50 transition-colors duration-150 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100 truncate"
                        style={{ maxWidth: "200px" }}
                        title={cell}
                      >
                        {cell === null || cell === undefined ? (
                          <span className="text-gray-400 italic">—</span>
                        ) : typeof cell === 'number' ? (
                          new Intl.NumberFormat('en-US').format(cell)
                        ) : typeof cell === 'string' && cell.length > 50 ? (
                          <span title={cell}>{cell.substring(0, 50)}...</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Loading trigger for infinite scroll - Matching data modal style */}
            {visibleDataRows < totalRows && (
              <div ref={loadingTriggerRef} className="flex justify-center py-8">
                {isLoadingMore ? (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
          </div>
        ) : (
          <div className="text-center text-gray-500 p-8">
            <div className="flex flex-col items-center space-y-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <div className="text-gray-500">
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm">The dataset appears to be empty or failed to load.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVViewer;
