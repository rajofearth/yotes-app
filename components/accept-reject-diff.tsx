"use client";

import {
  DEFAULT_THEMES,
  diffAcceptRejectHunk,
  parseDiffFromFile,
} from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AcceptRejectDiffProps {
  localContent: string;
  incomingContent: string;
  fileName: string;
  onKeep: () => void;
  onAccept: () => void;
  theme?: "pierre-dark" | "pierre-light";
}

export function AcceptRejectDiff({
  localContent,
  incomingContent,
  fileName,
  onKeep,
  onAccept,
  theme = "pierre-dark",
}: AcceptRejectDiffProps) {
  const initialFileDiff = useMemo(
    () =>
      parseDiffFromFile(
        { name: fileName, contents: localContent },
        { name: fileName, contents: incomingContent },
      ),
    [localContent, incomingContent, fileName],
  );

  const [fileDiff, setFileDiff] = useState(initialFileDiff);
  const [resolvedHunks, setResolvedHunks] = useState<Set<number>>(new Set());

  const annotations = useMemo(() => {
    return fileDiff.hunks
      .map((hunk, index) => {
        if (resolvedHunks.has(index)) return null;
        
        // First unified row of the first change block: deletions render before additions
        // (see @pierre/diffs ChangeContent: counts + line indices, no per-line array).
        let deletionLineNumber = hunk.deletionStart;
        let additionLineNumber = hunk.additionStart;
        for (const segment of hunk.hunkContent) {
          if (segment.type === "change") {
            if (segment.deletions > 0) {
              return {
                side: "deletions" as const,
                lineNumber: deletionLineNumber,
                metadata: { hunkIndex: index },
              };
            }
            if (segment.additions > 0) {
              return {
                side: "additions" as const,
                lineNumber: additionLineNumber,
                metadata: { hunkIndex: index },
              };
            }
            deletionLineNumber += segment.deletions;
            additionLineNumber += segment.additions;
          } else {
            deletionLineNumber += segment.lines;
            additionLineNumber += segment.lines;
          }
        }
        return null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
  }, [fileDiff, resolvedHunks]);

  const handleResolveHunk = useCallback((index: number, action: "accept" | "reject") => {
    setFileDiff((current) => diffAcceptRejectHunk(current, index, action));
    setResolvedHunks((prev) => {
      const next = new Set(prev);
      next.add(index);
      
      if (next.size === fileDiff.hunks.length) {
        setTimeout(onKeep, 300);
      }
      return next;
    });
  }, [fileDiff.hunks.length, onKeep]);

  const renderAnnotation = useCallback((annotation: any) => {
    const hunkIndex = annotation.metadata?.hunkIndex;
    if (hunkIndex === undefined || resolvedHunks.has(hunkIndex)) return null;

    return (
      <div className="relative z-10 w-full overflow-visible font-sans">
        <div className="absolute top-1 right-1.5 flex gap-1">
          <Button
            type="button"
            size="xs"
            className={cn(
              "h-6 rounded-md border border-red-700/30 bg-red-600/90 px-2.5 text-[11px] font-medium text-white shadow-sm hover:bg-red-500",
              "focus-visible:ring-2 focus-visible:ring-red-400/80",
            )}
            onClick={() => handleResolveHunk(hunkIndex, "reject")}
          >
            Keep <span className="ml-1 font-normal opacity-60">⌘N</span>
          </Button>
          <Button
            type="button"
            size="xs"
            className={cn(
              "h-6 rounded-md border border-emerald-700/30 bg-emerald-600/90 px-2.5 text-[11px] font-medium text-white shadow-sm hover:bg-emerald-500",
              "focus-visible:ring-2 focus-visible:ring-emerald-400/80",
            )}
            onClick={() => handleResolveHunk(hunkIndex, "accept")}
          >
            Accept <span className="ml-1 font-normal opacity-60">⌘Y</span>
          </Button>
        </div>
      </div>
    );
  }, [resolvedHunks, handleResolveHunk]);

  const allResolved = resolvedHunks.size === fileDiff.hunks.length;

  return (
    <div className="group/diff relative overflow-hidden rounded-lg border border-border/50 bg-muted/20">
      <FileDiff
        fileDiff={fileDiff}
        options={{
          theme: DEFAULT_THEMES,
          themeType: theme === "pierre-dark" ? "dark" : "light",
          diffStyle: "unified",
        }}
        lineAnnotations={annotations}
        renderAnnotation={renderAnnotation}
      />
      {!allResolved && (
        <div
          className={cn(
            "absolute bottom-1.5 right-1.5 z-10 transition-opacity duration-150",
            "group-hover/diff:opacity-0 pointer-events-none",
          )}
        >
          <span className="rounded-md border border-border/30 bg-background/60 px-1.5 py-0.5 text-[9px] text-muted-foreground/50 backdrop-blur-sm">
            hover to resolve
          </span>
        </div>
      )}
    </div>
  );
}
