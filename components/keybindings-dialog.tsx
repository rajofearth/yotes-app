"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getKeybindingsByCategory } from "@/lib/keybindings";
import { cn } from "@/lib/utils";

type KeybindingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KeybindingsDialog({
  open,
  onOpenChange,
}: KeybindingsDialogProps) {
  const keybindingsByCategory = getKeybindingsByCategory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            All available keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {Object.entries(keybindingsByCategory).map(([category, bindings]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-1">
                {bindings.map((binding) => (
                  <div
                    key={binding.id}
                    className={cn(
                      "flex items-center justify-between rounded-sm px-2 py-1.5",
                      "hover:bg-accent transition-colors",
                    )}
                  >
                    <span className="text-sm">{binding.label}</span>
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                      {binding.display}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
