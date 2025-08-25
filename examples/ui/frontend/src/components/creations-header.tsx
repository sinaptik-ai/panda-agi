import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import UserMenu from "@/components/user-menu";

interface CreationsHeaderProps {
  onUpgradeClick: () => void;
}

const CreationsHeader: React.FC<CreationsHeaderProps> = ({ onUpgradeClick }) => {
  const router = useRouter();

  return (
    <div className="glass-header p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-xl bg-white/80">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-2xl select-none">🐼</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              My Creations
            </h1>
            <p className="text-sm text-gray-500">
              View and manage your saved creations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Back to Chat Button */}
          <Button
            variant="outline"
            onClick={() => router.push('/chat')}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </Button>

          {/* User Menu Dropdown */}
          <UserMenu onUpgradeClick={onUpgradeClick} />
        </div>
      </div>
    </div>
  );
};

export default CreationsHeader; 