"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  LogOut,
  Crown,
} from "lucide-react";
import ContentSidebar, { PreviewData } from "@/components/content-sidebar";
import { getAccessToken, isAuthRequired, logout } from "@/lib/api/auth";
import UpgradeModal from "@/components/upgrade-modal";
import { useSearchParams } from "next/navigation";
import { PLATFORM_MODE } from "@/lib/config";
import ChatBox from "@/components/chatbox";
import { getFileType } from "@/lib/utils";

function ChatApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(900); // Default sidebar width (match initial in ContentSidebar)
  const [previewData, setPreviewData] = useState<PreviewData>();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Handle URL parameters for upgrade modal
  useEffect(() => {
    const upgradeParam = searchParams.get('upgrade');
    if (upgradeParam === 'open') {
      setShowUpgradeModal(true);
    }
  }, [searchParams]);

  const handlePreviewClick = (data: PreviewData) => {
    setPreviewData(data);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setPreviewData(undefined);
  };

  // Function to open file in sidebar - content fetching is handled by ContentSidebar
  const handleFileClick = (filename: string) => {
    const fileType = getFileType(filename);

    setPreviewData({
      filename: filename,
      title: `File: ${filename.split("/").pop()}`,
      type: fileType,
    });
    setSidebarOpen(true);
  };

  const startNewConversation = () => {
    setConversationId(undefined);
    setSidebarOpen(false);
    setPreviewData(undefined);
  };

  // Authentication check - placed after all hooks to follow Rules of Hooks
  useEffect(() => {
    // Check if authentication is required
    if (isAuthRequired()) {
      // Check if user is authenticated
      const token = getAccessToken();
      
      if (!token) {
        // User is not authenticated, redirect to login
        router.push("/login");
        return;
      }
    }
    
    // User is authenticated or auth is not required
    setIsAuthenticating(false);
  }, [router]);

  // Listen for messages from iframe content to open URLs in sidebar
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_IN_SIDEBAR') {
        const { url, title } = event.data;
        setPreviewData({
          url: url,
          content: "",
          title: title || `External: ${url}`,
          type: "iframe",
        });
        setSidebarOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Don't render the chat if still checking authentication
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 relative mb-4 mx-auto">
            <span className="text-4xl select-none absolute inset-0 flex items-center justify-center">
              🐼
            </span>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Checking authentication status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Main content */}
      <div
        className="flex flex-col transition-all duration-300 w-full"
        style={{
          width: sidebarOpen ? `calc(100% - ${sidebarWidth}px)` : "100%",
        }}
      >
        {/* Header - positioned absolutely over content */}
        <div
          className="glass-header p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-xl bg-white/80"
          style={{
            width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
          }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-2xl select-none">🐼</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  PandaAGI
                </h1>
                <p className="text-sm text-gray-500">
                  {isConnected ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    "Ready to help"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* New Conversation Button */}
              <button
                onClick={startNewConversation}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>

              {/* Upgrade Button */}
              { PLATFORM_MODE && <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  title="Upgrade Subscription"
                >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade</span>
                </button>
               }

              {/* Logout Button - only show if authentication is required */}
              {isAuthRequired() && (
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ChatBox Component */}
        <ChatBox
          conversationId={conversationId}
          setConversationId={setConversationId}
          onPreviewClick={handlePreviewClick}
          onFileClick={handleFileClick}
          openUpgradeModal={() => setShowUpgradeModal(true)}
          isConnected={isConnected}
          setIsConnected={setIsConnected}
          sidebarOpen={sidebarOpen}
          sidebarWidth={sidebarWidth}
        />
      </div>

      {/* Sidebar */}
      <ContentSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        previewData={previewData}
        conversationId={conversationId}
        width={sidebarWidth}
        onResize={setSidebarWidth}
      />

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 relative mb-4 mx-auto">
            <span className="text-4xl select-none absolute inset-0 flex items-center justify-center">
              🐼
            </span>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Loading chat interface</p>
        </div>
      </div>
    }>
      <ChatApp />
    </Suspense>
  );
}
