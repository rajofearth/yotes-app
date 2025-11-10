import type { Note } from "./types";

export const initialNotes: Note[] = [
  {
    id: "1",
    content:
      "Meeting Tomorrow\nHi team, just a reminder about our meeting tomorrow at 10 AM.",
    createdAt: new Date("2025-10-29T14:27:00"),
  },
  {
    id: "2",
    content:
      "Re: Project Update\nThanks for the update. The progress looks great so far.",
    createdAt: new Date("2025-10-28T09:15:00"),
  },
  {
    id: "3",
    content:
      "Weekend Plans\nHey everyone! I'm thinking of organizing a team outing this weekend.",
    createdAt: new Date("2025-10-27T16:45:00"),
  },
  {
    id: "4",
    content:
      "Re: Question about Budget\nI've reviewed the budget numbers you sent over.",
    createdAt: new Date("2025-10-27T11:20:00"),
  },
  {
    id: "5",
    content:
      "Important Announcement\nPlease join us for an all-hands meeting this Friday at 3 PM.",
    createdAt: new Date("2025-10-22T10:00:00"),
  },
];
