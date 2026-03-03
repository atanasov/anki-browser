/**
 * useFocusTrap Hook
 * Traps focus within a container (for modals, dropdowns)
 * Automatically focuses first element and cycles through focusable elements
 * Restores focus to previous element when deactivated
 */

import { useEffect, useRef } from "react";

/**
 * Hook to trap focus within a container
 * @param {boolean} isActive - Whether focus trap is active
 * @returns {Object} - Ref to attach to container element
 *
 * Example usage:
 * const trapRef = useFocusTrap(isOpen);
 * return <div ref={trapRef}>...</div>
 */
export function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Save currently focused element
    previousFocusRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = container.querySelectorAll(focusableSelector);

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element after a small delay to ensure DOM is ready
    setTimeout(() => {
      if (firstElement && firstElement.focus) {
        firstElement.focus();
      }
    }, 10);

    // Handle Tab key to cycle through focusable elements
    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;

      // Get current focusable elements (in case DOM changed)
      const currentFocusable = container.querySelectorAll(focusableSelector);
      const currentFirst = currentFocusable[0];
      const currentLast = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: Move backwards
        if (document.activeElement === currentFirst) {
          e.preventDefault();
          currentLast?.focus();
        }
      } else {
        // Tab: Move forwards
        if (document.activeElement === currentLast) {
          e.preventDefault();
          currentFirst?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      container.removeEventListener("keydown", handleKeyDown);

      // Restore focus to previous element
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        try {
          previousFocusRef.current.focus();
        } catch (error) {
          // Element might not be focusable anymore, ignore error
        }
      }
    };
  }, [isActive]);

  return containerRef;
}

