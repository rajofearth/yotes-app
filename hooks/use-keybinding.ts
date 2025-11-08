"use client";

import { useEffect, useEffectEvent } from "react";

export type KeybindingOptions = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: boolean;
  ignoreInput?: boolean;
};

type KeybindingHandler = (event: KeyboardEvent) => void;

/**
 * Hook for handling keyboard shortcuts with proper cleanup and event handling.
 * Uses useEffectEvent from React 19 to create stable event handlers.
 *
 * @param handler - The function to call when the keybinding is triggered
 * @param options - Keybinding configuration options
 *
 * @example
 * ```tsx
 * useKeybinding(
 *   () => {
 *     console.log('Theme toggled');
 *   },
 *   {
 *     key: 't',
 *     metaKey: true,
 *     preventDefault: true,
 *     ignoreInput: true,
 *   }
 * );
 * ```
 */
export function useKeybinding(
  handler: KeybindingHandler,
  options: KeybindingOptions,
) {
  const {
    key,
    metaKey = false,
    ctrlKey = false,
    shiftKey = false,
    altKey = false,
    preventDefault = true,
    stopPropagation = false,
    enabled = true,
    ignoreInput = true,
  } = options;

  // Use useEffectEvent to create a stable handler that doesn't need to be in deps
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check modifier keys
    if (metaKey && !event.metaKey && !event.ctrlKey) return;
    if (ctrlKey && !event.ctrlKey && !event.metaKey) return;
    if (shiftKey && !event.shiftKey) return;
    if (altKey && !event.altKey) return;

    // Check if other modifiers are not pressed when not expected
    if (!metaKey && !ctrlKey && (event.metaKey || event.ctrlKey)) return;
    if (!shiftKey && event.shiftKey) return;
    if (!altKey && event.altKey) return;

    // Check the key
    if (event.key.toLowerCase() !== key.toLowerCase()) return;

    // Ignore if typing in input fields
    if (ignoreInput) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
    }

    if (preventDefault) {
      event.preventDefault();
    }
    if (stopPropagation) {
      event.stopPropagation();
    }

    handler(event);
  });

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, onKeyDown]);
}

