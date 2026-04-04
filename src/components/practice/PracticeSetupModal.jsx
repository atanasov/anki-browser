/**
 * PracticeSetupModal
 * Choose exercise type + similar words options, then start practice.
 * Card selection is handled upstream (PracticeToolbar).
 * → emits onStart({ notes, exerciseType, view })
 */

import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import {
  getAvailableTypes,
  EXERCISE_LABELS,
} from "../../hooks/usePracticeSession";
import { TYPE_TO_TAG_CATEGORY } from "./questionBuilder";
import { usePracticeLoader } from "../../hooks/usePracticeLoader";

const Toggle = ({ value, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
      value ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
    }`}
    role="switch"
    aria-checked={value}
    aria-label={label}
  >
    <span
      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
        value ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

const PracticeSetupModal = ({ isOpen, onClose, onStart, view, noteIds, notes, weakFilter }) => {
  const [includeSimilar, setIncludeSimilar] = useState(true);
  const [studiedOnly,    setStudiedOnly]    = useState(true);
  const [addConfused,    setAddConfused]    = useState(true);
  const [selectedTypes,  setSelectedTypes]  = useState([]);
  const [weakCategories, setWeakCategories] = useState(new Set());

  const availableTypes = getAvailableTypes(view);

  const { load, loading, loadingStatus, error, setError, getWeakCategories } = usePracticeLoader({
    view, noteIds, notes, weakFilter, selectedTypes,
  });

  const toggleType = (t) => setSelectedTypes((prev) =>
    prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
  );

  // Reset on open — pre-select only relevant types when weak filter is active
  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    const cats = getWeakCategories();
    setWeakCategories(cats);

    if (cats.size > 0) {
      const suggested = availableTypes.filter((t) => {
        const cat = TYPE_TO_TAG_CATEGORY[t];
        return cat && cats.has(cat);
      });
      setSelectedTypes(suggested.length > 0 ? suggested : availableTypes);
    } else {
      setSelectedTypes(availableTypes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleStart = () =>
    load({ includeSimilar, studiedOnly, addConfused, onSuccess: onStart });

  const hasSimilarWordsConfig = view?.similarWords?.enabled && view?.similarWords?.wordField;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Practice" maxWidth="max-w-md">
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {noteIds?.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {noteIds.length} card{noteIds.length !== 1 ? "s" : ""} selected
          </p>
        )}

        {/* ── Similar words ───────────────────────────────────────────── */}
        {hasSimilarWordsConfig && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include similar words
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Adds words sharing the same characters — great for contrast practice
                </p>
              </div>
              <Toggle value={includeSimilar} onChange={setIncludeSimilar} label="Include similar words" />
            </div>

            {includeSimilar && (
              <div className="flex flex-col gap-2 pl-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Studied cards only (is:review or is:learn)
                  </span>
                  <Toggle value={studiedOnly} onChange={setStudiedOnly} label="Studied only" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Add wrong picks to session
                  </span>
                  <Toggle value={addConfused} onChange={setAddConfused} label="Add confused words" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Exercise types ───────────────────────────────────────────── */}
        {availableTypes.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Exercise types
                </p>
                {weakCategories.size > 0 && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                    Pre-selected for: {[...weakCategories].join(", ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTypes(selectedTypes.length === availableTypes.length ? [] : availableTypes)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {selectedTypes.length === availableTypes.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {availableTypes.map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleType(t)}
                    className="accent-blue-600 w-4 h-4 shrink-0"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200 leading-tight">
                    {EXERCISE_LABELS[t]}
                  </span>
                </label>
              ))}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-2">Select at least one type.</p>
            )}
          </div>
        )}

        {availableTypes.length === 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-sm">
            Configure the <strong>Word</strong>, <strong>Pronunciation</strong>, and{" "}
            <strong>Translation</strong> fields in Similar Words settings to enable
            practice exercises.
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading || availableTypes.length === 0 || selectedTypes.length === 0}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{loadingStatus || "Loading…"}</span>
              </>
            ) : (
              "Start Practice"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PracticeSetupModal;
