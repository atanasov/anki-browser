/**
 * AnkiConnect Settings Section
 * Handles AnkiConnect URL and token configuration with connection testing
 */

import { useState, useEffect } from "react";
import dataService from "../../services/dataService";
import ankiConnect from "../../services/ankiConnect";
import FormInput from "../common/FormInput";

const AnkiConnectSection = () => {
  const [ankiConnectUrl, setAnkiConnectUrl] = useState("");
  const [ankiConnectToken, setAnkiConnectToken] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Load settings on mount
  useEffect(() => {
    setAnkiConnectUrl(
      dataService.getSetting("ankiConnectUrl", "http://localhost:8765")
    );
    setAnkiConnectToken(dataService.getSetting("ankiConnectToken", ""));
  }, []);

  // Test AnkiConnect connection
  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    try {
      const version = await ankiConnect.version();
      if (version) {
        setConnectionStatus({
          success: true,
          message: `Connected! AnkiConnect version: ${version}`,
        });
      } else {
        setConnectionStatus({
          success: false,
          message: "Connection failed: No version returned",
        });
      }
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: `Connection failed: Check if Anki is running and AnkiConnect is installed. (Error message: ${error.message})`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Save AnkiConnect settings
  const saveSettings = () => {
    dataService.setAnkiConnectUrl(ankiConnectUrl);
    dataService.setAnkiConnectToken(ankiConnectToken);
    setConnectionStatus({
      success: true,
      message: "Settings saved successfully!",
    });
    setTimeout(() => setConnectionStatus(null), 3000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        AnkiConnect Configuration
      </h2>

      <div className="space-y-4">
        <div className="space-y-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <FormInput
              id="ankiConnectUrl"
              label="AnkiConnect URL"
              type="text"
              value={ankiConnectUrl}
              onChange={(e) => setAnkiConnectUrl(e.target.value)}
              placeholder="http://localhost:8765"
              required
              className="w-full md:w-1/2"
            />

            <FormInput
              id="ankiConnectToken"
              label="AnkiConnect API Token (optional)"
              type="text"
              value={ankiConnectToken}
              onChange={(e) => setAnkiConnectToken(e.target.value)}
              placeholder="Leave empty if not using authentication"
              className="w-full md:w-1/2"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={testConnection}
            disabled={isTestingConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isTestingConnection ? "Testing..." : "Test Connection"}
          </button>

          <button
            onClick={saveSettings}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save Settings
          </button>
        </div>

        {connectionStatus && (
          <div
            className={`p-3 rounded ${
              connectionStatus.success
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
            }`}
          >
            {connectionStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnkiConnectSection;
