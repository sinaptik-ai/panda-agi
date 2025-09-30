"use client";

import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface ExcelViewerProps {
  fileName?: string;
  content: ArrayBuffer; // ✅ raw bytes
}

interface SheetData {
  name: string;
  data: (string | number | boolean | null)[][];
}

export default function ExcelViewer({ fileName, content }: ExcelViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);

  useEffect(() => {
    if (!content) return;

    const workbook = XLSX.read(content, { type: "array" });
    const sheetData: SheetData[] = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | boolean | null)[][];
      return { name, data };
    });
    setSheets(sheetData);
  }, [content]);

  if (sheets.length === 0) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-gray-500">
        <p>No data found in Excel file</p>
      </div>
    </div>
  );

  const current = sheets[0]; // just render first sheet for now

  return (
    <div className="h-full flex flex-col">
      {/* Table Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {fileName?.split("/").pop() || "Excel File"}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <span>EXCEL</span>
          <span>{current.data.length} rows</span>
          {current.data.length > 0 && (
            <span>{current.data[0].length} columns</span>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-hidden">
        {current.data.length > 0 ? (
          <div className="w-full h-full overflow-auto">
            <table
              className="w-full divide-y divide-gray-200"
              style={{ minWidth: "max-content" }}
            >
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {current.data[0].map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                      style={{ minWidth: "150px" }}
                    >
                      <div
                        className="truncate"
                        title={header !== null && header !== undefined ? String(header) : `Column ${index + 1}`}
                      >
                        {header !== null && header !== undefined ? String(header) : `Column ${index + 1}`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {current.data.slice(1).map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                        style={{ minWidth: "150px", maxWidth: "400px" }}
                        title={cell !== null && cell !== undefined ? String(cell) : ""}
                      >
                        <div className="truncate">
                          {cell !== null && cell !== undefined ? String(cell) : ""}
                        </div>
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
              This sheet appears to be empty.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
