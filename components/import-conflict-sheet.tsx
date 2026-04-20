"use client";

import DiffMatchPatch from "diff-match-patch";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
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
  type ImportDryRun,
  imageConflictResolutionKey,
  type ResolutionKey,
  resolutionKeysForConflict,
} from "@/lib/backup";
import { cn, splitNoteTitleBody } from "@/lib/utils";

/** diff-match-patch uses -1 / 0 / 1; avoid named imports from this CJS package (they can be undefined at runtime under ESM). */
const DMP_DIFF_DELETE = -1;
const DMP_DIFF_EQUAL = 0;
const DMP_DIFF_INSERT = 1;

const dmpSingleton = new DiffMatchPatch();

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

/** Compact markdown inside diff rows; HTML (e.g. &lt;img&gt;) via rehype-raw. */
const diffMarkdownComponents: Partial<Components> = {
  p: (props) => <p className="mb-1.5 last:mb-0 leading-snug" {...props} />,
  h1: (props) => (
    <h1 className="mt-2 mb-1 text-lg font-semibold first:mt-0" {...props} />
  ),
  h2: (props) => (
    <h2 className="mt-2 mb-1 text-base font-semibold first:mt-0" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-1.5 mb-1 text-sm font-semibold first:mt-0" {...props} />
  ),
  ul: (props) => <ul className="ml-4 list-disc space-y-0.5" {...props} />,
  ol: (props) => <ol className="ml-4 list-decimal space-y-0.5" {...props} />,
  li: (props) => <li className="leading-snug" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="border-l-2 border-foreground/20 py-0.5 pl-2 text-muted-foreground"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded bg-foreground/10 px-1 py-px font-mono text-[12px]"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-1 max-h-48 overflow-auto rounded bg-foreground/10 p-2 text-[12px] leading-snug"
      {...props}
    />
  ),
  a: (props) => (
    <a className="text-primary underline underline-offset-2" {...props} />
  ),
  img: (props) => (
    // biome-ignore lint/performance/noImgElement: Blob / img- URLs in user markdown; constrained for layout.
    <img
      {...props}
      alt={props.alt ?? ""}
      className="my-1 mx-auto block max-h-36 w-full max-w-[min(100%,24rem)] rounded-md border border-border/50 object-contain"
    />
  ),
};

function HoverResolutionToolbar({
  storageKey,
  choice,
  disabled,
  onKeepCurrent,
  onAcceptIncoming,
  children,
}: {
  storageKey: ResolutionKey;
  choice: "local" | "incoming" | undefined;
  disabled: boolean;
  onKeepCurrent: (key: ResolutionKey) => void;
  onAcceptIncoming: (key: ResolutionKey) => void;
  children: React.ReactNode;
}) {
  const resolved = choice !== undefined;

  return (
    <ResolveCollapse resolved={resolved}>
      <div className="group/diffhover relative min-h-9 rounded-lg">
        {children}
        <div
          className={cn(
            "absolute top-1 right-1 z-20 flex gap-1 transition-opacity duration-150",
            "pointer-events-none opacity-0",
            "group-hover/diffhover:pointer-events-auto group-hover/diffhover:opacity-100",
          )}
        >
          <div className="flex gap-1 rounded-md border border-border/60 bg-popover/95 p-0.5 shadow-md backdrop-blur-md">
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              className={cn(
                "h-7 border border-red-700/35 bg-red-600 px-2 text-xs text-white shadow-sm hover:bg-red-600/90",
                "focus-visible:ring-2 focus-visible:ring-red-400/80",
                choice === "local" &&
                  "ring-2 ring-red-300 ring-offset-1 ring-offset-background",
              )}
              onClick={() => onKeepCurrent(storageKey)}
            >
              Keep current
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              className={cn(
                "h-7 border border-emerald-700/35 bg-emerald-600 px-2 text-xs text-white shadow-sm hover:bg-emerald-600/90",
                "focus-visible:ring-2 focus-visible:ring-emerald-400/80",
                choice === "incoming" &&
                  "ring-2 ring-emerald-300 ring-offset-1 ring-offset-background",
              )}
              onClick={() => onAcceptIncoming(storageKey)}
            >
              Accept incoming
            </Button>
          </div>
        </div>
      </div>
    </ResolveCollapse>
  );
}

const UnifiedContentDiff = memo(function UnifiedContentDiff({
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
      <Markdown
        components={diffMarkdownComponents}
        rehypePlugins={[rehypeRaw]}
        urlTransform={(u) => u}
      >
        {text}
      </Markdown>
    );

  return (
    <div className="max-w-full overflow-hidden rounded-md border border-border/60 bg-muted/40 text-sm leading-snug dark:bg-zinc-950/40">
      {segments.map(([op, text], i) => {
        if (!text) return null;

        if (op === DMP_DIFF_EQUAL) {
          return (
            <div
              key={`${i}-${text.length}`}
              className="border-l-4 border-transparent px-2 py-0.5 text-foreground"
            >
              <div className="min-w-0 max-w-full overflow-x-auto pr-1 [&_img]:max-h-32">
                {renderBody(text)}
              </div>
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
            className={cn("flex gap-1.5 px-1.5 py-0.5", rowClass)}
          >
            <div
              className={cn(
                "w-5 shrink-0 select-none pt-px text-center text-[11px] font-bold tabular-nums leading-none",
                isInsert
                  ? "text-emerald-700 dark:text-emerald-200"
                  : "text-red-700 dark:text-red-200",
              )}
              aria-hidden
            >
              {gutter}
            </div>
            <div className="min-w-0 max-w-full flex-1 overflow-x-auto pr-1 [&_img]:max-h-32">
              {renderBody(text)}
            </div>
          </div>
        );
      })}
    </div>
  );
});

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
  const [choices, setChoices] = useState<
    Map<ResolutionKey, "local" | "incoming">
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
    (key: ResolutionKey, choice: "local" | "incoming") => {
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
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-1">
              <SheetTitle>Review import conflicts</SheetTitle>
              <p className="text-xs text-muted-foreground">
                {visibleConflicts.length === 0 && conflicts.length > 0
                  ? "Every conflict is resolved. Apply import or cancel when ready."
                  : `${visibleConflicts.length} change${visibleConflicts.length === 1 ? "" : "s"} to review. Hover a diff to choose keep current or accept incoming.`}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
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
                variant="glassPrimary"
                size="sm"
                disabled={!allResolved || applying}
                onClick={handleApply}
              >
                {applying ? "Applying…" : "Apply import"}
              </Button>
            </div>
          </div>
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
            <div className="flex flex-col gap-6 pb-8">
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
                      <article className="border-b border-border/35 pb-6 last:border-b-0 last:pb-0">
                        <header className="mb-2 space-y-0.5">
                          <h2 className="text-base font-semibold tracking-tight">
                            Image {shortId(c.id)}
                          </h2>
                          <p className="font-mono text-[11px] text-muted-foreground break-all">
                            {c.id}
                          </p>
                        </header>

                        <HoverResolutionToolbar
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
                        </HoverResolutionToolbar>
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
                    <article className="border-b border-border/35 pb-6 last:border-b-0 last:pb-0">
                      <header className="mb-2 space-y-0.5">
                        <h2 className="text-base font-semibold tracking-tight">
                          Note {shortId(c.id)}
                        </h2>
                        <p className="font-mono text-[11px] text-muted-foreground break-all">
                          {c.id}
                        </p>
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
                            <HoverResolutionToolbar
                              storageKey={fullKey}
                              choice={choices.get(fullKey)}
                              disabled={applying}
                              onKeepCurrent={handleKeep}
                              onAcceptIncoming={handleAccept}
                            >
                              <UnifiedContentDiff
                                before={c.local.content}
                                after={c.incoming.content}
                              />
                            </HoverResolutionToolbar>
                          </section>
                        ) : (
                          <>
                            <section className="space-y-1.5">
                              <h3 className="text-sm font-medium text-foreground">
                                Note title
                              </h3>
                              {titlesDiffer ? (
                                <HoverResolutionToolbar
                                  storageKey={titleKey}
                                  choice={choices.get(titleKey)}
                                  disabled={applying}
                                  onKeepCurrent={handleKeep}
                                  onAcceptIncoming={handleAccept}
                                >
                                  <UnifiedContentDiff
                                    plain
                                    before={localTb.title}
                                    after={incomingTb.title}
                                  />
                                </HoverResolutionToolbar>
                              ) : (
                                <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-sm text-foreground">
                                  {localTb.title}
                                </div>
                              )}
                            </section>

                            <section className="space-y-1.5">
                              <h3 className="text-sm font-medium text-foreground">
                                Markdown body
                              </h3>
                              {bodiesDiffer ? (
                                <HoverResolutionToolbar
                                  storageKey={bodyKey}
                                  choice={choices.get(bodyKey)}
                                  disabled={applying}
                                  onKeepCurrent={handleKeep}
                                  onAcceptIncoming={handleAccept}
                                >
                                  <UnifiedContentDiff
                                    before={localTb.body}
                                    after={incomingTb.body}
                                  />
                                </HoverResolutionToolbar>
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
