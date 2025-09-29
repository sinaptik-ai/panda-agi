import React from "react";
import CSVViewer from "@/components/ui/csv-viewer";

interface ContentSidebarTableProps {
  content: string;
  filename: string;
}

const ContentSidebarTable: React.FC<ContentSidebarTableProps> = ({
  content,
  filename,
}) => {
  return (
    <CSVViewer
      content={content}
      filename={filename}
      className="h-full"
      showHeader={true}
      maxHeight="h-full"
    />
  );
};

export default ContentSidebarTable;
