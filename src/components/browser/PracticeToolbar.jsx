/**
 * PracticeToolbar
 * Fixed bottom bar shown in practice-selection mode.
 * User selects cards then clicks "Start Practice".
 */

import useStore from "../../store";

const PracticeToolbar = ({ notes, onStartPractice }) => {
  const selectedNoteIds = useStore((state) => state.selectedNoteIds);
  const selectAllNotes  = useStore((state) => state.selectAllNotes);
  const clearSelection  = useStore((state) => state.clearSelection);
  const setPracticeMode = useStore((state) => state.setPracticeMode);
  const currentPageNoteIds = useStore((state) => state.currentPageNoteIds);

  const allSelected = notes.length > 0 && selectedNoteIds.length === notes.length;

  const handleStart = () => {
    const ids = selectedNoteIds.length > 0 ? selectedNoteIds : currentPageNoteIds;
    onStartPractice(ids);
  };

  const btnBase =
    "px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0";
  const btnGray = `${btnBase} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-2.5">

          <button
            onClick={() => allSelected ? clearSelection() : selectAllNotes(notes.map((n) => n.note_id))}
            className={btnGray}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>

          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 min-w-[60px]">
            {selectedNoteIds.length > 0
              ? `${selectedNoteIds.length} selected`
              : `${notes.length} cards (all)`}
          </span>

          <div className="flex-1" />

          <button
            onClick={() => setPracticeMode(false)}
            className={btnGray}
          >
            Cancel
          </button>

          <button
            onClick={handleStart}
            className={`${btnBase} bg-purple-600 hover:bg-purple-700 text-white font-medium`}
          >
            ▶ Start Practice
          </button>

        </div>
      </div>
    </div>
  );
};

export default PracticeToolbar;
