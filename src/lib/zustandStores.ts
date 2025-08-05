// app/lib/ZustandStates/useCurrentPageSelection.ts

import { create } from 'zustand'

/**
 * Interface for the state managed by the useCurrentPageSelection store.
 * * @property {string | null} selectedItem - The title or name of the currently selected sidebar item (e.g., "Presage", "Lab Testing Failures").
 * @property {string | null} selectedParent - The title of the parent group for the selected item (e.g., "Systems", "Chats").
 * @property {string | null} selectedUrl - The URL of the currently selected item.
 * @property {(selection: { item: string; parent: string; url: string }) => void} setSelection - Action to update the current selection.
 * @property {() => void} clearSelection - Action to clear the current selection.
 */
interface PageSelectionState {
  selectedItem: string | null
  selectedParent: string | null
  selectedUrl: string | null
  setSelection: (selection: { item: string; parent: string; url: string }) => void
  clearSelection: () => void
}

/**
 * A Zustand store to manage the state of the user's current page selection from the sidebar.
 * This allows any component in the application to know which page or view is currently active.
 */
export const useCurrentPageSelection = create<PageSelectionState>((set) => ({
  // Initial state
  selectedItem: null,
  selectedParent: null,
  selectedUrl: null,

  /**
   * Sets the current page selection based on user interaction.
   * @param selection - An object containing the item, its parent, and its URL.
   */
  setSelection: (selection) =>
    set({
      selectedItem: selection.item,
      selectedParent: selection.parent,
      selectedUrl: selection.url,
    }),

  /**
   * Resets the selection state to its initial values.
   */
  clearSelection: () =>
    set({
      selectedItem: null,
      selectedParent: null,
      selectedUrl: null,
    }),
}))