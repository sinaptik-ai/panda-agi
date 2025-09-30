import { useState, useCallback, useEffect } from 'react';
import { cleanupModalOverlays } from '@/lib/utils/modal-cleanup';

interface UseModalStateReturn {
  isOpen: boolean;
  isLoading: boolean;
  open: () => void;
  close: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Custom hook for managing modal state with proper cleanup
 */
export const useModalState = (onClose?: () => void): UseModalStateReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsLoading(false);
    setIsOpen(false);
    cleanupModalOverlays();
    onClose?.();
  }, [onClose]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isOpen) {
        cleanupModalOverlays(0);
      }
    };
  }, [isOpen]);

  return {
    isOpen,
    isLoading,
    open,
    close,
    setLoading,
  };
};