"use client";

import { CloudCheck, Keyboard, LogOut, SunMoon, User } from "lucide-react";
import { KeybindingsDialog } from "@/components/keybindings-dialog";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useKeybindingsDialog } from "@/hooks/use-keybindings-dialog";
import { useThemeToggle } from "@/hooks/use-theme-toggle";

interface HomeMenubarProps {
  onCreateNote?: () => void;
}

export function HomeMenubar({ onCreateNote }: HomeMenubarProps) {
  const { toggleTheme } = useThemeToggle();
  const { open, setOpen } = useKeybindingsDialog();

  return (
    <>
      <Menubar className="border-0">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onCreateNote}>
              New Note <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              New Window <MenubarShortcut>⌘W</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Email link</MenubarItem>
                <MenubarItem>Messages</MenubarItem>
                <MenubarItem>Notes</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Find</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>
                  Search the web <MenubarShortcut>⌘L</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem>
                  Find... <MenubarShortcut>⌘F</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  Find Next <MenubarShortcut>⌘G</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  Find Previous <MenubarShortcut>⇧⌘G</MenubarShortcut>
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>
              Cut <MenubarShortcut>⌘X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Copy <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Paste <MenubarShortcut>⌘V</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>
              Always Show Full URLs
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>Toggle Fullscreen</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Hide Sidebar</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Settings</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <CloudCheck />
              Backup Notes
            </MenubarItem>
            <MenubarItem onClick={toggleTheme}>
              <SunMoon />
              Toggle Theme <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => setOpen(true)}>
              <Keyboard />
              Keybindings <MenubarShortcut>⌘K</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              {" "}
              <User /> Profile
            </MenubarItem>
            <MenubarItem>
              {" "}
              <LogOut /> Logout
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <KeybindingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
