import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useEditorSearch } from "@mdxeditor/editor";
import { Search, X, ChevronUp, ChevronDown, Replace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const MdxSearchToolbar = () => {
  const {
    search,
    setSearch,
    next,
    prev,
    total,
    cursor,
    isSearchOpen,
    closeSearch,
    toggleSearch,
    replace,
    replaceAll,
  } = useEditorSearch();

  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Local state to fix slow typing performance without overwriting user input
  const lastSentSearch = useRef(search ?? "");
  const [localSearch, setLocalSearch] = useState(search ?? "");

  // Sync external search changes to local state ONLY if it originated from outside
  useEffect(() => {
    if (search !== lastSentSearch.current) {
      setLocalSearch(search ?? "");
      lastSentSearch.current = search ?? "";
    }
  }, [search]);

  // Debounce the expensive search computation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearch !== lastSentSearch.current) {
        lastSentSearch.current = localSearch;
        setSearch(localSearch);
      }
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [localSearch, setSearch]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  return (
    <>
      {/* Always render the search icon in the toolbar so layout doesn't shift */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSearch}
        title="Search (Ctrl+F)"
        className={cn(
          "h-8 w-8",
          isSearchOpen && "bg-accent text-accent-foreground",
        )}
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Render the floating widget via Portal to escape the toolbar container entirely */}
      {isSearchOpen &&
        mounted &&
        createPortal(
          <div className="fixed right-8 top-20 z-9999 flex w-80 flex-col gap-2 rounded-md border bg-popover p-2 text-popover-foreground shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setShowReplace(!showReplace)}
                title="Toggle Replace"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    !showReplace && "-rotate-90",
                  )}
                />
              </Button>
              <div className="relative flex-1">
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Search"
                  className="h-8 pr-16 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (e.shiftKey) prev();
                      else next();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      closeSearch();
                    }
                  }}
                />
                <div className="absolute right-2 top-1.5 flex items-center text-xs text-muted-foreground pointer-events-none">
                  {total > 0 ? `${cursor} of ${total}` : "No results"}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={prev}
                  disabled={total === 0}
                  title="Previous Match (Shift+Enter)"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={next}
                  disabled={total === 0}
                  title="Next Match (Enter)"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={closeSearch}
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showReplace && (
              <div className="flex items-center gap-1 pl-7">
                <Input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace"
                  className="h-8 flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      replace(replaceText);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      closeSearch();
                    }
                  }}
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => replace(replaceText)}
                    disabled={total === 0}
                    title="Replace (Enter)"
                  >
                    <Replace className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-bold"
                    onClick={() => replaceAll(replaceText)}
                    disabled={total === 0}
                    title="Replace All"
                  >
                    ALL
                  </Button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};
