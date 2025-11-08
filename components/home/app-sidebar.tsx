"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar"
import { formatNoteDate, getNoteTitle, cn } from "@/lib/utils"
import type { Note } from "@/lib/types"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  notes: Note[]
  onNoteSelect?: (note: Note) => void
  selectedNoteId?: string
}

export function AppSidebar({ notes, onNoteSelect, selectedNoteId, ...props }: AppSidebarProps) {
  const handleNoteClick = (e: React.MouseEvent<HTMLAnchorElement>, note: Note) => {
    e.preventDefault()
    onNoteSelect?.(note)
  }

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
                <a
                  href="#"
                  key={note.id}
                  onClick={(e) => handleNoteClick(e, note)}
                  className={cn(
                    "flex flex-col items-start gap-1 border-b p-4 text-sm leading-tight last:border-b-0 cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span className="font-medium truncate w-full">{title}</span>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </a>
              );
            })}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
