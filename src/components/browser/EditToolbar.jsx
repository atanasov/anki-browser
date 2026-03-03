/**
 * EditToolbar
 * Fixed bottom bar shown in edit mode.
 * Provides bulk operations on selected cards: tags, flags, suspend/unsuspend, reset due.
 */

import { useState } from "react";
import useStore from "../../store";
import ankiConnect from "../../services/ankiConnect";
import logger from "../../utils/logger";
import { toast } from "../../store/toastStore";

const FLAGS = [
  { value: 1, color: "#ef4444", title: "Red" },
  { value: 2, color: "#f97316", title: "Orange" },
  { value: 3, color: "#22c55e", title: "Green" },
  { value: 4, color: "#3b82f6", title: "Blue" },
  { value: 5, color: "#ec4899", title: "Pink" },
  { value: 6, color: "#14b8a6", title: "Teal" },
  { value: 7, color: "#a855f7", title: "Purple" },
];

const EditToolbar = ({ notes, onRefresh }) => {
  const selectedNoteIds = useStore((state) => state.selectedNoteIds);
  const selectAllNotes = useStore((state) => state.selectAllNotes);
  const clearSelection = useStore((state) => state.clearSelection);
  const setEditMode = useStore((state) => state.setEditMode);

  const [tagInput, setTagInput] = useState("");
  const [activeTagAction, setActiveTagAction] = useState(null); // 'add' | 'remove' | null
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.note_id));
  const cardIds = selectedNotes.flatMap((n) => n.card_info || []);
  const hasSelection = selectedNoteIds.length > 0;
  const allSelected = notes.length > 0 && selectedNoteIds.length === notes.length;

  const run = async (fn, successMsg) => {
    if (!hasSelection || isProcessing) return;
    setIsProcessing(true);
    try {
      await fn();
      toast.show(successMsg);
      onRefresh();
    } catch (err) {
      logger.error("Bulk edit failed:", err);
      toast.error(err.message || "Operation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    run(() => ankiConnect.addTags(selectedNoteIds, tag), `Tag "${tag}" added`);
    setTagInput("");
    setActiveTagAction(null);
  };

  const handleRemoveTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    run(() => ankiConnect.removeTags(selectedNoteIds, tag), `Tag "${tag}" removed`);
    setTagInput("");
    setActiveTagAction(null);
  };

  const handleSetFlag = (flagNum) =>
    run(() => ankiConnect.setFlag(cardIds, flagNum), `Flag set`);

  const handleClearFlag = () =>
    run(() => ankiConnect.setFlag(cardIds, 0), `Flag cleared`);

  const handleSuspend = () =>
    run(() => ankiConnect.suspend(cardIds), `${selectedNotes.length} card(s) suspended`);

  const handleUnsuspend = () =>
    run(() => ankiConnect.unsuspend(cardIds), `${selectedNotes.length} card(s) unsuspended`);

  const handleDueToday = () =>
    run(() => ankiConnect.setDueDate(cardIds, "0"), `Due date set to today`);

  const toggleTagAction = (action) => {
    setActiveTagAction((prev) => (prev === action ? null : action));
    setTagInput("");
  };

  const btnBase =
    "px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap shrink-0";
  const btnGray = `${btnBase} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed`;
  const btnActive = `${btnBase} bg-blue-600 hover:bg-blue-700 text-white disabled:cursor-not-allowed`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-none">

          {/* Selection controls */}
          <button
            onClick={() =>
              allSelected
                ? clearSelection()
                : selectAllNotes(notes.map((n) => n.note_id))
            }
            className={btnGray}
            title={allSelected ? "Deselect all" : "Select all on this page"}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>

          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 min-w-[60px]">
            {selectedNoteIds.length}/{notes.length}
          </span>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 shrink-0" />

          {/* Flag dots */}
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Flag:</span>
          {FLAGS.map(({ value, color, title }) => (
            <button
              key={value}
              onClick={() => handleSetFlag(value)}
              disabled={!hasSelection || isProcessing}
              title={`Set ${title} flag`}
              className="w-5 h-5 rounded-full shrink-0 transition-all opacity-70 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: color }}
              aria-label={`Set ${title} flag`}
            />
          ))}
          <button
            onClick={handleClearFlag}
            disabled={!hasSelection || isProcessing}
            className={`${btnGray} text-gray-500`}
            title="Clear flag"
          >
            ✕
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 shrink-0" />

          {/* Suspend / Unsuspend */}
          <button
            onClick={handleSuspend}
            disabled={!hasSelection || isProcessing}
            className={btnGray}
            title="Suspend selected cards"
          >
            Suspend
          </button>
          <button
            onClick={handleUnsuspend}
            disabled={!hasSelection || isProcessing}
            className={btnGray}
            title="Unsuspend selected cards"
          >
            Unsuspend
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 shrink-0" />

          {/* Due today */}
          <button
            onClick={handleDueToday}
            disabled={!hasSelection || isProcessing || cardIds.length === 0}
            className={btnGray}
            title="Set due date to today"
          >
            Due Today
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 shrink-0" />

          {/* Tag operations */}
          <button
            onClick={() => toggleTagAction("add")}
            className={activeTagAction === "add" ? btnActive : btnGray}
            disabled={!hasSelection || isProcessing}
          >
            + Tag
          </button>
          <button
            onClick={() => toggleTagAction("remove")}
            className={activeTagAction === "remove" ? btnActive : btnGray}
            disabled={!hasSelection || isProcessing}
          >
            − Tag
          </button>

          {activeTagAction && (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    activeTagAction === "add" ? handleAddTag() : handleRemoveTag();
                  }
                  if (e.key === "Escape") {
                    setActiveTagAction(null);
                    setTagInput("");
                  }
                }}
                placeholder="tag name…"
                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={activeTagAction === "add" ? handleAddTag : handleRemoveTag}
                disabled={!tagInput.trim() || isProcessing}
                className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Apply
              </button>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Done */}
          <button
            onClick={() => setEditMode(false)}
            className={`${btnBase} bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 hover:bg-gray-700 dark:hover:bg-gray-300`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditToolbar;
