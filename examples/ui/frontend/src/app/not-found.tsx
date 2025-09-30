"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <span className="text-5xl select-none opacity-50">🐼</span>
          </div>

          <div className="mb-6">
            <h1 className="text-9xl font-light text-gray-200 mb-4">404</h1>
            <h2 className="text-2xl font-medium text-gray-800 mb-3">
              Page not found
            </h2>
            <p className="text-gray-600 leading-relaxed">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={() => router.push("/")}
            className="bg-gray-900 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
