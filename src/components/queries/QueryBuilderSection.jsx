/**
 * QueryBuilderSection
 * Stripped-down base query builder for the Edit View modal.
 * Card states, flags, and tags are now header filters (session-only).
 * This section handles only: required-field filters + raw query textarea.
 */

import { useState, useEffect } from "react";

const QueryBuilderSection = ({
  rawQuery,
  onQueryChange,
  selectedDeck,
  selectedNoteType,
  noteTypeFields,
  isLoadingFields,
}) => {
  const [selectedFields, setSelectedFields] = useState([]);
  const [hasInteracted,  setHasInteracted]  = useState(false);

  // Parse existing field filters from raw query on load
  useEffect(() => {
    if (!rawQuery) { setSelectedFields([]); return; }
    const matches = rawQuery.match(/(\w+):\*/g) ?? [];
    setSelectedFields(matches.map((m) => m.replace(":*", "")));
  }, [rawQuery]);

  // Rebuild query from deck + noteType + field selections
  const buildQuery = () => {
    const parts = [];
    if (selectedNoteType) parts.push(`note:"${selectedNoteType}"`);
    if (selectedDeck)     parts.push(`deck:"${selectedDeck}"`);
    selectedFields.forEach((f) => parts.push(`${f}:*`));
    return parts.join(" ");
  };

  useEffect(() => {
    if (!hasInteracted) return;
    const q = buildQuery();
    if (q !== rawQuery) onQueryChange(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteType, selectedDeck, selectedFields, hasInteracted]);

  const handleFieldToggle = (field) => {
    setHasInteracted(true);
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="space-y-4">
      {/* Required fields filter */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Fields (must have content)
        </label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Only show cards where these fields are filled in.
        </p>
        {isLoadingFields ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">Loading fields…</p>
        ) : noteTypeFields.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">Select a note type first.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {noteTypeFields.map((field) => (
              <button
                key={field}
                onClick={() => handleFieldToggle(field)}
                className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                  selectedFields.includes(field)
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-400 dark:hover:border-green-600"
                }`}
              >
                {field}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Raw query — source of truth */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Raw Query
        </label>
        <textarea
          value={rawQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          rows={3}
          placeholder='e.g., deck:"My Deck" note:"HSK" Simplified:*'
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Defines which cards belong to this view.{" "}
          <a
            href="https://docs.ankiweb.net/searching.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Query syntax ↗
          </a>
          {" "}· Flags, statuses, and tags can be filtered from the header without editing this.
        </p>
      </div>
    </div>
  );
};

export default QueryBuilderSection;
