"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getAuthUrl } from "@/lib/api/auth";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    try {
      const authUrl = await getAuthUrl("github");
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(
          "Failed to fetch GitHub authentication URL, try again later"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const authUrl = await getAuthUrl("google");
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(
          "Failed to fetch Google authentication URL, try again later"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 mb-3 relative">
              <span className="text-4xl select-none absolute inset-0 flex items-center justify-center">
                🐼
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Welcome to Panda AGI
            </h2>
            <p className="text-gray-600 text-center mt-2">
              Please log in to continue
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-3">
          <Button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            variant="github"
            size="auth"
            className="w-full flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.22.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.4-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.63.7 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.67.91.67 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z"
                clipRule="evenodd"
              />
            </svg>
            {isLoading ? "Connecting..." : "Continue with GitHub"}
          </Button>

          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            variant="google"
            size="auth"
            className="w-full flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-3"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isLoading ? "Connecting..." : "Continue with Google"}
          </Button>

          {/* Terms and Privacy Policy */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to our{" "}
              <a
                href="https://sinaptik.notion.site/Terms-of-Service-6531411a9dfe4f1b9cb6045e93e9723c?pvs=74"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://sinaptik.notion.site/Datenschutzrichtlinie-012906dd21f14443971247291fdbc474?pvs=74"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
