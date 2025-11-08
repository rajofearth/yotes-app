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

const notes = [
  {
    id: "1",
    title: "Meeting Tomorrow",
    author: "William Smith",
    date: "09:34 AM",
    preview: "Hi team, just a reminder about our meeting tomorrow at 10 AM.",
  },
  {
    id: "2",
    title: "Re: Project Update",
    author: "Alice Smith",
    date: "Yesterday",
    preview: "Thanks for the update. The progress looks great so far.",
  },
  {
    id: "3",
    title: "Weekend Plans",
    author: "Bob Johnson",
    date: "2 days ago",
    preview: "Hey everyone! I'm thinking of organizing a team outing this weekend.",
  },
  {
    id: "4",
    title: "Re: Question about Budget",
    author: "Emily Davis",
    date: "2 days ago",
    preview: "I've reviewed the budget numbers you sent over.",
  },
  {
    id: "5",
    title: "Important Announcement",
    author: "Michael Wilson",
    date: "1 week ago",
    preview: "Please join us for an all-hands meeting this Friday at 3 PM.",
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-3.5 border-b p-4">
        <SidebarInput placeholder="Type to search..." />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {notes.map((note) => (
              <a
                href="#"
                key={note.id}
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight last:border-b-0"
              >
                <div className="flex w-full items-center gap-2">
                  <span>{note.author}</span>
                  <span className="ml-auto text-xs">{note.date}</span>
                </div>
                <span className="font-medium">{note.title}</span>
                <span className="line-clamp-2 text-xs">{note.preview}</span>
              </a>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
