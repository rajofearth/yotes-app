import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date in the format "Oct 29 2025 at 2:27 PM"
 */
export function formatNoteDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours || 12;
  const minutesStr = minutes.toString().padStart(2, "0");

  return `${month} ${day} ${year} at ${hours}:${minutesStr} ${ampm}`;
}

/**
 * Extract the first line from note content to use as title
 */
export function getNoteTitle(content: string): string {
  const firstLine = content.split("\n")[0]?.trim();
  return firstLine || "Untitled";
}
