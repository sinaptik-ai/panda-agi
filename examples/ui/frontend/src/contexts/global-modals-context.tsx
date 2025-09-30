"use client";

import { useState, Suspense, createContext, useContext } from "react";
import LoginModal from "@/components/login-modal";
import UpgradeModal from "@/components/upgrade-modal";

// Create context for global modals
interface GlobalModalsContextType {
  showUpgradeModal: () => void;
  showLoginModal: () => void;
}

const GlobalModalsContext = createContext<GlobalModalsContextType | null>(null);

export const useGlobalModals = () => {
  const context = useContext(GlobalModalsContext);
  if (!context) {
    throw new Error("useGlobalModals must be used within GlobalModalsProvider");
  }
  return context;
};

interface GlobalModalsProviderProps {
  children: React.ReactNode;
}

export function GlobalModalsProvider({ children }: GlobalModalsProviderProps) {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const globalModalsValue = {
    showUpgradeModal: () => setIsUpgradeModalOpen(true),
    showLoginModal: () => setIsLoginModalOpen(true),
  };

  return (
    <GlobalModalsContext.Provider value={globalModalsValue}>
      {children}

      {/* Global Upgrade Modal */}
      <Suspense fallback={null}>
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onShowLogin={() => {
            setIsUpgradeModalOpen(false);
            setIsLoginModalOpen(true);
          }}
        />
      </Suspense>

      {/* Global Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </GlobalModalsContext.Provider>
  );
}
