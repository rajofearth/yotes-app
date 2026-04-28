"use client";

import { useTheme } from "next-themes";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AcceptRejectDiff } from "@/components/accept-reject-diff";
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
  conflictStableRowId,
  type ImportConflictResolution,
  type ImportDryRun,
  imageConflictResolutionKey,
  type ResolutionKey,
  resolutionKeysForConflict,
} from "@/lib/backup";
import { cn, splitNoteTitleBody } from "@/lib/utils";

/** Grid row collapse + opacity; pair with inner `min-h-0 overflow-hidden`. */
const RESOLVE_OUT_BASE =
  "grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none";
const RESOLVE_OUT_HIDDEN = "pointer-events-none grid-rows-[0fr] opacity-0";
const RESOLVE_OUT_VISIBLE = "grid-rows-[1fr] opacity-100";

function ResolveCollapse({
  resolved,
  afterCollapsed,
  durationMs = 520,
  className,
  children,
}: {
  resolved: boolean;
  afterCollapsed?: () => void;
  durationMs?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const afterRef = useRef(afterCollapsed);
  afterRef.current = afterCollapsed;

  useEffect(() => {
    if (!resolved) return;
    const cb = afterRef.current;
    if (!cb) return;
    const t = window.setTimeout(cb, durationMs);
    return () => window.clearTimeout(t);
  }, [resolved, durationMs]);

  return (
    <div
      className={cn(
        RESOLVE_OUT_BASE,
        resolved ? RESOLVE_OUT_HIDDEN : RESOLVE_OUT_VISIBLE,
        className,
      )}
      aria-hidden={resolved}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

function BinaryChoicePanel({
  storageKey,
  choice,
  disabled,
  hideButtons = false,
  onKeepCurrent,
  onAcceptIncoming,
  children,
}: {
  storageKey: ResolutionKey;
  choice: ImportConflictResolution | undefined;
  disabled: boolean;
  hideButtons?: boolean;
  onKeepCurrent: (key: ResolutionKey) => void;
  onAcceptIncoming: (key: ResolutionKey) => void;
  children: React.ReactNode;
}) {
  const resolved = choice === "local" || choice === "incoming";

  return (
    <ResolveCollapse resolved={resolved}>
      <div className="group/diffhover relative min-h-9 rounded-lg">
        {children}
        {!hideButtons && (
          <div
            className={cn(
              "absolute top-1.5 right-1.5 z-20 flex gap-1 transition-all duration-150",
              "pointer-events-none opacity-0 translate-y-0.5",
              "group-hover/diffhover:pointer-events-auto group-hover/diffhover:opacity-100 group-hover/diffhover:translate-y-0",
            )}
          >
            <div className="flex gap-1 rounded-lg border border-border/50 bg-popover/90 p-1 shadow-lg backdrop-blur-xl">
              <Button
                type="button"
                size="sm"
                disabled={disabled}
                className={cn(
                  "h-6 rounded-md border border-red-700/30 bg-red-600/90 px-2.5 text-[11px] font-medium text-white shadow-sm hover:bg-red-500",
                  "focus-visible:ring-2 focus-visible:ring-red-400/80",
                  choice === "local" &&
                    "ring-2 ring-red-300 ring-offset-1 ring-offset-background",
                )}
                onClick={() => onKeepCurrent(storageKey)}
              >
                Keep
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={disabled}
                className={cn(
                  "h-6 rounded-md border border-emerald-700/30 bg-emerald-600/90 px-2.5 text-[11px] font-medium text-white shadow-sm hover:bg-emerald-500",
                  "focus-visible:ring-2 focus-visible:ring-emerald-400/80",
                  choice === "incoming" &&
                    "ring-2 ring-emerald-300 ring-offset-1 ring-offset-background",
                )}
                onClick={() => onAcceptIncoming(storageKey)}
              >
                Accept
              </Button>
            </div>
          </div>
        )}
        {/* Persistent hover hint when unresolved */}
        {choice === undefined && !hideButtons && (
          <div
            className={cn(
              "absolute bottom-1.5 right-1.5 z-10 transition-opacity duration-150",
              "group-hover/diffhover:opacity-0 pointer-events-none",
            )}
          >
            <span className="rounded-md border border-border/30 bg-background/60 px-1.5 py-0.5 text-[9px] text-muted-foreground/50 backdrop-blur-sm">
              hover to resolve
            </span>
          </div>
        )}
      </div>
    </ResolveCollapse>
  );
}

function ImageBlobPair({ local, incoming }: { local: Blob; incoming: Blob }) {
  const [urls, setUrls] = useState<[string, string] | null>(null);

  useEffect(() => {
    const a = URL.createObjectURL(local);
    const b = URL.createObjectURL(incoming);
    setUrls([a, b]);
    return () => {
      URL.revokeObjectURL(a);
      URL.revokeObjectURL(b);
    };
  }, [local, incoming]);

  if (!urls) return null;
  const [currentSrc, incomingSrc] = urls;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-2">
        <p className="text-[11px] font-medium text-muted-foreground">Current</p>
        {/* biome-ignore lint/performance/noImgElement: Blob preview URL from IndexedDB import review. */}
        <img
          src={currentSrc}
          alt="Current version"
          className="max-h-40 w-full max-w-full rounded object-contain"
        />
      </div>
      <div className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          Imported
        </p>
        {/* biome-ignore lint/performance/noImgElement: Blob preview URL from backup import review. */}
        <img
          src={incomingSrc}
          alt="Imported version"
          className="max-h-40 w-full max-w-full rounded object-contain"
        />
      </div>
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
    choices: Map<ResolutionKey, ImportConflictResolution>,
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
  const { resolvedTheme, theme } = useTheme();
  const { conflicts } = dryRun;
  const [choices, setChoices] = useState<
    Map<ResolutionKey, ImportConflictResolution>
  >(() => new Map());
  const [dismissedRowIds, setDismissedRowIds] = useState(
    () => new Set<string>(),
  );
  const [panelWidthVw, setPanelWidthVw] = useState(75);
  const [isResizing, setIsResizing] = useState(false);
  const resizeOrigin = useRef<{ clientX: number; vw: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setChoices(new Map());
    setDismissedRowIds(new Set());
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

  const allResolved = useMemo(
    () =>
      conflicts.length > 0 &&
      conflicts.every((c) =>
        resolutionKeysForConflict(c).every((k) => choices.has(k)),
      ),
    [conflicts, choices],
  );

  const visibleConflicts = useMemo(
    () => conflicts.filter((c) => !dismissedRowIds.has(conflictStableRowId(c))),
    [conflicts, dismissedRowIds],
  );

  const pickChoice = useCallback(
    (key: ResolutionKey, choice: ImportConflictResolution) => {
      setChoices((prev) => {
        const next = new Map(prev);
        next.set(key, choice);
        return next;
      });
    },
    [],
  );

  const markRowDismissed = useCallback((rowId: string) => {
    setDismissedRowIds((prev) => {
      if (prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
  }, []);

  const handleKeep = useCallback(
    (key: ResolutionKey) => pickChoice(key, "local"),
    [pickChoice],
  );
  const handleAccept = useCallback(
    (key: ResolutionKey) => pickChoice(key, "incoming"),
    [pickChoice],
  );
  const handleApply = useCallback(() => {
    void onApply(choices);
  }, [choices, onApply]);
  const diffsTheme =
    (resolvedTheme ?? theme) === "dark" ? "pierre-dark" : "pierre-light";

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      resizeOrigin.current = { clientX: e.clientX, vw: panelWidthVw };
      setIsResizing(true);
    },
    [panelWidthVw],
  );

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
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-0.5">
              <SheetTitle>Import conflicts</SheetTitle>
              <div className="flex items-center gap-2">
                {conflicts.length > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      allResolved
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {allResolved
                      ? "All resolved"
                      : `${visibleConflicts.length} remaining`}
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {allResolved
                    ? "Ready to apply."
                    : "Resolve each change block to continue."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="glass"
                size="sm"
                disabled={applying}
                onClick={() => {
                  onCancel();
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="glassPrimary"
                size="sm"
                disabled={!allResolved || applying}
                onClick={handleApply}
              >
                {applying ? "Applying…" : "Apply"}
              </Button>
            </div>
          </div>
          {/* Progress bar */}
          {conflicts.length > 0 && (
            <div className="h-px w-full overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full bg-emerald-500/70 transition-all duration-500 ease-out"
                style={{
                  width: `${
                    ((conflicts.length - visibleConflicts.length) /
                      conflicts.length) *
                    100
                  }%`,
                }}
              />
            </div>
          )}
          <SheetDescription className="sr-only">
            Scroll through each conflicting note or image. Resolve each
            differing title, body, or whole note, and each image. Drag the left
            edge to resize this panel.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4 pl-5">
          {conflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conflicts to review.
            </p>
          ) : visibleConflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every conflict was resolved. Use Apply import or Cancel import.
            </p>
          ) : (
            <div className="flex flex-col gap-3 pb-8">
              {visibleConflicts.map((c) => {
                const rowId = conflictStableRowId(c);
                const requiredKeys = resolutionKeysForConflict(c);
                const fullyResolved = requiredKeys.every((k) => choices.has(k));

                if (c.kind === "image") {
                  const imgKey = imageConflictResolutionKey(c);
                  return (
                    <ResolveCollapse
                      key={rowId}
                      resolved={fullyResolved}
                      afterCollapsed={() => markRowDismissed(rowId)}
                    >
                      <article className="rounded-xl border border-border/40 bg-muted/10 p-4 backdrop-blur-sm">
                        <header className="mb-3 flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <h2 className="text-sm font-semibold tracking-tight">
                              Image — {shortId(c.id)}
                            </h2>
                            <p className="font-mono text-[10px] text-muted-foreground/60 break-all">
                              {c.id}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md border border-border/40 bg-background/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {c.kind}
                          </span>
                        </header>

                        <BinaryChoicePanel
                          storageKey={imgKey}
                          choice={choices.get(imgKey)}
                          disabled={applying}
                          onKeepCurrent={handleKeep}
                          onAcceptIncoming={handleAccept}
                        >
                          <ImageBlobPair
                            local={c.local}
                            incoming={c.incoming}
                          />
                        </BinaryChoicePanel>
                      </article>
                    </ResolveCollapse>
                  );
                }

                const localTb = splitNoteTitleBody(c.local.content);
                const incomingTb = splitNoteTitleBody(c.incoming.content);
                const titlesDiffer = localTb.title !== incomingTb.title;
                const bodiesDiffer = localTb.body !== incomingTb.body;
                const needsFull = !titlesDiffer && !bodiesDiffer;
                const titleKey = `note:${c.id}:title` as ResolutionKey;
                const bodyKey = `note:${c.id}:body` as ResolutionKey;
                const fullKey = `note:${c.id}:full` as ResolutionKey;

                return (
                  <ResolveCollapse
                    key={rowId}
                    resolved={fullyResolved}
                    afterCollapsed={() => markRowDismissed(rowId)}
                  >
                    <article className="rounded-xl border border-border/40 bg-muted/10 p-4 backdrop-blur-sm">
                      <header className="mb-3 flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h2 className="text-sm font-semibold tracking-tight">
                            Note — {shortId(c.id)}
                          </h2>
                          <p className="font-mono text-[10px] text-muted-foreground/60 break-all">
                            {c.id}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-border/40 bg-background/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {c.kind}
                        </span>
                      </header>

                      <div className="space-y-5">
                        {needsFull ? (
                          <section className="space-y-1.5">
                            <h3 className="text-sm font-medium text-foreground">
                              Note (metadata or other differences)
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Text matches; pick which copy to keep (including
                              timestamps).
                            </p>
                            <BinaryChoicePanel
                              storageKey={fullKey}
                              choice={choices.get(fullKey)}
                              disabled={applying}
                              onKeepCurrent={handleKeep}
                              onAcceptIncoming={handleAccept}
                            >
                              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                                Use Keep for the local note metadata or Accept
                                for the imported metadata.
                              </div>
                            </BinaryChoicePanel>
                          </section>
                        ) : (
                          <>
                            <section className="space-y-1.5">
                              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <span className="inline-block h-px w-3 bg-border" />
                                Title
                              </h3>
                              {titlesDiffer ? (
                                <BinaryChoicePanel
                                  storageKey={titleKey}
                                  choice={choices.get(titleKey)}
                                  disabled={applying}
                                  hideButtons={true}
                                  onKeepCurrent={handleKeep}
                                  onAcceptIncoming={handleAccept}
                                >
                                  <AcceptRejectDiff
                                    localContent={localTb.title}
                                    incomingContent={incomingTb.title}
                                    fileName="title.md"
                                    onKeep={() => handleKeep(titleKey)}
                                    onAccept={() => handleAccept(titleKey)}
                                    theme={diffsTheme === "pierre-dark" ? "pierre-dark" : "pierre-light"}
                                  />
                                </BinaryChoicePanel>
                              ) : (
                                <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-sm text-foreground">
                                  {localTb.title}
                                </div>
                              )}
                            </section>

                            <section className="space-y-1.5">
                              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <span className="inline-block h-px w-3 bg-border" />
                                Body
                              </h3>
                              {bodiesDiffer ? (
                                <BinaryChoicePanel
                                  storageKey={bodyKey}
                                  choice={choices.get(bodyKey)}
                                  disabled={applying}
                                  hideButtons={true}
                                  onKeepCurrent={handleKeep}
                                  onAcceptIncoming={handleAccept}
                                >
                                  <AcceptRejectDiff
                                    localContent={localTb.body}
                                    incomingContent={incomingTb.body}
                                    fileName="body.md"
                                    onKeep={() => handleKeep(bodyKey)}
                                    onAccept={() => handleAccept(bodyKey)}
                                    theme={diffsTheme === "pierre-dark" ? "pierre-dark" : "pierre-light"}
                                  />
                                </BinaryChoicePanel>
                              ) : (
                                <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
                                  Same body as current note.
                                </div>
                              )}
                            </section>
                          </>
                        )}
                      </div>
                    </article>
                  </ResolveCollapse>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
