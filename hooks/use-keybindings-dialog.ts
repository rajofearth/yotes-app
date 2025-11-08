"use client";

import { useState } from "react";
import { useKeybinding } from "./use-keybinding";

/**
 * Hook for managing keybindings dialog state and keyboard shortcut.
 * Opens the dialog with ⌘K / Ctrl+K shortcut.
 */
export function useKeybindingsDialog() {
  const [open, setOpen] = useState(false);

  useKeybinding(
    () => {
      setOpen((prev) => !prev);
    },
    {
      key: "k",
      metaKey: true,
      ctrlKey: true,
      preventDefault: true,
      ignoreInput: true,
    },
  );

  return {
    open,
    setOpen,
  };
}

