/**
 * FiltersDropdown
 * Header dropdown for temporary session filters: flag (single), card status (multi),
 * tags (autocomplete multi), and saved-words match.
 * All filters are reset when the user switches views.
 */

import { useState, useRef, useEffect } from "react";
import useStore from "../../store";
import ankiConnect from "../../services/ankiConnect";

const FLAG_OPTIONS = [
  { value: 1, color: "bg-red-500",    title: "Red"    },
  { value: 2, color: "bg-orange-400", title: "Orange" },
  { value: 3, color: "bg-green-500",  title: "Green"  },
  { value: 4, color: "bg-blue-500",   title: "Blue"   },
  { value: 5, color: "bg-pink-400",   title: "Pink"   },
  { value: 6, color: "bg-teal-400",   title: "Teal"   },
  { value: 7, color: "bg-purple-500", title: "Purple" },
];

const STATUS_OPTIONS = [
  { value: "is:suspended", label: "Suspended" },
  { value: "is:new",       label: "New"       },
  { value: "is:due",       label: "Due"       },
  { value: "is:learn",     label: "Learning"  },
  { value: "is:review",    label: "Review"    },
];

const FiltersDropdown = () => {
  const [isOpen,            setIsOpen]            = useState(false);
  const [allTags,           setAllTags]           = useState([]);
  const [tagInput,          setTagInput]          = useState("");
  const [showSuggestions,   setShowSuggestions]   = useState(false);
  const panelRef = useRef(null);

  const activeFilters        = useStore((s) => s.activeFilters);
  const setFlagFilter        = useStore((s) => s.setFlagFilter);
  const toggleStatusFilter   = useStore((s) => s.toggleStatusFilter);
  const toggleTagFilter      = useStore((s) => s.toggleTagFilter);
  const toggleSavedWordsFilter = useStore((s) => s.toggleSavedWordsFilter);
  const clearFilters         = useStore((s) => s.clearFilters);
  const savedWords           = useStore((s) => s.savedWords ?? []);

  // Click-outside
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [isOpen]);

  // Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen]);

  // Fetch all Anki tags once when panel first opens
  useEffect(() => {
    if (!isOpen || allTags.length > 0) return;
    ankiConnect.makeRequest("getTags", {}).then((tags) => setAllTags(tags ?? [])).catch(() => {});
  }, [isOpen, allTags.length]);

  const suggestions = tagInput.trim()
    ? allTags
        .filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !activeFilters.tags.includes(t))
        .slice(0, 12)
    : [];

  const activeCount =
    (activeFilters.flag !== null ? 1 : 0) +
    activeFilters.statuses.length +
    activeFilters.tags.length +
    (activeFilters.savedWords ? 1 : 0);

  return (
    <div className="relative" ref={panelRef}>

      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
          activeCount > 0
            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300"
            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        title="Filters"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 space-y-4">

          {/* Flag — single select */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Flag</p>
            <div className="flex items-center gap-2 flex-wrap">
              {FLAG_OPTIONS.map(({ value, color, title }) => (
                <button
                  key={value}
                  onClick={() => setFlagFilter(activeFilters.flag === value ? null : value)}
                  title={title}
                  className={`w-5 h-5 rounded-full transition-all ${color} ${
                    activeFilters.flag === value
                      ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-blue-500 scale-110"
                      : "opacity-50 hover:opacity-90"
                  }`}
                />
              ))}
              {activeFilters.flag !== null && (
                <button
                  onClick={() => setFlagFilter(null)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                  title="Clear flag filter"
                >✕</button>
              )}
            </div>
          </div>

          {/* Status — multi select */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Card Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleStatusFilter(value)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                    activeFilters.statuses.includes(value)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags — autocomplete multi */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Tags</p>
            {activeFilters.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {activeFilters.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                    {tag}
                    <button onClick={() => toggleTagFilter(tag)} className="hover:text-red-500 transition-colors leading-none">✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search tags…"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-purple-400 dark:focus:border-purple-500 transition-colors"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-36 overflow-y-auto">
                  {suggestions.map((tag) => (
                    <button
                      key={tag}
                      onMouseDown={() => { toggleTagFilter(tag); setTagInput(""); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Saved Words */}
          {savedWords.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Saved Words</p>
              <button
                onClick={toggleSavedWordsFilter}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  activeFilters.savedWords
                    ? "bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400"
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill={activeFilters.savedWords ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Match saved words ({savedWords.length})
              </button>
            </div>
          )}

          {/* Clear all */}
          {activeCount > 0 && (
            <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { clearFilters(); setTagInput(""); }}
                className="w-full py-1.5 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FiltersDropdown;
