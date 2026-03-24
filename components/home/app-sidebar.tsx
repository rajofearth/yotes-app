"use client";

import * as React from "react";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  ClipboardPasteIcon,
  CopyIcon,
  PenBoxIcon,
  ScissorsIcon,
  TrashIcon,
} from "lucide-react";
import type { Note } from "@/lib/types";
import { cn, formatNoteDate, getNoteTitle } from "@/lib/utils";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  notes: Note[];
  onNoteSelect?: (note: Note) => void;
  selectedNoteId?: string;
};

export function AppSidebar({
  notes,
  onNoteSelect,
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
              <svg
                className="size-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M6 6l8 8m0-8l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {!hasNotes ? (
              <Empty className="border-dashed border-0">
                <EmptyMedia>
                  <svg
                    className="size-12 text-muted-foreground/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Empty notes icon"
                  >
                    <title>Empty notes icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </EmptyMedia>
                <EmptyTitle>No notes yet</EmptyTitle>
                <EmptyDescription>
                  Create your first note to get started.
                </EmptyDescription>
              </Empty>
            ) : !hasResults ? (
              <Empty className="border-dashed border-0">
                <EmptyMedia>
                  <svg
                    className="size-12 text-muted-foreground/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="No search results icon"
                  >
                    <title>No search results icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19.5 19.5l-2.475-2.475M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </EmptyMedia>
                <EmptyTitle>No matches found</EmptyTitle>
                <EmptyDescription>
                  No notes match{" "}
                  <span className="font-medium">
                    &ldquo;{searchQuery}&rdquo;
                  </span>
                  . Try a different keyword.
                </EmptyDescription>
              </Empty>
            ) : (
              filteredNotes.map((note) => {
                const title = getNoteTitle(note.content);
                const date = formatNoteDate(note.updatedAt);
                const isActive = selectedNoteId === note.id;
                return (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <button
                        type="button"
                        key={note.id}
                        onClick={(e) => handleNoteClick(e, note)}
                        className={cn(
                          "flex w-full flex-col items-start gap-1 border-b p-4 text-left text-sm leading-tight last:border-b-0",
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
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem>
                        <PenBoxIcon />
                        Rename
                      </ContextMenuItem>
                      <ContextMenuGroup>
                        <ContextMenuItem variant="destructive">
                          <TrashIcon />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuGroup>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
