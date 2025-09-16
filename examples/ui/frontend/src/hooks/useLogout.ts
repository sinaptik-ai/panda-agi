"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { notifyAuthChange } from "./useAuth";
import { useGlobalModals } from "@/contexts/global-modals-context";

// Global state for logout modal
let globalShowLogoutModal = false;
const globalSetters: Set<(show: boolean) => void> = new Set();

// Global function to reset conversation state
let globalResetConversation: (() => void) | null = null;

function setGlobalLogoutModal(show: boolean) {
  globalShowLogoutModal = show;
  globalSetters.forEach(setter => setter(show));
}

// Function to set the global reset conversation function
export function setGlobalResetConversation(resetFn: (() => void) | null) {
  globalResetConversation = resetFn;
}

export function useLogout() {
  const [showLogoutModal, setShowLogoutModal] = useState(globalShowLogoutModal);
  const router = useRouter();
  const { showLoginModal } = useGlobalModals();

  useEffect(() => {
    // Register this component's setter
    globalSetters.add(setShowLogoutModal);
    
    // Cleanup
    return () => {
      globalSetters.delete(setShowLogoutModal);
    };
  }, []);

  const handleShowLogout = useCallback(() => {
    setGlobalLogoutModal(true);
  }, []);

  const handleLogoutCancel = useCallback(() => {
    setGlobalLogoutModal(false);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    logout();
    // Notify all components about auth change
    notifyAuthChange();
    setGlobalLogoutModal(false);
    
    // Reset conversation state before redirect
    if (globalResetConversation) {
      globalResetConversation();
    }
    
    // Redirect to home page after logout
    router.push("/");
    // Open login modal after successful logout
    showLoginModal();
  }, [router, showLoginModal]);

  return {
    showLogoutModal,
    handleShowLogout,
    handleLogoutCancel,
    handleLogoutConfirm,
  };
}