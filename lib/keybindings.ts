import type { KeybindingOptions } from "@/hooks/use-keybinding";

export type KeybindingDefinition = {
  id: string;
  label: string;
  category: string;
  options: KeybindingOptions;
  display: string;
};

/**
 * Centralized keybindings configuration - single source of truth.
 * All keyboard shortcuts are defined here.
 */
export const keybindings: KeybindingDefinition[] = [
  // File
  {
    id: "new-note",
    label: "New Note",
    category: "File",
    options: { key: "t", metaKey: true, ctrlKey: true },
    display: "⌘T",
  },
  {
    id: "new-window",
    label: "New Window",
    category: "File",
    options: { key: "n", metaKey: true, ctrlKey: true },
    display: "⌘N",
  },
  {
    id: "print",
    label: "Print...",
    category: "File",
    options: { key: "p", metaKey: true, ctrlKey: true },
    display: "⌘P",
  },
  // Edit
  {
    id: "undo",
    label: "Undo",
    category: "Edit",
    options: { key: "z", metaKey: true, ctrlKey: true },
    display: "⌘Z",
  },
  {
    id: "redo",
    label: "Redo",
    category: "Edit",
    options: { key: "z", metaKey: true, ctrlKey: true, shiftKey: true },
    display: "⇧⌘Z",
  },
  {
    id: "cut",
    label: "Cut",
    category: "Edit",
    options: { key: "x", metaKey: true, ctrlKey: true },
    display: "⌘X",
  },
  {
    id: "copy",
    label: "Copy",
    category: "Edit",
    options: { key: "c", metaKey: true, ctrlKey: true },
    display: "⌘C",
  },
  {
    id: "paste",
    label: "Paste",
    category: "Edit",
    options: { key: "v", metaKey: true, ctrlKey: true },
    display: "⌘V",
  },
  {
    id: "find",
    label: "Find...",
    category: "Edit",
    options: { key: "f", metaKey: true, ctrlKey: true },
    display: "⌘F",
  },
  {
    id: "find-next",
    label: "Find Next",
    category: "Edit",
    options: { key: "g", metaKey: true, ctrlKey: true },
    display: "⌘G",
  },
  {
    id: "find-previous",
    label: "Find Previous",
    category: "Edit",
    options: { key: "g", metaKey: true, ctrlKey: true, shiftKey: true },
    display: "⇧⌘G",
  },
  {
    id: "search-web",
    label: "Search the web",
    category: "Edit",
    options: { key: "l", metaKey: true, ctrlKey: true },
    display: "⌘L",
  },
  // Settings
  {
    id: "toggle-theme",
    label: "Toggle Theme",
    category: "Settings",
    options: { key: "t", metaKey: true, ctrlKey: true },
    display: "⌘T",
  },
  {
    id: "keybindings",
    label: "Keybindings",
    category: "Settings",
    options: { key: "k", metaKey: true, ctrlKey: true },
    display: "⌘K",
  },
];

/**
 * Get keybindings grouped by category
 */
export function getKeybindingsByCategory(): Record<string, KeybindingDefinition[]> {
  return keybindings.reduce(
    (acc, binding) => {
      if (!acc[binding.category]) {
        acc[binding.category] = [];
      }
      acc[binding.category].push(binding);
      return acc;
    },
    {} as Record<string, KeybindingDefinition[]>,
  );
}

/**
 * Find a keybinding by ID
 */
export function getKeybinding(id: string): KeybindingDefinition | undefined {
  return keybindings.find((binding) => binding.id === id);
}

