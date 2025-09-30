import { useState, useEffect, useRef, useCallback } from "react";

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

export function useInactivityTimer() {
  const [showInactivityPopup, setShowInactivityPopup] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setShowInactivityPopup(true);
    }, INACTIVITY_TIMEOUT);
  }, []);

  const trackUserMessage = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Initialize timer on mount
  useEffect(() => {
    resetTimer();

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  return {
    showInactivityPopup,
    setShowInactivityPopup,
    trackUserMessage,
  };
} 