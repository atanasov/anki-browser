/**
 * Header Component
 * Sticky app header: logo, view selector, search, edit mode toggle, global controls.
 */

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./common/ThemeToggle";
import Dropdown from "./common/Dropdown";
import ViewSelector from "./views/ViewSelector";
import ViewEditorModal from "./views/ViewEditorModal";
import DisplayControl from "./common/DisplayControl";
import SettingsMenu from "./settings/SettingsMenu";
import SavedWordsPanel from "./common/SavedWordsPanel";
import FiltersDropdown from "./browser/FiltersDropdown";
import useStore from "../store";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState(null);

  const activeViewId = useStore((state) => state.settings.activeViewId);
  const getView = useStore((state) => state.getView);
  const setActiveView = useStore((state) => state.setActiveView);
  const editMode = useStore((state) => state.editMode);
  const toggleEditMode = useStore((state) => state.toggleEditMode);
  const practiceMode = useStore((state) => state.practiceMode);
  const togglePracticeMode = useStore((state) => state.togglePracticeMode);
  const searchQuery = useStore((state) => state.searchQuery);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const weakFilter = useStore((state) => state.weakFilter);
  const toggleWeakFilter = useStore((state) => state.toggleWeakFilter);
  const weakCount = useStore((state) => state.weakCount);

  const activeView = activeViewId ? getView(activeViewId) : null;
  const searchRef = useRef(null);

  const [installPrompt, setInstallPrompt] = useState(() => window.__pwaInstallPrompt ?? null);
  const [showInstallTip, setShowInstallTip] = useState(false);
  const installTipRef = useRef(null);

  useEffect(() => {
    const onReady = () => setInstallPrompt(window.__pwaInstallPrompt);
    window.addEventListener("pwainstallready", onReady);
    return () => window.removeEventListener("pwainstallready", onReady);
  }, []);

  useEffect(() => {
    if (!showInstallTip) return;
    const h = (e) => { if (installTipRef.current && !installTipRef.current.contains(e.target)) setShowInstallTip(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showInstallTip]);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      window.__pwaInstallPrompt = null;
    } else {
      setShowInstallTip((v) => !v);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">

            {/* Left: logo */}
            <h1
              onClick={() => navigate("/")}
              className="text-lg font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/"); } }}
              aria-label="Go to home page"
            >
              Anki Browser
            </h1>

            {/* Center: view selector + search + edit toggle (homepage only) */}
            {isHomePage && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ViewSelector
                  onViewChange={setActiveView}
                  onNewView={() => { setViewToEdit(null); setIsViewModalOpen(true); }}
                  onEditView={(view) => { setViewToEdit(view); setIsViewModalOpen(true); }}
                  compact={true}
                />

                {activeView && !editMode && !practiceMode && (
                  <div className="relative flex-1 min-w-0 max-w-xs">
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); searchRef.current?.blur(); } }}
                      placeholder="Search cards…"
                      className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
                    </svg>
                    {searchQuery && (
                      <button
                        onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label="Clear search"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {activeView && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {weakCount > 0 && (
                      <button
                        onClick={toggleWeakFilter}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          weakFilter
                            ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300"
                            : "border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        }`}
                        title={weakFilter ? "Show all cards" : `Filter to ${weakCount} weak card${weakCount !== 1 ? "s" : ""}`}
                      >
                        ⚠ Weak ({weakCount})
                      </button>
                    )}
                    <FiltersDropdown />
                    <button
                      onClick={toggleEditMode}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        editMode
                          ? "bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      title={editMode ? "Exit edit mode" : "Enter edit mode to bulk-edit cards"}
                    >
                      {editMode ? "✎ Editing" : "✎ Edit"}
                    </button>
                    <button
                      onClick={togglePracticeMode}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        practiceMode
                          ? "bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300"
                          : "border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      }`}
                      title={practiceMode ? "Exit practice selection" : "Select cards to practice"}
                    >
                      {practiceMode ? "▶ Selecting…" : "▶ Practice"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Right: controls */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="relative" ref={installTipRef}>
                <button
                  onClick={handleInstall}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  title="Install as app"
                >
                  Install
                </button>
                {showInstallTip && (
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Install Anki Browser</p>
                    <p><strong>Chrome / Edge:</strong> click the install icon <span className="font-mono">⊕</span> in the address bar, or open the browser menu → <em>Install Anki Browser</em>.</p>
                    <p><strong>Safari (iOS):</strong> tap Share → <em>Add to Home Screen</em>.</p>
                  </div>
                )}
              </div>
              <SavedWordsPanel />
              <DisplayControl />

              <Dropdown
                trigger={
                  <button
                    className="p-2 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Settings menu"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                }
                align="right"
                width="w-80"
                ariaLabel="Settings menu"
              >
                <SettingsMenu />
              </Dropdown>

              <button
                onClick={() => navigate("/help")}
                className={`p-2 rounded-md transition-colors ${
                  location.pathname === "/help"
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                    : "text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                aria-label="Help"
                title="Help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <ThemeToggle />
            </div>
          </div>

        </div>
      </header>

      {/* View editor modal */}
      {isHomePage && (
        <ViewEditorModal
          isOpen={isViewModalOpen}
          onClose={() => { setIsViewModalOpen(false); setViewToEdit(null); }}
          viewToEdit={viewToEdit}
        />
      )}

    </>
  );
};

export default Header;
