/**
 * Reset Data Section
 * Handles clearing all application data and cache
 */

import { useState } from "react";
import dataService from "../../services/dataService";
import mediaCacheService from "../../services/mediaCache";
import logger from "../../utils/logger";

const ResetDataSection = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");

  // Reset all data
  const handleResetData = () => {
    try {
      // Clear all data
      dataService.resetAll();

      // Clear media cache
      mediaCacheService.clearAllCache();

      setResetSuccess("All data has been reset! Page will reload...");
      setShowResetConfirm(false);

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      logger.error("Reset failed:", error);
      alert("Failed to reset data: " + error.message);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Reset Data
      </h2>

      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Warning:</strong> This will delete all your settings, views,
            and cached media. This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-center">
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reset All Data
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-900 dark:text-white font-medium">
                Are you absolutely sure? This will delete everything!
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleResetData}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Yes, Reset Everything
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {resetSuccess && (
          <div className="p-3 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            {resetSuccess}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetDataSection;
