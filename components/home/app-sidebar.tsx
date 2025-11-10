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
            {notes.map((note) => {
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
            })}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
