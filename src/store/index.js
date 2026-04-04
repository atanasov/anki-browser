/**
 * Zustand Store
 * Simplified store that syncs with dataService
 * All data operations go through dataService for consistency
 * NOTE: We do NOT use Zustand's persist middleware because dataService handles all localStorage operations
 */

import { create } from "zustand";
import dataService from "../services/dataService";

const useStore = create((set) => ({
  // State synced from dataService
  ...dataService.getData(),

  // Non-persisted session state
  editMode: false,
  practiceMode: false,
  selectedNoteIds: [],
  searchQuery: "", // temporary text search, cleared on view switch
  currentPageNoteIds: [], // note IDs currently visible on the card browser page
  weakFilter: false, // when true, appends tag:weak* to the query
  weakCount: 0,      // number of weak cards in the current view (fetched after sessions / view switch)

  // Sync method — preserves session state that isn't in dataService
  sync: () =>
    set((state) => ({
      ...dataService.getData(),
      editMode: state.editMode,
      practiceMode: state.practiceMode,
      selectedNoteIds: state.selectedNoteIds,
      searchQuery: state.searchQuery,
    })),

  // Settings
  updateSettings: (updates) => {
    dataService.updateSettings(updates);
    set({ settings: dataService.getSettings() });
  },

  getSetting: (key, defaultValue) => dataService.getSetting(key, defaultValue),

  // Theme
  getTheme: () => dataService.getTheme(),
  setTheme: (theme) => {
    dataService.setTheme(theme);
    set({ theme: dataService.getTheme() });
  },

  // Views
  getViews: () => dataService.getViews(),
  getView: (id) => dataService.getView(id),
  getActiveView: () => dataService.getActiveView(),

  createView: (viewData) => {
    const newView = dataService.createView(viewData);
    const updates = { views: dataService.getViews() };
    // Auto-set as active view if nothing is active yet
    if (!dataService.getSettings().activeViewId) {
      dataService.setActiveView(newView.id);
      updates.settings = dataService.getSettings();
    }
    set(updates);
    return newView;
  },

  updateView: (id, updates) => {
    const success = dataService.updateView(id, updates);
    if (success) set({ views: dataService.getViews() });
    return success;
  },

  deleteView: (id) => {
    const success = dataService.deleteView(id);
    if (success)
      set({
        views: dataService.getViews(),
        settings: dataService.getSettings(),
        editMode: false,
        practiceMode: false,
        selectedNoteIds: [],
      });
    return success;
  },

  setActiveView: (id) => {
    const success = dataService.setActiveView(id);
    if (success)
      set({
        settings: dataService.getSettings(),
        views: dataService.getViews(),
        editMode: false,
        practiceMode: false,
        selectedNoteIds: [],
        searchQuery: "",
        weakFilter: false,
        weakCount: 0,
      });
    return success;
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCurrentPageNoteIds: (ids) => set({ currentPageNoteIds: ids }),
  toggleWeakFilter: () => set((state) => ({ weakFilter: !state.weakFilter })),
  setWeakCount: (count) => set({ weakCount: count }),

  // Edit / practice mode
  toggleEditMode: () =>
    set((state) => ({ editMode: !state.editMode, practiceMode: false, selectedNoteIds: [] })),
  setEditMode: (mode) => set({ editMode: mode, practiceMode: false, selectedNoteIds: [] }),
  togglePracticeMode: () =>
    set((state) => ({ practiceMode: !state.practiceMode, editMode: false, selectedNoteIds: [] })),
  setPracticeMode: (mode) => set({ practiceMode: mode, editMode: false, selectedNoteIds: [] }),
  toggleNoteSelection: (noteId) =>
    set((state) => ({
      selectedNoteIds: state.selectedNoteIds.includes(noteId)
        ? state.selectedNoteIds.filter((id) => id !== noteId)
        : [...state.selectedNoteIds, noteId],
    })),
  selectAllNotes: (noteIds) => set({ selectedNoteIds: noteIds }),
  clearSelection: () => set({ selectedNoteIds: [] }),

  // Saved Words
  addSavedWord: (text) => {
    const entry = dataService.addSavedWord(text);
    set({ savedWords: dataService.getSavedWords() });
    return entry;
  },
  updateSavedWord: (id, updates) => {
    dataService.updateSavedWord(id, updates);
    set({ savedWords: dataService.getSavedWords() });
  },
  removeSavedWord: (id) => {
    dataService.removeSavedWord(id);
    set({ savedWords: dataService.getSavedWords() });
  },

  // Utility
  exportData: () => dataService.exportData(),
  importData: (jsonString, overwrite) => {
    const success = dataService.importData(jsonString, overwrite);
    if (success) set({ ...dataService.getData(), editMode: false, practiceMode: false, selectedNoteIds: [] });
    return success;
  },
  resetAll: () => {
    dataService.resetAll();
    set({ ...dataService.getData(), editMode: false, practiceMode: false, selectedNoteIds: [] });
  },
}));

// Sync store when dataService changes
dataService.addListener(() => {
  useStore.getState().sync();
});

export default useStore;
