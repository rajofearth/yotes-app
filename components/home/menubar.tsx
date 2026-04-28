"use client";

import {
  AlertTriangle,
  ChevronRight,
  CloudCheck,
  Info,
  Keyboard,
  LogOut,
  SunMoon,
  Upload,
  User,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { ImportConflictSheet } from "@/components/import-conflict-sheet";
import { KeybindingsDialog } from "@/components/keybindings-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import {
  applyImportChoices,
  buildImportDryRun,
  downloadNotesBackup,
  type ImportConflictResolution,
  type ImportDryRun,
  parseNotesBackup,
  type ResolutionKey,
  serializeNotesBackup,
} from "@/lib/backup";
import { bulkUpsertNotesAndImages, getAllNotes, getImage } from "@/lib/indexdb";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HomeMenubarProps {
  onCreateNote?: () => void;
  onPrint?: () => void;
  onNotesReload?: () => void | Promise<void>;
}

export function HomeMenubar({
  onCreateNote,
  onPrint,
  onNotesReload,
}: HomeMenubarProps) {
  const { toggleTheme } = useThemeToggle();
  const { open, setOpen } = useKeybindingsDialog();
  const [profileOpen, setProfileOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(
    null,
  );
  const [conflictDryRun, setConflictDryRun] = useState<ImportDryRun | null>(
    null,
  );
  const [conflictSession, setConflictSession] = useState(0);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const handleBackup = useCallback(async () => {
    const notes: Note[] = await getAllNotes();
    const serialized = await serializeNotesBackup(notes, getImage);
    downloadNotesBackup(serialized);
  }, []);

  const resetConflictFlow = useCallback(() => {
    setConflictDryRun(null);
    setConflictOpen(false);
    setApplyBusy(false);
  }, []);

  const handleImportFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setImportError(null);
      setLastImportSummary(null);
      resetConflictFlow();

      setImportBusy(true);
      try {
        const text = await file.text();
        const parsed = parseNotesBackup(text);
        const local = await getAllNotes();
        const dryRun = await buildImportDryRun(local, getImage, parsed);

        if (dryRun.conflicts.length === 0) {
          const { notes, images } = applyImportChoices(dryRun, new Map());
          await bulkUpsertNotesAndImages(notes, images);
          await onNotesReload?.();
          setLastImportSummary(
            `Imported ${notes.length} note update(s) and ${images.length} image(s); no conflicts.`,
          );
        } else {
          setConflictSession((n) => n + 1);
          setConflictDryRun(dryRun);
          setConflictOpen(true);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Import failed unexpectedly.";
        setImportError(message);
      } finally {
        setImportBusy(false);
      }
    },
    [onNotesReload, resetConflictFlow],
  );

  const handleConflictApply = useCallback(
    async (choices: Map<ResolutionKey, ImportConflictResolution>) => {
      if (!conflictDryRun) return;
      setApplyBusy(true);
      try {
        const { notes, images } = applyImportChoices(conflictDryRun, choices);
        await bulkUpsertNotesAndImages(notes, images);
        await onNotesReload?.();
        setLastImportSummary(
          `Import applied: ${notes.length} note write(s), ${images.length} image write(s), ${conflictDryRun.conflicts.length} conflict(s) resolved.`,
        );
        resetConflictFlow();
        setProfileOpen(false);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "Failed to apply import resolutions.";
        setImportError(message);
      } finally {
        setApplyBusy(false);
      }
    },
    [conflictDryRun, onNotesReload, resetConflictFlow],
  );

  return (
    <>
      <Menubar className="border-0">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onCreateNote}>
              New Note <MenubarShortcut>⌥N</MenubarShortcut>
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
            <MenubarItem onClick={onPrint}>
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
                  Search the web <MenubarShortcut>⌥L</MenubarShortcut>
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
            <MenubarSub>
              <MenubarSubTrigger>Zoom</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>
                  Zoom In <MenubarShortcut>⌘+Plus</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  Zoom Out <MenubarShortcut>⌘+Minus</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  Zoom Reset <MenubarShortcut>⌘+0</MenubarShortcut>
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
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
            <MenubarItem onClick={handleBackup}>
              <CloudCheck />
              Backup Notes
            </MenubarItem>
            <MenubarItem onClick={toggleTheme}>
              <SunMoon />
              Toggle Theme <MenubarShortcut>⌥T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => setOpen(true)}>
              <Keyboard />
              Keybindings <MenubarShortcut>⌘K</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setProfileOpen(true)}>
              <User /> Profile
            </MenubarItem>
            <MenubarItem>
              <LogOut /> Logout
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <KeybindingsDialog open={open} onOpenChange={setOpen} />
      {conflictDryRun ? (
        <ImportConflictSheet
          key={conflictSession}
          open={conflictOpen}
          onOpenChange={(next) => {
            if (!next) resetConflictFlow();
          }}
          dryRun={conflictDryRun}
          applying={applyBusy}
          onCancel={resetConflictFlow}
          onApply={handleConflictApply}
        />
      ) : null}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent
          className="sm:max-w-md backdrop-blur-md bg-background/60 border-border/50 shadow-2xl"
          showCloseButton
        >
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold tracking-tight">
              Import Backup
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Select a JSON backup file. Conflicts with existing notes or
              embedded images will be resolved individually.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {/* File picker area */}
            <div className="space-y-1.5">
              <Label
                htmlFor={fileInputId}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Backup file
              </Label>
              <label
                htmlFor={fileInputId}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border border-dashed border-input/40 px-4 py-3.5 cursor-pointer transition-all",
                  "hover:border-input hover:bg-muted/20",
                  importBusy && "pointer-events-none opacity-40",
                )}
              >
                <Upload className="h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                    Choose a file…
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    .json
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                <input
                  id={fileInputId}
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  disabled={importBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    void handleImportFile(file);
                  }}
                />
              </label>
            </div>

            {/* Status messages */}
            {importError && (
              <div className="flex items-center gap-2 px-1 py-0.5">
                <AlertTriangle className="h-3 w-3 shrink-0 text-destructive/70" />
                <p className="text-xs text-destructive/80 leading-relaxed">
                  {importError}
                </p>
              </div>
            )}

            {lastImportSummary && !importError && (
              <div className="flex items-start gap-2 rounded-md bg-muted/50 border border-border px-3 py-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lastImportSummary}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProfileOpen(false)}
              disabled={importBusy}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
