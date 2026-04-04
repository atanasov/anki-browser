/**
 * SavedWordsPanel
 * Header dropdown for managing words saved during practice.
 * Each entry shows the word, an optional personal note, AnkiConnect status,
 * a Search button (fills the browser search bar), and a Delete button.
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSavedWords } from "../../hooks/useSavedWords";
import useStore from "../../store";

// ── Status dot ────────────────────────────────────────────────────────────────

const StatusDot = ({ status }) => {
  const base = "w-2 h-2 rounded-full shrink-0";
  if (status === "loading")
    return <span className={`${base} bg-gray-300 dark:bg-gray-600 animate-pulse`} title="Checking…" />;
  if (status === "found")
    return <span className={`${base} bg-green-500`} title="Found in Anki" />;
  if (status === "not_found")
    return <span className={`${base} bg-red-400`} title="Not found in Anki" />;
  return <span className={`${base} bg-gray-300 dark:bg-gray-600`} title="Not checked" />;
};

// ── Single word row ───────────────────────────────────────────────────────────

const WordRow = ({ entry, onSearch, onRemove, onUpdateNote }) => {
  const [note, setNote] = useState(entry.note || "");

  // Keep local state in sync if entry changes externally
  useEffect(() => { setNote(entry.note || ""); }, [entry.note]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
      <StatusDot status={entry.status} />

      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm shrink-0 min-w-[32px]">
        {entry.text}
      </span>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => onUpdateNote(entry.id, note)}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
        placeholder="add note…"
        className="flex-1 min-w-0 text-xs text-gray-500 dark:text-gray-400 bg-transparent placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:text-gray-700 dark:focus:text-gray-200 truncate"
      />

      <button
        onClick={() => onSearch(entry.text)}
        title="Search in card browser"
        className="shrink-0 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap px-0.5"
      >
        Search→
      </button>

      <button
        onClick={() => onRemove(entry.id)}
        title="Remove"
        className="shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────

const SavedWordsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const setSearchQuery = useStore((s) => s.setSearchQuery);

  const { savedWords, addWord, updateSavedWord, removeSavedWord } = useSavedWords();

  // Click-outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const handleAdd = async () => {
    const ok = await addWord(inputText);
    if (ok) setInputText("");
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (location.pathname !== "/") navigate("/");
    setIsOpen(false);
  };

  const count = savedWords.length;

  return (
    <div className="relative" ref={panelRef}>

      {/* Trigger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`relative p-2 rounded-md transition-colors ${
          isOpen
            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30"
            : "text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        title="Saved words"
        aria-label="Saved words"
      >
        {/* Bookmark icon */}
        <svg className="w-5 h-5" fill={isOpen || count > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col max-h-[480px]">

          {/* Header row */}
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 shrink-0 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Saved Words{count > 0 ? ` (${count})` : ""}
            </span>
            <span className="text-[10px] text-gray-300 dark:text-gray-600">
              Press S in practice to save selection
            </span>
          </div>

          {/* Add input */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 shrink-0 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="Add a word manually…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
            />
            <button
              onClick={handleAdd}
              disabled={!inputText.trim()}
              className="shrink-0 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-30 transition-colors"
              title="Add"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {savedWords.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No saved words yet.</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                  Select text in practice and press S,<br />or type above to add manually.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {savedWords.map((entry) => (
                  <WordRow
                    key={entry.id}
                    entry={entry}
                    onSearch={handleSearch}
                    onRemove={removeSavedWord}
                    onUpdateNote={(id, note) => updateSavedWord(id, { note })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {count > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 shrink-0">
              <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center">
                🟢 found in Anki &nbsp;·&nbsp; 🔴 not found &nbsp;·&nbsp; hover to Search or remove
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedWordsPanel;
