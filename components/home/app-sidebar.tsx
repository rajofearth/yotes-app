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
import { formatNoteDate, getNoteTitle } from "@/lib/utils"

const notes = [
  {
    id: "1",
    content: "Meeting Tomorrow\nHi team, just a reminder about our meeting tomorrow at 10 AM.",
    createdAt: new Date("2025-10-29T14:27:00"),
  },
  {
    id: "2",
    content: "Re: Project Update\nThanks for the update. The progress looks great so far.",
    createdAt: new Date("2025-10-28T09:15:00"),
  },
  {
    id: "3",
    content: "Weekend Plans\nHey everyone! I'm thinking of organizing a team outing this weekend.",
    createdAt: new Date("2025-10-27T16:45:00"),
  },
  {
    id: "4",
    content: "Re: Question about Budget\nI've reviewed the budget numbers you sent over.",
    createdAt: new Date("2025-10-27T11:20:00"),
  },
  {
    id: "5",
    content: "Important Announcement\nPlease join us for an all-hands meeting this Friday at 3 PM.",
    createdAt: new Date("2025-10-22T10:00:00"),
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
              return (
                <a
                  href="#"
                  key={note.id}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-1 border-b p-4 text-sm leading-tight last:border-b-0"
                >
                  <span className="font-medium">{title}</span>
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
