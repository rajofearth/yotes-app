"use client";

import { useEffect, useRef, useState } from "react";
import { AppSidebar } from "@/components/home/app-sidebar";
import { HomeMenubar } from "@/components/home/menubar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import type { Note } from "@/lib/types";
import { getAllNotes, getNote, createNote, updateNote } from "@/lib/indexdb";
import { useNewNoteKeybinding } from "@/hooks/use-new-note-keybinding";
import { useReactToPrint } from "react-to-print";
import { usePrintKeybinding } from "@/hooks/use-print-keybinding";

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // Load notes on component mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const allNotes = await getAllNotes();
        setNotes(allNotes);
      } catch (error) {
        console.error("Failed to load notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, []);

  const handleNoteSelect = async (note: Note) => {
    setSelectedNoteId(note.id);
    setSelectedNote(await getNote(note.id));
  };

  const handleContentChange = async (content: string) => {
    if (!selectedNote) return;

    try {
      // Update in IndexedDB
      const updatedNote = await updateNote(selectedNote.id, content);

      // Update local state
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === selectedNoteId ? updatedNote : note,
        ),
      );

      // Update selected note
      setSelectedNote(updatedNote);
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote("");
      setNotes((prevNotes) => [newNote, ...prevNotes]);
      await handleNoteSelect(newNote);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  // Keyboard shortcut for creating new notes
  useNewNoteKeybinding(handleCreateNote);

  // Keyboard shortcut for printing notes
  usePrintKeybinding(() => {
    reactToPrintFn();
  });

  return (
    <SidebarProvider>
      <AppSidebar
        notes={isLoading ? [] : notes}
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
          <HomeMenubar
            onCreateNote={handleCreateNote}
            onPrint={() => reactToPrintFn()}
          />
        </header>
        <div className="flex flex-1 flex-col p-4" ref={contentRef}>
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-muted-foreground">Loading notes...</div>
            </div>
          ) : selectedNote ? (
            <Textarea
              value={selectedNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 min-h-100 resize-none border-0 p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent dark:bg-transparent"
              placeholder="Start typing..."
            />
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="text-muted-foreground">
                Select a note to start editing
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
