/**
 * Query Builder Section Component
 * Compact visual query builder that auto-appends to raw query
 * UI helpers don't persist - raw query is the source of truth
 */

import { useState, useEffect } from "react";
import Flag from "../common/Flag";

const QueryBuilderSection = ({
  rawQuery,
  onQueryChange,
  selectedDeck,
  selectedNoteType,
  noteTypeFields,
  isLoadingFields,
  tags,
  isLoadingTags,
}) => {
  // Local UI state (not persisted)
  const [selectedCardStates, setSelectedCardStates] = useState([]);
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  // Track if user has interacted with UI helpers
  const [hasInteracted, setHasInteracted] = useState(false);

  // Card states options
  const cardStates = [
    { value: "is:due", label: "Due" },
    { value: "is:new", label: "New" },
    { value: "is:review", label: "Review" },
    { value: "is:suspended", label: "Suspended" },
    { value: "is:learn", label: "Learning" },
  ];

  // Flags options
  const flags = [
    { value: "flag:0", color: "bg-gray-300", title: "No flag" },
    { value: "flag:1", color: "bg-red-500", title: "Red flag" },
    { value: "flag:2", color: "bg-orange-400", title: "Orange flag" },
    { value: "flag:3", color: "bg-green-500", title: "Green flag" },
    { value: "flag:4", color: "bg-blue-500", title: "Blue flag" },
    { value: "flag:5", color: "bg-pink-400", title: "Pink flag" },
    { value: "flag:6", color: "bg-teal-400", title: "Turquoise flag" },
    { value: "flag:7", color: "bg-purple-500", title: "Purple flag" },
  ];

  // Parse raw query to extract active filters
  const parseRawQuery = (query) => {
    if (!query) return { cardStates: [], flags: [], tags: [], fields: [] };

    const parsed = {
      cardStates: [],
      flags: [],
      tags: [],
      fields: [],
    };

    // Parse card states
    cardStates.forEach(({ value }) => {
      if (query.includes(value)) {
        parsed.cardStates.push(value);
      }
    });

    // Parse flags
    flags.forEach(({ value }) => {
      if (query.includes(value)) {
        parsed.flags.push(value);
      }
    });

    // Parse tags - match tag:tagname patterns
    const tagMatches = query.match(/tag:(\S+)/g);
    if (tagMatches) {
      tagMatches.forEach((match) => {
        const tagName = match.replace("tag:", "");
        parsed.tags.push(tagName);
      });
    }

    // Parse fields - match fieldname:* patterns
    const fieldMatches = query.match(/(\w+):\*/g);
    if (fieldMatches) {
      fieldMatches.forEach((match) => {
        const fieldName = match.replace(":*", "");
        parsed.fields.push(fieldName);
      });
    }

    return parsed;
  };

  // Build query from selections
  const buildQuery = () => {
    const parts = [];

    // Add note type filter (always include if selected)
    if (selectedNoteType) {
      parts.push(`note:"${selectedNoteType}"`);
    }

    // Add deck filter
    if (selectedDeck) {
      parts.push(`deck:"${selectedDeck}"`);
    }

    // Add card states
    selectedCardStates.forEach((state) => {
      parts.push(state);
    });

    // Add flags
    selectedFlags.forEach((flag) => {
      parts.push(flag);
    });

    // Add tags
    selectedTags.forEach((tag) => {
      parts.push(`tag:${tag}`);
    });

    // Add field filters (ensure fields have content)
    selectedFields.forEach((field) => {
      parts.push(`${field}:*`);
    });

    return parts.join(" ");
  };

  // Parse raw query on mount and when it changes to highlight active buttons
  useEffect(() => {
    const parsed = parseRawQuery(rawQuery);
    setSelectedCardStates(parsed.cardStates);
    setSelectedFlags(parsed.flags);
    setSelectedTags(parsed.tags);
    setSelectedFields(parsed.fields);
  }, [rawQuery]);

  // Auto-update raw query when selections change
  // Only update if user has interacted with UI helpers to avoid overwriting existing queries
  useEffect(() => {
    if (!hasInteracted) return;

    const newQuery = buildQuery();
    if (newQuery !== rawQuery) {
      onQueryChange(newQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedNoteType,
    selectedDeck,
    selectedCardStates,
    selectedFlags,
    selectedTags,
    selectedFields,
    hasInteracted,
  ]);

  // Handle card state toggle
  const handleCardStateToggle = (state) => {
    setHasInteracted(true);
    setSelectedCardStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  // Handle flag toggle
  const handleFlagToggle = (flag) => {
    setHasInteracted(true);
    setSelectedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  // Handle tag toggle
  const handleTagToggle = (tag) => {
    setHasInteracted(true);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Handle field toggle
  const handleFieldToggle = (field) => {
    setHasInteracted(true);
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Query Builder
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Use the controls below to build your query visually, or edit the raw
        query directly.
      </p>

      {/* Card States, Flags, and Tags - 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card States */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Card States
          </label>
          <div className="flex flex-wrap gap-1">
            {cardStates.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleCardStateToggle(value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedCardStates.includes(value)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Flags */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Flags
          </label>
          <div className="flex flex-wrap gap-2">
            {flags.map(({ value, color, title }) => (
              <button
                key={value}
                onClick={() => handleFlagToggle(value)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  selectedFlags.includes(value)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <Flag color={color} name={title} size="md" />
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Tags
          </label>
          {isLoadingTags ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Loading tags...
            </div>
          ) : !selectedNoteType ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Select a note type first
            </div>
          ) : tags.length === 0 ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              No tags found
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Type Fields - Full Width */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Fields (must have content)
        </label>
        {isLoadingFields ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Loading fields...
          </div>
        ) : noteTypeFields.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Select a note type first
          </div>
        ) : (
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {noteTypeFields.map((field) => (
              <button
                key={field}
                onClick={() => handleFieldToggle(field)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedFields.includes(field)
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {field}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Raw Query Textarea */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Raw Query (source of truth)
        </label>
        <textarea
          value={rawQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          rows="3"
          placeholder='e.g., deck:"My Deck" is:due flag:1'
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          You can manually edit the query here. Changes made here won't update
          the visual controls above. For more information on AnkiConnect
          queries, see the{" "}
          <a
            href="https://docs.ankiweb.net/searching.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
          >
            documentation
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default QueryBuilderSection;
