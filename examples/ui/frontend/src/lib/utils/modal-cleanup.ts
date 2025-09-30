/**
 * Utility to clean up any lingering modal overlays from Radix UI
 * This prevents UI blocking issues after modal closure
 */
export const cleanupModalOverlays = (delay: number = 100): void => {
  setTimeout(() => {
    // Remove any lingering Radix UI overlays
    const overlays = document.querySelectorAll('[data-radix-popper-content-wrapper]');
    overlays.forEach(overlay => overlay.remove());
    
    const backdrops = document.querySelectorAll('[data-radix-dialog-overlay]');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Reset body styles that might be set by modals
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    
    // Also check for any other modal-related classes that might be stuck
    document.body.classList.remove('overflow-hidden');
  }, delay);
};