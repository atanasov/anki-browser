/**
 * View Editor Modal
 * Modal for creating and editing views
 */

import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import FormInput from "../common/FormInput";
import FormSelect from "../common/FormSelect";
import QueryBuilderSection from "../queries/QueryBuilderSection";
import ankiConnect from "../../services/ankiConnect";
import useStore from "../../store";
import logger from "../../utils/logger";

const ViewEditorModal = ({ isOpen, onClose, viewToEdit = null }) => {
  const createView = useStore((state) => state.createView);
  const updateView = useStore((state) => state.updateView);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    deck: "",
    noteType: "",
    frontFields: [],
    backFields: [],
    rawQuery: "",
    similarWords: {
      enabled: false,
      deck: "",
      noteType: "",
      wordField: "",
      pinyinField: "",
      translationField: "",
    },
  });

  // UI state
  const [decks, setDecks] = useState([]);
  const [noteTypes, setNoteTypes] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [error, setError] = useState("");

  // Field selection state
  const [selectedFrontField, setSelectedFrontField] = useState("");
  const [selectedBackField, setSelectedBackField] = useState("");

  // Advanced settings toggle
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Similar words settings
  const [showSimilarWordsSettings, setShowSimilarWordsSettings] = useState(false);
  const [similarWordsFields, setSimilarWordsFields] = useState([]);

  // Load decks and note types on mount
  useEffect(() => {
    if (isOpen) {
      loadAnkiData();
    }
  }, [isOpen]);

  // Load fields when note type changes
  useEffect(() => {
    if (formData.noteType) {
      loadFields(formData.noteType);
    }
  }, [formData.noteType]);

  // Load tags when deck or note type changes
  useEffect(() => {
    if (formData.deck || formData.noteType) {
      loadTags();
    }
  }, [formData.deck, formData.noteType]);

  // Pre-populate raw query when Advanced Settings is opened for the first time
  useEffect(() => {
    if (
      showAdvancedSettings &&
      !formData.rawQuery &&
      formData.deck &&
      formData.noteType
    ) {
      const defaultQuery = `deck:"${formData.deck}" note:"${formData.noteType}"`;
      setFormData((prev) => ({ ...prev, rawQuery: defaultQuery }));
    }
  }, [
    showAdvancedSettings,
    formData.deck,
    formData.noteType,
    formData.rawQuery,
  ]);

  // Load fields for similar words note type when it changes
  useEffect(() => {
    const swNoteType = formData.similarWords?.noteType;
    if (!swNoteType) {
      setSimilarWordsFields([]);
      return;
    }
    ankiConnect.getFieldNames(swNoteType).then(setSimilarWordsFields).catch(() => setSimilarWordsFields([]));
  }, [formData.similarWords?.noteType]);

  // Populate form when editing
  useEffect(() => {
    if (viewToEdit) {
      setFormData({
        name: viewToEdit.name,
        deck: viewToEdit.deck,
        noteType: viewToEdit.noteType,
        frontFields: viewToEdit.frontFields || [],
        backFields: viewToEdit.backFields || [],
        rawQuery: viewToEdit.rawQuery || "",
        similarWords: viewToEdit.similarWords || {
          enabled: false,
          deck: "",
          noteType: "",
          wordField: "",
          pinyinField: "",
          translationField: "",
        },
      });
      if (viewToEdit.rawQuery && viewToEdit.rawQuery.trim()) {
        setShowAdvancedSettings(true);
      }
      if (viewToEdit.similarWords?.enabled) {
        setShowSimilarWordsSettings(true);
      }
    } else {
      // Reset form for new view
      setFormData({
        name: "",
        deck: "",
        noteType: "",
        frontFields: [],
        backFields: [],
        rawQuery: "",
        similarWords: {
          enabled: false,
          deck: "",
          noteType: "",
          wordField: "",
          pinyinField: "",
          translationField: "",
        },
      });
      setShowAdvancedSettings(false);
      setShowSimilarWordsSettings(false);
    }
  }, [viewToEdit, isOpen]);

  const loadAnkiData = async () => {
    try {
      setIsLoading(true);
      const [deckNames, modelNames] = await Promise.all([
        ankiConnect.getDeckNames(),
        ankiConnect.getNoteTypes(),
      ]);
      setDecks(deckNames);
      setNoteTypes(modelNames);
      setError("");
    } catch (err) {
      logger.error("Failed to load Anki data:", err);
      setError(
        "Failed to connect to Anki. Make sure Anki is running with AnkiConnect installed."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadFields = async (noteType) => {
    try {
      setIsLoadingFields(true);
      const fields = await ankiConnect.getFieldNames(noteType);
      setAvailableFields(fields);
    } catch (err) {
      logger.error("Failed to load fields:", err);
      setAvailableFields([]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const loadTags = async () => {
    try {
      setIsLoadingTags(true);
      const allTags = await ankiConnect.getTags();
      setTags(allTags);
    } catch (err) {
      logger.error("Failed to load tags:", err);
      setTags([]);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate name if empty
    if (field === "deck" || field === "noteType") {
      if (!formData.name || formData.name === "") {
        const newName = `${field === "deck" ? value : formData.deck} ${
          field === "noteType" ? value : formData.noteType
        }`.trim();
        if (newName) {
          setFormData((prev) => ({ ...prev, name: newName }));
        }
      }
    }
  };

  const handleAddFrontField = () => {
    if (
      selectedFrontField &&
      !formData.frontFields.includes(selectedFrontField)
    ) {
      setFormData((prev) => ({
        ...prev,
        frontFields: [...prev.frontFields, selectedFrontField],
      }));
      setSelectedFrontField("");
    }
  };

  const handleAddBackField = () => {
    if (selectedBackField && !formData.backFields.includes(selectedBackField)) {
      setFormData((prev) => ({
        ...prev,
        backFields: [...prev.backFields, selectedBackField],
      }));
      setSelectedBackField("");
    }
  };

  const handleRemoveFrontField = (field) => {
    setFormData((prev) => ({
      ...prev,
      frontFields: prev.frontFields.filter((f) => f !== field),
    }));
  };

  const handleRemoveBackField = (field) => {
    setFormData((prev) => ({
      ...prev,
      backFields: prev.backFields.filter((f) => f !== field),
    }));
  };

  const handleSimilarWordsChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      similarWords: { ...prev.similarWords, [field]: value },
    }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.name.trim()) {
      setError("Please enter a view name");
      return;
    }
    if (!formData.deck) {
      setError("Please select a deck");
      return;
    }
    if (!formData.noteType) {
      setError("Please select a note type");
      return;
    }
    if (formData.frontFields.length === 0) {
      setError("Please add at least one front field");
      return;
    }
    if (formData.backFields.length === 0) {
      setError("Please add at least one back field");
      return;
    }

    // Build raw query - use formData.rawQuery if provided, otherwise build default
    let rawQuery = formData.rawQuery?.trim();

    if (!rawQuery) {
      rawQuery = `deck:"${formData.deck}" note:"${formData.noteType}"`;
    }

    if (!rawQuery) {
      setError("Query cannot be empty. Please select a deck and note type.");
      return;
    }

    const viewData = {
      ...formData,
      rawQuery,
    };

    try {
      if (viewToEdit) {
        updateView(viewToEdit.id, viewData);
      } else {
        createView(viewData);
      }
      onClose();
    } catch (err) {
      logger.error("Failed to save view:", err);
      setError("Failed to save view. Please try again.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={viewToEdit ? "Edit View" : "Create New View"}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            Loading Anki data...
          </div>
        )}

        {/* View Name */}
        <FormInput
          label="View Name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="e.g., Chinese HSK Flashcards"
          required
        />

        {/* Deck and Note Type - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            label="Deck"
            value={formData.deck}
            onChange={(e) => handleInputChange("deck", e.target.value)}
            options={[
              { value: "", label: "Select a deck..." },
              ...decks.map((deck) => ({ value: deck, label: deck })),
            ]}
            required
          />

          <FormSelect
            label="Note Type"
            value={formData.noteType}
            onChange={(e) => handleInputChange("noteType", e.target.value)}
            options={[
              { value: "", label: "Select a note type..." },
              ...noteTypes.map((type) => ({ value: type, label: type })),
            ]}
            required
          />
        </div>

        {/* Front Fields and Back Fields - 2 Columns */}
        {availableFields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Front Fields (Question) *
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  value={selectedFrontField}
                  onChange={(e) => setSelectedFrontField(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a field...</option>
                  {availableFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddFrontField}
                  disabled={!selectedFrontField}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.frontFields.map((field) => (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {field}
                    <button
                      onClick={() => handleRemoveFrontField(field)}
                      className="hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {formData.frontFields.length > 3 && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                  <svg
                    className="w-4 h-4 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    More than 3 fields may look cluttered on cards. Consider
                    using fewer fields for better readability.
                  </span>
                </div>
              )}
            </div>

            {/* Back Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Back Fields (Answer) *
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  value={selectedBackField}
                  onChange={(e) => setSelectedBackField(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a field...</option>
                  {availableFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddBackField}
                  disabled={!selectedBackField}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.backFields.map((field) => (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm"
                  >
                    {field}
                    <button
                      onClick={() => handleRemoveBackField(field)}
                      className="hover:text-green-900 dark:hover:text-green-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {formData.backFields.length > 3 && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                  <svg
                    className="w-4 h-4 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    More than 3 fields may look cluttered on cards. Consider
                    using fewer fields for better readability.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Settings - Query Builder */}
        {formData.deck && formData.noteType && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Advanced Query Settings
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Customize which cards to fetch from Anki using advanced
                  filters
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                {showAdvancedSettings ? (
                  <>
                    <span>Hide</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Show</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible Query Builder */}
            {showAdvancedSettings && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 ease-in-out">
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> The raw query below is the source of
                    truth for fetching cards from Anki. Use the helper buttons
                    to build your query, or edit it manually. By default, cards
                    will be fetched using:{" "}
                    <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">
                      deck:"{formData.deck}" note:"{formData.noteType}"
                    </code>
                  </p>
                </div>
                <QueryBuilderSection
                  rawQuery={formData.rawQuery}
                  onQueryChange={(newQuery) =>
                    handleInputChange("rawQuery", newQuery)
                  }
                  selectedDeck={formData.deck}
                  selectedNoteType={formData.noteType}
                  noteTypeFields={availableFields}
                  isLoadingFields={isLoadingFields}
                  tags={tags}
                  isLoadingTags={isLoadingTags}
                />
              </div>
            )}
          </div>
        )}

        {/* Similar Words */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSimilarWordsChange("enabled", !formData.similarWords.enabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  formData.similarWords.enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                }`}
                role="switch"
                aria-checked={formData.similarWords.enabled}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    formData.similarWords.enabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Similar Words
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Show related words sharing the same characters
                </p>
              </div>
            </div>
            {formData.similarWords.enabled && (
              <button
                type="button"
                onClick={() => setShowSimilarWordsSettings(!showSimilarWordsSettings)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                {showSimilarWordsSettings ? (
                  <>
                    <span>Hide</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Configure</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>

          {formData.similarWords.enabled && showSimilarWordsSettings && (
            <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
              {/* Deck + Note Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Deck
                  </label>
                  <select
                    value={formData.similarWords.deck}
                    onChange={(e) => handleSimilarWordsChange("deck", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Same as view deck</option>
                    {decks.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Note Type
                  </label>
                  <select
                    value={formData.similarWords.noteType}
                    onChange={(e) => handleSimilarWordsChange("noteType", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Same as view note type</option>
                    {noteTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Field selectors */}
              {[
                { label: "Word Field *",       field: "wordField" },
                { label: "Pinyin Field",        field: "pinyinField" },
                { label: "Translation Field",   field: "translationField" },
              ].length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Word Field *",     field: "wordField" },
                    { label: "Pinyin Field",      field: "pinyinField" },
                    { label: "Translation Field", field: "translationField" },
                  ].map(({ label, field }) => {
                    const fields = similarWordsFields.length > 0 ? similarWordsFields : availableFields;
                    return (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {label}
                        </label>
                        <select
                          value={formData.similarWords[field]}
                          onChange={(e) => handleSimilarWordsChange(field, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        >
                          <option value="">— none —</option>
                          {fields.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
          >
            {viewToEdit ? "Update View" : "Create View"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ViewEditorModal;
