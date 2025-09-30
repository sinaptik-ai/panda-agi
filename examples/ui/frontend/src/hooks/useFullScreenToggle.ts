import { useState, useCallback } from 'react';

interface UseFullScreenToggleProps {
  initialWidth?: number;
  onResize?: (width: number) => void;
}

interface UseFullScreenToggleReturn {
  isFullMode: boolean;
  toggleFullMode: () => void;
  currentWidth: number;
}

/**
 * Custom hook for managing full-screen toggle functionality
 * Remembers previous width and handles smooth transitions
 */
export const useFullScreenToggle = ({
  initialWidth = 900,
  onResize,
}: UseFullScreenToggleProps = {}): UseFullScreenToggleReturn => {
  const [isFullMode, setIsFullMode] = useState(false);
  const [previousWidth, setPreviousWidth] = useState<number>(initialWidth);
  const [currentWidth, setCurrentWidth] = useState<number>(initialWidth);

  const toggleFullMode = useCallback(() => {
    const newFullMode = !isFullMode;
    setIsFullMode(newFullMode);
    
    let newWidth: number;
    
    if (newFullMode) {
      // Going to full mode: store current width and expand
      setPreviousWidth(currentWidth);
      newWidth = window.innerWidth;
    } else {
      // Exiting full mode: restore previous width
      newWidth = previousWidth;
    }
    
    setCurrentWidth(newWidth);
    onResize?.(newWidth);
  }, [isFullMode, currentWidth, previousWidth, onResize]);

  return {
    isFullMode,
    toggleFullMode,
    currentWidth,
  };
};