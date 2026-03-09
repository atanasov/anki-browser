/**
 * SettingsMenu
 * Compact inline settings panel for the header cog dropdown.
 * Combines display scale, AnkiConnect config, backup/restore, and data reset.
 */

import { useState, useEffect, useRef } from "react";
import dataService from "../../services/dataService";
import ankiConnect from "../../services/ankiConnect";
import mediaCacheService from "../../services/mediaCache";
import uiScaleService, { UI_SCALE_OPTIONS } from "../../services/uiScaleService";
import useStore from "../../store";
import { toast } from "../../store/toastStore";
import { getFontSizeOptions } from "../../utils/fontSizeHelpers";
import logger from "../../utils/logger";

// Practice font size maps to adaptiveFont maxIndex in PracticeSession
const PRACTICE_SIZE_OPTIONS = [
  { value: "small",   label: "S"  },
  { value: "medium",  label: "M"  },
  { value: "large",   label: "L"  },
  { value: "xlarge",  label: "XL" },
  { value: "xxlarge", label: "2XL"},
];

const SettingsMenu = () => {
  // AnkiConnect
  const [ankiUrl, setAnkiUrl] = useState("");
  const [ankiToken, setAnkiToken] = useState("");
  const [connStatus, setConnStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Display
  const updateSettings = useStore((s) => s.updateSettings);
  const practiceFontSize = useStore((s) => s.settings?.practiceFontSize || "xlarge");
  const [uiScale, setUiScaleState] = useState(() => uiScaleService.getScale());

  // Backup / restore
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const fileInputRef = useRef(null);
  const [pendingImport, setPendingImport] = useState(null);

  // Reset
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    setAnkiUrl(dataService.getSetting("ankiConnectUrl", "http://localhost:8765"));
    setAnkiToken(dataService.getSetting("ankiConnectToken", ""));
  }, []);

  const handleSetUiScale = (scale) => {
    setUiScaleState(scale);
    uiScaleService.setScale(scale);
    updateSettings({ uiScale: scale });
  };

  const testConnection = async () => {
    setIsTesting(true);
    setConnStatus(null);
    try {
      const version = await ankiConnect.version();
      setConnStatus({ ok: true, msg: `Connected! AnkiConnect v${version}` });
    } catch {
      setConnStatus({ ok: false, msg: "Connection failed — is Anki running?" });
    } finally {
      setIsTesting(false);
    }
  };

  const saveAnkiSettings = () => {
    dataService.setAnkiConnectUrl(ankiUrl);
    dataService.setAnkiConnectToken(ankiToken);
    setConnStatus({ ok: true, msg: "Saved!" });
    setTimeout(() => setConnStatus(null), 2000);
  };

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        JSON.parse(ev.target.result);
        setPendingImport({ filename: file.name, jsonString: ev.target.result });
      } catch {
        toast.error("Invalid file — not valid JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = (overwrite) => {
    if (!pendingImport) return;
    const success = importData(pendingImport.jsonString, overwrite);
    if (success) {
      toast.show(overwrite ? "Restored — reloading…" : "Views merged");
      setPendingImport(null);
      if (overwrite) setTimeout(() => window.location.reload(), 1500);
    } else {
      toast.error("Import failed — file may be corrupted");
      setPendingImport(null);
    }
  };

  const handleReset = () => {
    try {
      dataService.resetAll();
      mediaCacheService.clearAllCache();
      setShowReset(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      logger.error("Reset failed:", err);
    }
  };

  const inp = "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const lbl = "block text-sm text-gray-500 dark:text-gray-400 mb-0.5";
  const btnBlue = "px-3 py-1.5 text-sm font-medium rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50";
  const btnGreen = "px-3 py-1.5 text-sm font-medium rounded bg-green-600 hover:bg-green-700 text-white transition-colors";
  const btnGray = "px-3 py-1.5 text-sm font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors";
  const btnRed = "px-3 py-1.5 text-sm font-medium rounded bg-red-600 hover:bg-red-700 text-white transition-colors";
  const divider = <div className="border-t border-gray-100 dark:border-gray-700" />;
  const sectionTitle = "text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2";

  return (
    <div className="px-3 py-2 space-y-3 max-h-[80vh] overflow-y-auto">

      {/* Display */}
      <div>
        <p className={sectionTitle}>Display</p>
        <div className="space-y-3">

          {/* UI Scale */}
          <div>
            <label className={lbl}>UI Scale</label>
            <div className="flex gap-1 flex-wrap">
              {UI_SCALE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleSetUiScale(value)}
                  className={`px-2.5 py-1 text-sm rounded font-medium transition-colors ${
                    uiScale === value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Practice Size */}
          <div>
            <label className={lbl}>Practice Q&A Size</label>
            <div className="flex gap-1">
              {PRACTICE_SIZE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ practiceFontSize: value })}
                  className={`px-2.5 py-1 text-sm rounded font-medium transition-colors ${
                    practiceFontSize === value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {divider}

      {/* AnkiConnect */}
      <div>
        <p className={sectionTitle}>AnkiConnect</p>
        <div className="space-y-2">
          <div>
            <label className={lbl}>URL</label>
            <input className={inp} value={ankiUrl} onChange={(e) => setAnkiUrl(e.target.value)} placeholder="http://localhost:8765" />
          </div>
          <div>
            <label className={lbl}>API Token (optional)</label>
            <input className={inp} value={ankiToken} onChange={(e) => setAnkiToken(e.target.value)} placeholder="Leave empty if not used" />
          </div>
          <div className="flex gap-2">
            <button onClick={testConnection} disabled={isTesting} className={btnBlue}>{isTesting ? "Testing…" : "Test"}</button>
            <button onClick={saveAnkiSettings} className={btnGreen}>Save</button>
          </div>
          {connStatus && (
            <p className={`text-sm ${connStatus.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {connStatus.msg}
            </p>
          )}
        </div>
      </div>

      {divider}

      {/* Backup & Restore */}
      <div>
        <p className={sectionTitle}>Backup & Restore</p>
        {!pendingImport ? (
          <div className="flex gap-2">
            <button onClick={handleExport} className={btnBlue}>↓ Export</button>
            <button onClick={() => fileInputRef.current?.click()} className={btnGray}>↑ Import</button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-blue-700 dark:text-blue-300 truncate">File: {pendingImport.filename}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">How should this be imported?</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleConfirmImport(false)} className={btnGray}>Merge views</button>
              <button onClick={() => handleConfirmImport(true)} className={btnRed}>Overwrite all</button>
              <button onClick={() => setPendingImport(null)} className={btnGray}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {divider}

      {/* Reset */}
      <div>
        <p className={sectionTitle}>Reset Data</p>
        {!showReset ? (
          <button onClick={() => setShowReset(true)} className={btnRed}>Reset All Data</button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              This deletes all views, settings, and cache. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={handleReset} className={btnRed}>Yes, reset</button>
              <button onClick={() => setShowReset(false)} className={btnGray}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {divider}

      <a
        href="https://github.com/atanasov/anki-browser"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        View on GitHub
      </a>
    </div>
  );
};

export default SettingsMenu;
