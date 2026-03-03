/**
 * ImportExportSection
 * Backup and restore all app data (views + settings) as a JSON file.
 */

import { useRef, useState } from "react";
import useStore from "../../store";
import { toast } from "../../store/toastStore";
import logger from "../../utils/logger";

const ImportExportSection = () => {
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);

  const fileInputRef = useRef(null);
  const [pendingImport, setPendingImport] = useState(null); // { filename, jsonString }

  // --- Export ---
  const handleExport = () => {
    try {
      const json = exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `anki-browser-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show("Backup downloaded");
    } catch (err) {
      logger.error("Export failed:", err);
      toast.error("Export failed");
    }
  };

  // --- Import: step 1 — read file ---
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        JSON.parse(ev.target.result); // validate JSON before showing confirm
        setPendingImport({ filename: file.name, jsonString: ev.target.result });
      } catch {
        toast.error("Invalid file — not valid JSON");
      }
    };
    reader.readAsText(file);
  };

  // --- Import: step 2 — confirm with overwrite or merge ---
  const handleConfirmImport = (overwrite) => {
    if (!pendingImport) return;
    const success = importData(pendingImport.jsonString, overwrite);
    if (success) {
      toast.show(overwrite ? "Data restored — page will reload" : "Views merged successfully");
      setPendingImport(null);
      if (overwrite) setTimeout(() => window.location.reload(), 1500);
    } else {
      toast.error("Import failed — file may be corrupted");
      setPendingImport(null);
    }
  };

  const sectionCard = "bg-white dark:bg-gray-800 rounded-lg shadow p-6";
  const btnPrimary = "px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors";
  const btnGray = "px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors";

  return (
    <div className={sectionCard}>
      <h2 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">
        Backup & Restore
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Export all your views and settings as a JSON file, or restore from a previous backup.
      </p>

      {!pendingImport ? (
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className={btnPrimary}>
            ↓ Export Backup
          </button>
          <button onClick={() => fileInputRef.current?.click()} className={btnGray}>
            ↑ Import Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
            File ready: <span className="font-medium">{pendingImport.filename}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">How should this be imported?</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleConfirmImport(false)} className={btnGray}>
              Merge Views
              <span className="block text-xs font-normal opacity-70">Add views from file, keep existing</span>
            </button>
            <button onClick={() => handleConfirmImport(true)} className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">
              Overwrite Everything
              <span className="block text-xs font-normal opacity-80">Replace all data with file contents</span>
            </button>
            <button onClick={() => setPendingImport(null)} className={btnGray}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExportSection;
