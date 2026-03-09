"use client";

import { getKeybinding } from "@/lib/keybindings";
import { useKeybinding } from "./use-keybinding";

/**
 * Hook for handling the "Print" keyboard shortcut (⌘P / Ctrl+P).
 * Automatically uses the keybinding configuration from keybindings.ts.
 *
 * @param onPrint - Function to call when the print shortcut is triggered
 */
export function usePrintKeybinding(onPrint: () => void) {
  const keybinding = getKeybinding("print");

  if (!keybinding) return;

  useKeybinding(onPrint, {
    ...keybinding.options,
    preventDefault: true,
    ignoreInput: false, // We want users to be able to print while the editor is focused
  });
}
