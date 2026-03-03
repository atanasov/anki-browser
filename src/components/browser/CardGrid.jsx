import LoadingSkeleton from "./LoadingSkeleton";
import NoteCard from "./NoteCard";
import EmptyState from "../common/EmptyState";

const CardGrid = ({
  isLoading,
  notes,
  activeViewId,
  currentQuery,
  refreshData,
  onCreateView,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-6">
        {Array.from({ length: 8 }, (_, i) => (
          <LoadingSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!activeViewId) {
    return (
      <EmptyState
        icon="cards"
        title="Welcome to Anki Browser"
        message="Create a view to start browsing your cards"
        actionButton={{
          text: (
            <>
              <svg
                className="w-4 h-4 mr-2 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
              Create View
            </>
          ),
          onClick: onCreateView,
          variant: "primary",
        }}
      />
    );
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        icon="cards"
        title="No cards found"
        message={
          currentQuery
            ? `No cards match the query: "${currentQuery}"`
            : "Try adjusting your search criteria in settings"
        }
        actionButton={{
          text: (
            <>
              <svg
                className="w-4 h-4 mr-2 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
              Refresh
            </>
          ),
          onClick: refreshData,
          variant: "secondary",
        }}
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-6">
      {notes.map((note) => (
        <NoteCard key={note.note_id} note={note} />
      ))}
    </div>
  );
};

export default CardGrid;
