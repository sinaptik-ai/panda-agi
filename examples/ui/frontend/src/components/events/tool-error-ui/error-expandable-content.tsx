import React from "react";

interface ErrorExpandableContentProps {
  isExpanded: boolean;
  children: React.ReactNode;
}

const ErrorExpandableContent: React.FC<ErrorExpandableContentProps> = ({ 
  isExpanded, 
  children 
}) => {
  return (
    <div
      className={`grid transition-all duration-300 ease-in-out ${
        isExpanded
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div className="mx-3 mb-4 bg-slate-900 text-white rounded-xl overflow-hidden shadow-sm border border-orange-200/20">
          <div className="p-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorExpandableContent; 