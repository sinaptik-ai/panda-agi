import React from "react";
import { X, Database, Download } from "lucide-react";
import CSVViewer from "./csv-viewer";

interface CSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  content: string;
}

const CSVModal: React.FC<CSVModalProps> = ({
  isOpen,
  onClose,
  filename,
  content,
}) => {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-slate-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 truncate">{filename}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto h-full">
          <CSVViewer
            content={content}
            filename={filename}
            className="min-h-full"
            showHeader={true}
            maxHeight=""
          />
        </div>
      </div>
    </div>
  );
};

export default CSVModal;