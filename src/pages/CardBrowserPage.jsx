/**
 * Card Browser Component
 * Main component for browsing and displaying Anki cards
 */

import { useState, useEffect, useCallback, useRef } from "react";
import useStore from "../store";
import ankiConnect from "../services/ankiConnect";
import dataService from "../services/dataService";
import Pagination from "../components/browser/Pagination";
import CardGrid from "../components/browser/CardGrid";
import ViewEditorModal from "../components/views/ViewEditorModal";
import EditToolbar from "../components/browser/EditToolbar";
import PracticeToolbar from "../components/browser/PracticeToolbar";
import PracticeSetupModal from "../components/practice/PracticeSetupModal";
import PracticeSession from "../components/practice/PracticeSession";
import logger from "../utils/logger";

const CardBrowser = () => {
  const updateSettings = useStore((state) => state.updateSettings);
  const getSetting = useStore((state) => state.getSetting);
  const editMode = useStore((state) => state.editMode);
  const practiceMode = useStore((state) => state.practiceMode);
  const searchQuery = useStore((state) => state.searchQuery);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const setCurrentPageNoteIds = useStore((state) => state.setCurrentPageNoteIds);
  const weakFilter = useStore((state) => state.weakFilter);
  const setWeakCount = useStore((state) => state.setWeakCount);

  const [isCreateViewModalOpen, setIsCreateViewModalOpen] = useState(false);
  const [isPracticeSetupOpen, setIsPracticeSetupOpen] = useState(false);
  const [practiceNoteIds, setPracticeNoteIds] = useState([]);
  const [practiceSessionOptions, setPracticeSessionOptions] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [pagination, setPagination] = useState(() => ({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    pageSize: getSetting("cardsPerPage", 20),
    hasNextPage: false,
    hasPreviousPage: false,
    startIndex: 0,
    endIndex: 0,
  }));

  const isFetchingRef = useRef(false);

  const activeViewId = useStore((state) => state.settings.activeViewId);
  const views = useStore((state) => state.views);
  const activeView = views?.find((v) => v.id === activeViewId) ?? null;

  const buildQuery = useCallback(() => {
    const base = activeView?.rawQuery?.trim() || "";
    if (!base) return "";

    const prefix = dataService.getSetting("practiceTagPrefix", "weak");
    const filtered = weakFilter ? `${base} tag:${prefix}*` : base;

    const term = searchQuery.trim();
    if (!term) return filtered;

    const fields = [...new Set([...(activeView.frontFields || []), ...(activeView.backFields || [])])];
    if (fields.length > 0) {
      const fieldQuery = fields.map((f) => `${f}:*${term}*`).join(" OR ");
      return `${filtered} (${fieldQuery})`;
    }
    return `${filtered} ${term}`;
  }, [activeView, searchQuery, weakFilter]);

  const fetchWeakCount = useCallback(async () => {
    const base = activeView?.rawQuery?.trim();
    if (!base) { setWeakCount(0); return; }
    const prefix = dataService.getSetting("practiceTagPrefix", "weak");
    try {
      const ids = await ankiConnect.findNotes(`${base} tag:${prefix}*`);
      setWeakCount(ids?.length ?? 0);
    } catch {
      setWeakCount(0);
    }
  }, [activeView?.rawQuery, setWeakCount]);

  const fetchNotes = useCallback(
    async (page, pageSize) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);

      try {
        const query = buildQuery();

        if (!query.trim()) {
          setNotes([]);
          setPagination((prev) => ({
            ...prev,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
            startIndex: 0,
            endIndex: 0,
          }));
          return;
        }

        logger.debug("Loading notes with query:", query, "page:", page, "pageSize:", pageSize);

        const result = await ankiConnect.findNotesWithPagination(query, page, pageSize);

        const transformedNotes = result.notes.map((noteData) => ({
          note_id: noteData.noteId,
          deck_name: noteData.deckName || "",
          note_type: noteData.modelName || "",
          fields: noteData.fields || {},
          tags: noteData.tags || [],
          card_info: noteData.cards || [],
        }));

        setNotes(transformedNotes);
        setCurrentPageNoteIds(transformedNotes.map((n) => n.note_id));
        setPagination((prev) => ({ ...prev, ...result.pagination, currentPage: page }));
      } catch (err) {
        logger.error("Error loading notes:", err);
        setNotes([]);
        setPagination((prev) => ({
          ...prev,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          startIndex: 0,
          endIndex: 0,
        }));
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildQuery] // setCurrentPageNoteIds is a stable Zustand setter
  );

  // Refresh weak count on view switch
  useEffect(() => {
    fetchWeakCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId]);

  // Detect view switches, search changes, or weak filter toggle — reset to page 1
  const prevContextRef = useRef({ viewId: null, searchQuery: "", weakFilter: false });

  useEffect(() => {
    if (!activeView) return;

    const prev = prevContextRef.current;
    const isViewSwitch = prev.viewId !== activeViewId;
    const isSearchChange = prev.searchQuery !== searchQuery;
    const isWeakFilterChange = prev.weakFilter !== weakFilter;
    prevContextRef.current = { viewId: activeViewId, searchQuery, weakFilter };

    const shouldReset = isViewSwitch || isSearchChange || isWeakFilterChange;
    const page = shouldReset ? 1 : pagination.currentPage;
    if (isViewSwitch) {
      setSearchQuery("");
      prevContextRef.current.searchQuery = "";
    }
    if (shouldReset) {
      setPagination((p) => ({ ...p, currentPage: 1 }));
      updateSettings({ currentPage: 1 });
    }

    fetchNotes(page, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId, fetchNotes, pagination.currentPage, pagination.pageSize, updateSettings, setSearchQuery, weakFilter]);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
    updateSettings({ currentPage: newPage });
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination((prev) => ({ ...prev, pageSize: newPageSize, currentPage: 1 }));
    updateSettings({ cardsPerPage: newPageSize, currentPage: 1 });
  };

  const currentQuery = buildQuery();

  return (
    <div className="w-full min-h-screen flex flex-col">
      <div className="w-full flex-1">
        <div className="p-6 pb-24">
          <CardGrid
            isLoading={isLoading}
            notes={notes}
            activeViewId={activeViewId}
            currentQuery={currentQuery}
            refreshData={() => fetchNotes(pagination.currentPage, pagination.pageSize)}
            onCreateView={() => setIsCreateViewModalOpen(true)}
          />
        </div>
      </div>

      <ViewEditorModal
        isOpen={isCreateViewModalOpen}
        onClose={() => setIsCreateViewModalOpen(false)}
        viewToEdit={null}
      />

      {editMode && (
        <EditToolbar
          notes={notes}
          onRefresh={() => fetchNotes(pagination.currentPage, pagination.pageSize)}
        />
      )}

      {practiceMode && (
        <PracticeToolbar
          notes={notes}
          onStartPractice={(ids) => {
            setPracticeNoteIds(ids);
            setIsPracticeSetupOpen(true);
          }}
        />
      )}

      {!editMode && !practiceMode && pagination.totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-10">
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isLoading}
          />
        </div>
      )}

      {activeView && (
        <PracticeSetupModal
          isOpen={isPracticeSetupOpen}
          onClose={() => setIsPracticeSetupOpen(false)}
          onStart={(opts) => {
            setIsPracticeSetupOpen(false);
            setPracticeSessionOptions(opts);
          }}
          view={activeView}
          noteIds={practiceNoteIds}
          notes={notes}
          weakFilter={weakFilter}
        />
      )}

      {practiceSessionOptions && (
        <PracticeSession
          sessionOptions={practiceSessionOptions}
          onClose={() => {
            setPracticeSessionOptions(null);
            fetchWeakCount();
          }}
        />
      )}
    </div>
  );
};

export default CardBrowser;
