"use client";

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  InsertCodeBlock,
  InsertImage,
  imagePlugin,
  MDXEditor,
  searchPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { AppSidebar } from "@/components/home/app-sidebar";
import { HomeMenubar } from "@/components/home/menubar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useNewNoteKeybinding } from "@/hooks/use-new-note-keybinding";
import { usePrintKeybinding } from "@/hooks/use-print-keybinding";
import {
  createNote,
  deleteNote,
  getAllNotes,
  getImage,
  getNote,
  saveImage,
  updateNote,
} from "@/lib/indexdb";
import type { Note } from "@/lib/types";
import "@mdxeditor/editor/style.css";
import { useTheme } from "next-themes";
import { CustomImageDialog } from "@/components/editor/image-dialog";
import { MdxSearchToolbar } from "@/components/editor/mdxSearchToolbar";

const imageCache = new Map<string, string>();

export default function Home() {
  const { resolvedTheme } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({
    contentRef,
    onBeforePrint: () => {
      setIsPrinting(true);
      return new Promise((resolve) => setTimeout(resolve, 100));
    },
    onAfterPrint: () => setIsPrinting(false),
  });

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

  const handleNoteDelete = async (note: Note) => {
    try {
      await deleteNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));

      // If the deleted note was selected, clear the editor
      if (selectedNoteId === note.id) {
        setSelectedNoteId(null);
        setSelectedNote(null);
      }
    } catch {
      console.error(`Failed to delete note: ${note.id}`);
    }
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
      console.error(`Failed to update note: ${selectedNoteId}`, error);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote("");
      setNotes((prevNotes) => [newNote, ...prevNotes]);
      await handleNoteSelect(newNote);
    } catch (error) {
      console.error(`Failed to create note: ${error}`);
    }
  };

  // Keyboard shortcut for creating new notes
  useNewNoteKeybinding(handleCreateNote);

  // Keyboard shortcut for printing notes
  usePrintKeybinding(() => {
    reactToPrintFn();
  });

  const reloadNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes();
      setNotes(allNotes);w
    } catch (error) {
      console.error("Failed to reload notes:", error);
    }
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar
        notes={isLoading ? [] : notes}
        onNoteSelect={handleNoteSelect}
        onNoteDelete={handleNoteDelete}
        selectedNoteId={selectedNoteId || undefined}
      />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 self-stretch" />
          <HomeMenubar
            onCreateNote={handleCreateNote}
            onPrint={() => reactToPrintFn()}
            onNotesReload={reloadNotes}
          />
        </header>
        <div className="relative flex flex-1 flex-col p-4" ref={contentRef}>
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-muted-foreground">Loading notes...</div>
            </div>
          ) : selectedNote ? (
            <MDXEditor
              key={selectedNote.id}
              markdown={selectedNote.content}
              onChange={(e) => handleContentChange(e)}
              className={`flex-1 min-h-100 resize-none border-0 p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent dark:bg-transparent ${resolvedTheme === "dark" && !isPrinting ? "dark-theme dark-editor" : ""}`}
              placeholder="Start typing..."
              plugins={[
                searchPlugin(),
                toolbarPlugin({
                  toolbarClassName:
                    "flex-1 min-h-auto max-w-auto resize-none border-0 p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent dark:bg-transparent print:hidden",
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <BoldItalicUnderlineToggles />
                      <BlockTypeSelect />
                      <CreateLink />
                      <CodeToggle />
                      <InsertCodeBlock />
                      <InsertImage />
                      <MdxSearchToolbar />
                    </>
                  ),
                }),
                imagePlugin({
                  ImageDialog: CustomImageDialog,
                  imageUploadHandler: async (image) => {
                    const id = await saveImage(image);
                    return id;
                  },
                  imagePreviewHandler: async (imageSource) => {
                    if (imageSource.startsWith("img-")) {
                      if (imageCache.has(imageSource)) {
                        return imageCache.get(imageSource) || "";
                      }
                      const blob = await getImage(imageSource);
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        imageCache.set(imageSource, url);
                        return url;
                      }
                    }
                    return imageSource;
                  },
                }),
              ]}
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
