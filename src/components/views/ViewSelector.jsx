/**
 * View Selector Component
 * Dropdown for selecting the active view on the homepage
 */

import { useState, useRef, useEffect } from "react";
import useStore from "../../store";

const ViewSelector = ({
  onViewChange,
  onNewView,
  onEditView,
  onDeleteView,
  compact = false, // Compact mode for header
}) => {
  const views = useStore((state) => state.views || []);
  const activeViewId = useStore((state) => state.settings?.activeViewId);
  const getView = useStore((state) => state.getView);
  const activeView = activeViewId ? getView(activeViewId) : null;
  const setActiveView = useStore((state) => state.setActiveView);
  const deleteView = useStore((state) => state.deleteView);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleViewSelect = (viewId) => {
    setActiveView(viewId);
    setIsOpen(false);
    if (onViewChange) {
      onViewChange(viewId);
    }
  };

  const handleDeleteView = (e, view) => {
    e.stopPropagation();

    if (
      window.confirm(
        `Are you sure you want to delete the view "${view.name}"? This cannot be undone.`
      )
    ) {
      deleteView(view.id);

      if (onDeleteView) {
        onDeleteView(view.id);
      }
    }
  };

  const getActiveViewName = () => {
    if (!activeView) return "No View Selected";
    return activeView.name || "Unknown View";
  };

  if (views.length === 0) {
    return (
      <div className="flex items-center gap-3">
        {!compact && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No views yet
          </div>
        )}
        <button
          onClick={onNewView}
          className={`${
            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          } bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium`}
        >
          + {compact ? "New View" : "Create Your First View"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* View Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center ${
          compact ? "gap-2 px-3 py-1.5" : "gap-3 px-4 py-2"
        } bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200`}
      >
        <div className="flex items-center gap-2">
          <div className="text-left">
            <div
              className={`${
                compact ? "text-xs" : "text-sm"
              } font-medium text-gray-900 dark:text-gray-100 ${
                compact ? "max-w-[120px] truncate" : ""
              }`}
            >
              {getActiveViewName()}
            </div>
            {activeView && !compact && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {activeView.deck}
              </div>
            )}
          </div>
        </div>
        <svg
          className={`${
            compact ? "w-3 h-3" : "w-4 h-4"
          } text-gray-500 transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2">
            {/* View List */}
            <div className="max-h-64 overflow-y-auto">
              {views.map((view) => (
                <div
                  key={view.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ${
                    activeView?.id === view.id
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <button
                    onClick={() => handleViewSelect(view.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium truncate ${
                          activeView?.id === view.id
                            ? "text-blue-900 dark:text-blue-100"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {view.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {view.deck}
                      </div>
                    </div>
                  </button>
                  <div className="flex gap-1">
                    {onEditView && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onEditView(view);
                        }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                        title="Edit view"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteView(e, view)}
                      className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                      title="Delete view"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNewView();
                }}
                className="w-full px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 font-medium"
              >
                + New View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewSelector;
