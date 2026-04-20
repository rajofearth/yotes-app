import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First line of trimmed content, or "Untitled note" when empty. */
export function splitNoteTitleBody(content: string): {
  title: string;
  body: string;
} {
  const lines = content.trim().split("\n");
  const rawTitle = lines[0]?.trim() ?? "";
  const title = rawTitle.length > 0 ? rawTitle : "Untitled note";
  const body = lines.length > 1 ? lines.slice(1).join("\n") : "";
  return { title, body };
}

export function getNoteTitle(content: string) {
  return splitNoteTitleBody(content).title;
}

export function formatNoteDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
