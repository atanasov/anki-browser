/**
 * Toast
 * Lightweight floating notification. Rendered once in App.jsx.
 * Triggered via useToast() hook anywhere in the tree.
 */

import { useEffect } from "react";
import useToastStore from "../../store/toastStore";

const ICONS = {
  success: (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  ),
};

const ToastItem = ({ id, message, type }) => {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const t = setTimeout(() => dismiss(id), 3000);
    return () => clearTimeout(t);
  }, [id, dismiss]);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-up ${
        type === "error"
          ? "bg-red-600 text-white"
          : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
      }`}
      role="alert"
    >
      {ICONS[type] || ICONS.success}
      <span>{message}</span>
      <button
        onClick={() => dismiss(id)}
        className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  );
};

const Toast = () => {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} />
        </div>
      ))}
    </div>
  );
};

export default Toast;
