import React from "react";

export interface GridViewItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
  titleClassName?: string;
}

interface GridViewProps {
  items: GridViewItem[];
  className?: string;
}

export const GridView: React.FC<GridViewProps> = ({ items, className }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto ${className ?? ""}`}>
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={item.onClick}
          className={
            item.className ??
            "bg-white/70 backdrop-blur-sm hover:bg-white/90 border border-slate-200/60 rounded-xl p-4 text-left transition-all hover:shadow-md hover:border-slate-300/60"
          }
        >
          <h4
            className={
              item.titleClassName ??
              "font-medium text-blue-600 mb-2 flex items-center"
            }
          >
            {item.icon}
            {item.title}
          </h4>
          <p className="text-sm text-slate-600">{item.description}</p>
        </button>
      ))}
    </div>
  );
}; 