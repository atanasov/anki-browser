/**
 * Settings Page
 * Centralized settings page with organized sections
 */

import AnkiConnectSection from "../components/settings/AnkiConnectSection";
import ImportExportSection from "../components/settings/ImportExportSection";
import ResetDataSection from "../components/settings/ResetDataSection";

const SettingsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        Settings
      </h1>

      <div className="space-y-6">
        <AnkiConnectSection />
        <ImportExportSection />
        <ResetDataSection />
      </div>
    </div>
  );
};

export default SettingsPage;
