"use client";

import { Toaster } from "react-hot-toast";
import LogoutModal from "@/components/logout-modal";
import { useLogout } from "@/hooks/useLogout";
import { GlobalModalsProvider } from "@/contexts/global-modals-context";
import { useEffect } from "react";
import { initializePostHog } from "@/lib/api/posthog";



function ClientLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initializePostHog();
  }, []);
  const { showLogoutModal, handleLogoutCancel, handleLogoutConfirm } = useLogout();

  return (
    <>
      <div className="min-h-screen bg-background">
        {children}
      </div>
      
      {/* Global Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            style: {
              background: "#10b981",
            },
          },
          error: {
            duration: 3000,
            style: {
              background: "#fff",
              color: "#000",
            },
          },
        }}
      />
    </>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GlobalModalsProvider>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </GlobalModalsProvider>
  );
}