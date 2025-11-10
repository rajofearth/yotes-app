"use client";

import { useTheme } from "next-themes";
import { useKeybinding } from "./use-keybinding";

/**
 * Hook for theme toggle functionality with keybinding support.
 * Provides a toggle function and automatically registers ⌘T / Ctrl+T shortcut.
 *
 * @param options - Keybinding options (optional, defaults to ⌘T/Ctrl+T)
 *
 * @example
 * ```tsx
 * const { toggleTheme } = useThemeToggle();
 *
 * return (
 *   <button onClick={toggleTheme}>
 *     Toggle Theme
 *   </button>
 * );
 * ```
 */
export function useThemeToggle(options?: { key?: string; enabled?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    const currentTheme = resolvedTheme ?? theme ?? "light";
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  // Register keybinding for theme toggle
  useKeybinding(
    () => {
      toggleTheme();
    },
    {
      key: options?.key ?? "t",
      metaKey: true,
      ctrlKey: true,
      preventDefault: true,
      ignoreInput: true,
      enabled: options?.enabled ?? true,
    },
  );

  return {
    toggleTheme,
    theme,
    resolvedTheme,
    setTheme,
  };
}
