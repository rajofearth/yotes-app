"use client";

import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { AppSidebar } from "@/components/home/app-sidebar";
import { HomeMenubar } from "@/components/home/menubar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { Note } from "@/lib/types";
import { getAllNotes, getNote, createNote, updateNote } from "@/lib/indexdb";
import { useNewNoteKeybinding } from "@/hooks/use-new-note-keybinding";
import "@mdxeditor/editor/style.css";

const Editor = lazy(() => import("@/components/editor"));

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );
  const [isLoading, setIsLoading] = useState(true);

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

  const handleNoteSelect = (note: Note) => {
    setSelectedNoteId(note.id);
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
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote("");
      setNotes((prevNotes) => [newNote, ...prevNotes]);
      handleNoteSelect(newNote);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  // Keyboard shortcut for creating new notes
  useNewNoteKeybinding(handleCreateNote);

  return (
    <SidebarProvider>
      <AppSidebar
        notes={isLoading ? [] : notes}
        onNoteSelect={handleNoteSelect}
        selectedNoteId={selectedNoteId || undefined}
      />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <HomeMenubar onCreateNote={handleCreateNote} />
        </header>
        <div className="flex flex-1 flex-col p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-muted-foreground">Loading notes...</div>
            </div>
          ) : selectedNote ? (
            <Suspense fallback={<div>Loading editor...</div>}>
              <Editor
                key={selectedNote.id}
                markdown={selectedNote.content}
                onChange={handleContentChange}
              />
            </Suspense>
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
