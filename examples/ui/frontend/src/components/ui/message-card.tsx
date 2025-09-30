import React from "react";

interface MessageCardProps {
  content: React.ReactNode;
  color?: string;
  timestamp?: string;
}

const MessageCard: React.FC<MessageCardProps> = ({ content, color = "bg-white/90 border-slate-200/50", timestamp }) => {
  return (
    <div className="flex justify-start mb-2">
      <div className={`px-4 py-3 rounded-2xl shadow-sm min-w-80 max-w-2xl ${color} relative`}>
        {content}
      </div>
    </div>
  );
};

export default MessageCard;
