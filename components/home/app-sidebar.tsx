"use client";

import type * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  const handleNoteClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    note: Note,
  ) => {
    e.preventDefault();
    onNoteSelect?.(note);
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-3.5 border-b p-2.5">
        <SidebarInput placeholder="Type to search..." />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {notes.length === 0 ? (
              <Empty className="border-dashed border-0">
                <EmptyMedia>
                  <svg
                    className="size-12 text-muted-foreground/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
            ) : (
              notes.map((note) => {
                const title = getNoteTitle(note.content);
                const date = formatNoteDate(note.createdAt);
                const isActive = selectedNoteId === note.id;
                return (
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
                    <span className="font-medium truncate w-full">{title}</span>
                    <span className="text-xs text-muted-foreground">{date}</span>
                  </button>
                );
              })
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
