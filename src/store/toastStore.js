/**
 * Toast Store
 * Minimal Zustand store for transient toast notifications.
 * Separate from the main store to avoid re-rendering the whole tree.
 */

import { create } from "zustand";

const useToastStore = create((set) => ({
  toasts: [],

  show: (message, type = "success") =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, type }],
    })),

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export default useToastStore;

// Convenience helper — call toast.show() / toast.error() outside React components
export const toast = {
  show: (msg) => useToastStore.getState().show(msg, "success"),
  error: (msg) => useToastStore.getState().show(msg, "error"),
};
