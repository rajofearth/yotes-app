"use client";

import DiffMatchPatch from "diff-match-patch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type ImportDryRun,
  type ResolutionKey,
  resolutionKey,
} from "@/lib/backup";
import { cn, splitNoteTitleBody } from "@/lib/utils";

/** diff-match-patch uses -1 / 0 / 1; avoid named imports from this CJS package (they can be undefined at runtime under ESM). */
const DMP_DIFF_DELETE = -1;
const DMP_DIFF_EQUAL = 0;
const DMP_DIFF_INSERT = 1;

const dmpSingleton = new DiffMatchPatch();

const markdownComponents: Partial<Components> = {
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  h1: (props) => (
    <h1 className="mt-3 mb-2 text-xl font-semibold first:mt-0" {...props} />
  ),
  h2: (props) => (
    <h2 className="mt-3 mb-2 text-lg font-semibold first:mt-0" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-2 mb-1.5 text-base font-semibold first:mt-0" {...props} />
  ),
  ul: (props) => <ul className="ml-5 list-disc space-y-1" {...props} />,
  ol: (props) => <ol className="ml-5 list-decimal space-y-1" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="border-l-2 border-foreground/20 pl-3 text-muted-foreground"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[13px]"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="overflow-x-auto rounded-md bg-foreground/10 p-2"
      {...props}
    />
  ),
  a: (props) => (
    <a className="text-primary underline underline-offset-4" {...props} />
  ),
  img: (props) => (
    // biome-ignore lint/performance/noImgElement: Markdown may reference blob/data URLs; next/image is not suitable here.
    <img
      {...props}
      alt={props.alt ?? ""}
      className="my-2 max-h-48 max-w-full rounded-md border border-border/60"
    />
  ),
};

function UnifiedContentDiff({
  before,
  after,
  plain = false,
}: {
  before: string;
  after: string;
  plain?: boolean;
}) {
  const segments = useMemo(() => {
    const raw = dmpSingleton.diff_main(before, after);
    dmpSingleton.diff_cleanupSemantic(raw);
    return raw;
  }, [before, after]);

  const renderBody = (text: string) =>
    plain ? (
      <span className="whitespace-pre-wrap break-words">{text}</span>
    ) : (
      <Markdown components={markdownComponents}>{text}</Markdown>
    );

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/40 text-sm leading-relaxed dark:bg-zinc-950/40">
      {segments.map(([op, text], i) => {
        if (!text) return null;

        if (op === DMP_DIFF_EQUAL) {
          return (
            <div
              key={`${i}-${text.length}`}
              className="border-l-4 border-transparent px-3 py-1.5 text-foreground"
            >
              {renderBody(text)}
            </div>
          );
        }

        const isInsert = op === DMP_DIFF_INSERT;
        const isDelete = op === DMP_DIFF_DELETE;
        if (!isInsert && !isDelete) return null;
        const gutter = isInsert ? "+" : "−";
        const rowClass = isInsert
          ? "border-l-4 border-emerald-500 bg-emerald-500/18 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950/55 dark:text-emerald-50"
          : "border-l-4 border-red-500 bg-red-500/18 text-red-950 dark:border-red-400 dark:bg-red-950/55 dark:text-red-50";

        return (
          <div
            key={`${i}-${text.length}`}
            className={cn("flex gap-2 px-2 py-1.5", rowClass)}
          >
            <div
              className={cn(
                "w-6 shrink-0 select-none pt-0.5 text-center text-xs font-bold tabular-nums",
                isInsert
                  ? "text-emerald-700 dark:text-emerald-200"
                  : "text-red-700 dark:text-red-200",
              )}
              aria-hidden
            >
              {gutter}
            </div>
            <div className="min-w-0 flex-1">{renderBody(text)}</div>
          </div>
        );
      })}
    </div>
  );
}

export type ImportConflictSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dryRun: ImportDryRun;
  applying?: boolean;
  onCancel: () => void;
  onApply: (
    choices: Map<ResolutionKey, "local" | "incoming">,
  ) => void | Promise<void>;
};

export function ImportConflictSheet({
  open,
  onOpenChange,
  dryRun,
  applying = false,
  onCancel,
  onApply,
}: ImportConflictSheetProps) {
  const { conflicts } = dryRun;
  const [activeIndex, setActiveIndex] = useState(0);
  const [choices, setChoices] = useState<
    Map<ResolutionKey, "local" | "incoming">
  >(() => new Map());
  const [panelWidthVw, setPanelWidthVw] = useState(75);
  const [isResizing, setIsResizing] = useState(false);
  const resizeOrigin = useRef<{ clientX: number; vw: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    setChoices(new Map());
  }, [open]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: PointerEvent) => {
      if (!resizeOrigin.current) return;
      const deltaPx = resizeOrigin.current.clientX - e.clientX;
      const deltaVw = (deltaPx / window.innerWidth) * 100;
      const next = resizeOrigin.current.vw + deltaVw;
      setPanelWidthVw(Math.min(95, Math.max(28, next)));
    };
    const onUp = () => {
      setIsResizing(false);
      resizeOrigin.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isResizing]);

  const current = conflicts[activeIndex] ?? null;
  const currentKey = current ? resolutionKey(current) : null;
  const currentChoice = currentKey ? choices.get(currentKey) : undefined;

  const [localUrl, incomingUrl] = useMemo(() => {
    if (!current || current.kind !== "image") {
      return [null, null] as const;
    }
    return [
      URL.createObjectURL(current.local),
      URL.createObjectURL(current.incoming),
    ] as const;
  }, [current]);

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
      if (incomingUrl) URL.revokeObjectURL(incomingUrl);
    };
  }, [localUrl, incomingUrl]);

  const allResolved =
    conflicts.length > 0 &&
    conflicts.every((c) => choices.has(resolutionKey(c)));

  const pick = useCallback(
    (choice: "local" | "incoming") => {
      if (!current) return;
      setChoices((prev) => {
        const next = new Map(prev);
        next.set(resolutionKey(current), choice);
        return next;
      });
      setActiveIndex((idx) =>
        Math.min(idx + 1, Math.max(conflicts.length - 1, 0)),
      );
    },
    [current, conflicts.length],
  );

  const handleApply = useCallback(() => {
    void onApply(choices);
  }, [choices, onApply]);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      resizeOrigin.current = { clientX: e.clientX, vw: panelWidthVw };
      setIsResizing(true);
    },
    [panelWidthVw],
  );

  const titleBody = useMemo(() => {
    if (!current || current.kind !== "note") return null;
    return {
      local: splitNoteTitleBody(current.local.content),
      incoming: splitNoteTitleBody(current.incoming.content),
    };
  }, [current]);

  const titlesDiffer =
    titleBody !== null && titleBody.local.title !== titleBody.incoming.title;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        overlayClassName="bg-background/35 backdrop-blur-sm data-open:animate-in"
        className={cn(
          "gap-0 border-l border-border/40 p-0 shadow-2xl",
          "flex h-dvh max-h-dvh flex-col bg-popover/55 backdrop-blur-xl supports-backdrop-filter:bg-popover/45",
          "data-[side=right]:w-auto data-[side=right]:max-w-none sm:data-[side=right]:max-w-none",
          isResizing && "select-none",
        )}
        style={{ width: `${panelWidthVw}vw`, maxWidth: `${panelWidthVw}vw` }}
      >
        <button
          type="button"
          aria-label="Resize import panel"
          className={cn(
            "absolute top-0 bottom-0 left-0 z-[60] w-3 cursor-col-resize touch-none border-0 bg-transparent p-0",
            "hover:bg-primary/15 active:bg-primary/25",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          )}
          onPointerDown={handleResizePointerDown}
        />

        <SheetHeader className="shrink-0 gap-3 border-b border-border/40 bg-popover/40 px-4 py-3 pl-5 backdrop-blur-md">
          <SheetTitle className="pr-10">Review import conflicts</SheetTitle>
          <SheetDescription className="sr-only">
            Green highlights additions from the import; red highlights text in
            your current note that the import would remove. Drag the left edge
            to resize this panel.
          </SheetDescription>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="glass"
                size="sm"
                disabled={applying || activeIndex === 0}
                onClick={() => setActiveIndex((i) => Math.max(i - 1, 0))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="glass"
                size="sm"
                disabled={applying || activeIndex >= conflicts.length - 1}
                onClick={() =>
                  setActiveIndex((i) => Math.min(i + 1, conflicts.length - 1))
                }
              >
                Next
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                variant="glass"
                size="sm"
                disabled={applying}
                onClick={() => {
                  onCancel();
                }}
              >
                Cancel import
              </Button>
              <Button
                type="button"
                variant="glass"
                size="sm"
                className="border-rose-500/35 bg-rose-500/15 text-rose-900 hover:bg-rose-500/25 dark:text-rose-50 dark:hover:bg-rose-500/25"
                disabled={!current || applying}
                onClick={() => pick("local")}
              >
                Keep current
              </Button>
              <Button
                type="button"
                variant="glass"
                size="sm"
                className="border-emerald-500/35 bg-emerald-500/15 text-emerald-950 hover:bg-emerald-500/25 dark:text-emerald-50 dark:hover:bg-emerald-500/25"
                disabled={!current || applying}
                onClick={() => pick("incoming")}
              >
                Use imported
              </Button>
              <Button
                type="button"
                variant="glassPrimary"
                size="sm"
                disabled={!allResolved || applying}
                onClick={handleApply}
              >
                {applying ? "Applying…" : "Apply import"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {conflicts.map((c, idx) => {
              const key = resolutionKey(c);
              const resolved = choices.has(key);
              const label =
                c.kind === "image" ? `Image ${c.id}` : `Note ${c.id}`;
              return (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={idx === activeIndex ? "default" : "glass"}
                  className={cn(
                    "h-8 max-w-[220px] truncate text-xs",
                    resolved &&
                      idx !== activeIndex &&
                      "border-emerald-500/40 dark:border-emerald-500/30",
                  )}
                  disabled={applying}
                  onClick={() => setActiveIndex(idx)}
                >
                  {label}
                  {resolved ? " · resolved" : ""}
                </Button>
              );
            })}
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4 pl-5">
          {!current ? (
            <p className="text-sm text-muted-foreground">
              No conflicts to review.
            </p>
          ) : current.kind === "note" && titleBody ? (
            <div className="space-y-6 pb-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {currentChoice
                    ? `Selected: ${currentChoice === "local" ? "current" : "imported"}`
                    : "Pick a version with the actions above"}
                </p>
              </div>

              <section
                className="space-y-2"
                aria-labelledby="import-note-title-heading"
              >
                <h3
                  id="import-note-title-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Note title
                </h3>
                {titlesDiffer ? (
                  <UnifiedContentDiff
                    plain
                    before={titleBody.local.title}
                    after={titleBody.incoming.title}
                  />
                ) : (
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
                    {titleBody.local.title}
                  </div>
                )}
              </section>

              <section
                className="space-y-2"
                aria-labelledby="import-note-body-heading"
              >
                <h3
                  id="import-note-body-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Markdown body
                </h3>
                <UnifiedContentDiff
                  before={titleBody.local.body}
                  after={titleBody.incoming.body}
                />
              </section>
            </div>
          ) : (
            <div className="space-y-4 pb-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Image</p>
                <p className="text-xs text-muted-foreground">
                  {currentChoice
                    ? `Selected: ${currentChoice === "local" ? "current" : "imported"}`
                    : "Pick a version with the actions above"}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-1">
                <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Current
                  </p>
                  {localUrl ? (
                    // biome-ignore lint/performance/noImgElement: Blob preview URL from IndexedDB import review.
                    <img
                      src={localUrl}
                      alt="Current version"
                      className="max-h-64 w-full max-w-full rounded-md object-contain"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Imported
                  </p>
                  {incomingUrl ? (
                    // biome-ignore lint/performance/noImgElement: Blob preview URL from backup import review.
                    <img
                      src={incomingUrl}
                      alt="Imported version"
                      className="max-h-64 w-full max-w-full rounded-md object-contain"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
