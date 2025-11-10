"use client";

import { useKeybinding } from "./use-keybinding";
import { getKeybinding } from "@/lib/keybindings";

/**
 * Hook for handling the "New Note" keyboard shortcut (⌘N / Ctrl+N).
 * Automatically uses the keybinding configuration from keybindings.ts.
 *
 * @param onCreateNote - Function to call when the new note shortcut is triggered
 *
 * @example
 * ```tsx
 * const handleCreateNote = () => {
 *   // Create a new note
 * };
 *
 * useNewNoteKeybinding(handleCreateNote);
 * ```
 */
export function useNewNoteKeybinding(onCreateNote: () => void) {
  const keybinding = getKeybinding("new-note");

  if (!keybinding) return;

  useKeybinding(onCreateNote, {
    ...keybinding.options,
    preventDefault: true,
    ignoreInput: true,
  });
}
