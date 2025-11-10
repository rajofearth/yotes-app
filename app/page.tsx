"use client";

import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/home/app-sidebar";
import { HomeMenubar } from "@/components/home/menubar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { initialNotes } from "@/lib/data";
import type { Note } from "@/lib/types";

export default function Home() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const notesMap = useMemo(
    () => new Map(notes.map((note) => [note.id, note])),
    [notes],
  );

  const selectedNote = useMemo(
    () => (selectedNoteId ? notesMap.get(selectedNoteId) : undefined),
    [notesMap, selectedNoteId],
  );

  const handleNoteSelect = (note: Note) => {
    setSelectedNoteId(note.id);
  };

  const handleContentChange = (content: string) => {
    if (!selectedNoteId) return;

    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === selectedNoteId ? { ...note, content } : note,
      ),
    );
  };

  return (
    <SidebarProvider>
      <AppSidebar
        notes={notes}
        onNoteSelect={handleNoteSelect}
        selectedNoteId={selectedNoteId || undefined}
      />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <HomeMenubar />
        </header>
        <div className="flex flex-1 flex-col p-4">
          {selectedNote && (
            <Textarea
              value={selectedNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 min-h-[400px] resize-none border-0 p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent dark:bg-transparent"
              placeholder="Start typing..."
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
