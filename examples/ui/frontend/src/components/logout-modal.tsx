"use client";

import { X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Log out?
            </h3>
            <p className="text-sm text-gray-500">
              Are you sure you want to log out?
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="destructive"
              className="flex-1"
            >
              Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}