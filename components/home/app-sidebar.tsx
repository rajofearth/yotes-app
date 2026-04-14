"use client";

import { Trash2, X } from "lucide-react";
import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar";
import type { Note } from "@/lib/types";
import { cn, formatNoteDate, getNoteTitle } from "@/lib/utils";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  notes: Note[];
  onNoteSelect?: (note: Note) => void;
  onNoteDelete?: (note: Note) => void;
  selectedNoteId?: string;
};

export function AppSidebar({
  notes,
  onNoteSelect,
  onNoteDelete,
  selectedNoteId,
  ...props
}: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearch = React.useDeferredValue(searchQuery);
  const normalizedQuery = React.useMemo(
    () => deferredSearch.trim().toLowerCase(),
    [deferredSearch],
  );

  const handleSearchChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [],
  );

  const handleSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && searchQuery) {
        event.preventDefault();
        setSearchQuery("");
      }
    },
    [searchQuery],
  );

  const handleClearSearch = React.useCallback(() => {
    setSearchQuery("");
  }, []);

  const filteredNotes = React.useMemo(() => {
    if (!normalizedQuery) {
      return notes;
    }

    return notes.filter((note) => {
      const title = getNoteTitle(note.content).toLowerCase();
      const content = note.content.toLowerCase();
      return (
        title.includes(normalizedQuery) || content.includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, notes]);

  const handleNoteClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, note: Note) => {
      event.preventDefault();
      onNoteSelect?.(note);
    },
    [onNoteSelect],
  );

  const hasNotes = notes.length > 0;
  const hasResults = filteredNotes.length > 0;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-3.5 border-b p-2.5">
        <div className="relative flex items-center">
          <SidebarInput
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search notes..."
            aria-label="Search notes"
            autoComplete="off"
            spellCheck={false}
            className="pr-8"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 text-muted-foreground/80 transition hover:text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 hover:bg-accent hover:rounded" />
            </button>
          ) : null}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {!hasNotes ? (
              <div className="px-4 pt-6 flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">No notes yet.</p>
                <p className="text-xs text-muted-foreground/50">
                  Create your first note to get started.
                </p>
              </div>
            ) : !hasResults ? (
              <div className="px-4 pt-6 flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">
                  No matches for "{searchQuery}" yet.
                </p>
                <p className="text-xs text-muted-foreground/50">
                  Try a different note or create one.
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const title = getNoteTitle(note.content);
                const date = formatNoteDate(note.updatedAt);
                const isActive = selectedNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    className="relative group/note border-b last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleNoteClick(e, note)}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 p-4 text-left text-sm leading-tight pr-10",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <span className="font-medium truncate w-full">
                        {title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {date}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNoteDelete?.(note);
                      }}
                      className="absolute right-3 bottom-3.5 opacity-0 group-hover/note:opacity-100 text-muted-foreground/40 hover:text-destructive transition-opacity"
                      aria-label="Delete note"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
