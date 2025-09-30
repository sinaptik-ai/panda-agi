"use client";

import { useState, useEffect, useCallback } from "react";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";

// Custom hook for managing authentication state
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(() => {
    const authenticated = !isAuthRequired() || !!getAccessToken();
    setIsAuthenticated(authenticated);
    setIsLoading(false);
    return authenticated;
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuth();
    };

    // Add global listener
    if (typeof window !== "undefined") {
      window.addEventListener("authChange", handleAuthChange);

      // Cleanup
      return () => {
        window.removeEventListener("authChange", handleAuthChange);
      };
    }
  }, [checkAuth]);

  // Function to manually refresh auth state (useful after login/logout)
  const refreshAuth = useCallback(() => {
    return checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    isLoading,
    refreshAuth,
  };
}

// Function to notify all components about auth changes
export function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("authChange"));
  }
}
