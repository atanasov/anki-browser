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
  selectedNoteIds: [],
  searchQuery: "", // temporary text search, cleared on view switch

  // Sync method — preserves session state that isn't in dataService
  sync: () =>
    set((state) => ({
      ...dataService.getData(),
      editMode: state.editMode,
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
        selectedNoteIds: [],
        searchQuery: "",
      });
    return success;
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

  // Edit mode
  toggleEditMode: () =>
    set((state) => ({ editMode: !state.editMode, selectedNoteIds: [] })),
  setEditMode: (mode) => set({ editMode: mode, selectedNoteIds: [] }),
  toggleNoteSelection: (noteId) =>
    set((state) => ({
      selectedNoteIds: state.selectedNoteIds.includes(noteId)
        ? state.selectedNoteIds.filter((id) => id !== noteId)
        : [...state.selectedNoteIds, noteId],
    })),
  selectAllNotes: (noteIds) => set({ selectedNoteIds: noteIds }),
  clearSelection: () => set({ selectedNoteIds: [] }),

  // Utility
  exportData: () => dataService.exportData(),
  importData: (jsonString, overwrite) => {
    const success = dataService.importData(jsonString, overwrite);
    if (success) set({ ...dataService.getData(), editMode: false, selectedNoteIds: [] });
    return success;
  },
  resetAll: () => {
    dataService.resetAll();
    set({ ...dataService.getData(), editMode: false, selectedNoteIds: [] });
  },
}));

// Sync store when dataService changes
dataService.addListener(() => {
  useStore.getState().sync();
});

export default useStore;
