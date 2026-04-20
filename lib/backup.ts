import { dequal } from "dequal";
import superjson from "superjson";
import * as z from "zod";
import type { Note } from "@/lib/types";

export const NOTES_BACKUP_V1 = "notes.backup.v1" as const;
export const NOTES_BACKUP_V2 = "notes.backup.v2" as const;

const backupNoteSchema = z
  .object({
    id: z.string().min(1),
    content: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine((n) => n.updatedAt.getTime() >= n.createdAt.getTime(), {
    message: "updatedAt must be on or after createdAt",
    path: ["updatedAt"],
  });

const notesArraySchema = z.array(backupNoteSchema).superRefine((items, ctx) => {
  const seen = new Set<string>();
  for (const [i, item] of items.entries()) {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate note id in backup: ${item.id}`,
        path: [i, "id"],
      });
    }
    seen.add(item.id);
  }
});

const backupImageWireSchema = z.object({
  id: z.string().min(1),
  mimeType: z.string().min(1),
  data: z.string().min(1),
});

const v1EnvelopeSchema = z.object({
  format: z.literal(NOTES_BACKUP_V1),
  exportedAt: z.date(),
  notes: notesArraySchema,
});

const v2EnvelopeSchema = z.object({
  format: z.literal(NOTES_BACKUP_V2),
  exportedAt: z.date(),
  notes: notesArraySchema,
  images: z.array(backupImageWireSchema),
});

export type BackupNote = z.infer<typeof backupNoteSchema>;
export type BackupImageWire = z.infer<typeof backupImageWireSchema>;

export type ParsedBackup = {
  format: typeof NOTES_BACKUP_V1 | typeof NOTES_BACKUP_V2;
  exportedAt: Date;
  notes: BackupNote[];
  images: BackupImageWire[];
};

export type ConflictItem =
  | { kind: "note"; id: string; local: Note; incoming: Note }
  | { kind: "image"; id: string; local: Blob; incoming: Blob };

export type ImportDryRun = {
  autoNotes: Note[];
  autoImages: Array<{ id: string; blob: Blob; createdAt: Date }>;
  conflicts: ConflictItem[];
};

export type ResolutionKey = `${ConflictItem["kind"]}:${string}`;

export function resolutionKey(item: ConflictItem): ResolutionKey {
  return `${item.kind}:${item.id}`;
}

const IMG_ID_RE = /\b(img-[0-9a-f-]{8,})\b/gi;

export function extractEmbeddedImageIds(markdown: string): string[] {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(IMG_ID_RE)) {
    const id = match[1];
    if (id) ids.add(id);
  }
  return [...ids];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBlob(entry: BackupImageWire): Blob {
  const binary = atob(entry.data);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return new Blob([out], { type: entry.mimeType });
}

async function blobsEqual(a: Blob, b: Blob): Promise<boolean> {
  if (a.size !== b.size) return false;
  const [ab, bb] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
  if (ab.byteLength !== bb.byteLength) return false;
  const ua = new Uint8Array(ab);
  const ub = new Uint8Array(bb);
  for (let i = 0; i < ua.length; i += 1) {
    if (ua[i] !== ub[i]) return false;
  }
  return true;
}

function toComparableNote(
  n: Pick<Note, "id" | "content" | "createdAt" | "updatedAt">,
): Record<string, unknown> {
  return {
    id: n.id,
    content: n.content,
    createdAt: n.createdAt.getTime(),
    updatedAt: n.updatedAt.getTime(),
  };
}

function isSameNoteData(a: Note, b: BackupNote): boolean {
  return dequal(toComparableNote(a), toComparableNote(b));
}

export function toNote(n: BackupNote): Note {
  return {
    id: n.id,
    content: n.content,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

export async function serializeNotesBackup(
  notes: readonly Note[],
  getImage: (id: string) => Promise<Blob | null>,
): Promise<string> {
  const imageIds = new Set<string>();
  for (const n of notes) {
    for (const id of extractEmbeddedImageIds(n.content)) imageIds.add(id);
  }

  const images: BackupImageWire[] = [];
  for (const id of imageIds) {
    const blob = await getImage(id);
    if (!blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    images.push({
      id,
      mimeType: blob.type || "application/octet-stream",
      data: bytesToBase64(bytes),
    });
  }

  const envelope: z.infer<typeof v2EnvelopeSchema> = {
    format: NOTES_BACKUP_V2,
    exportedAt: new Date(),
    notes: notes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
    images,
  };

  return superjson.stringify(envelope);
}

export function parseNotesBackup(raw: string): ParsedBackup {
  let decoded: unknown;
  try {
    decoded = superjson.parse(raw);
  } catch {
    throw new Error("This file is not a valid notes backup (SuperJSON).");
  }

  const format = z.object({ format: z.string() }).safeParse(decoded);
  if (!format.success) {
    throw new Error("Backup file is missing a format field.");
  }

  if (format.data.format === NOTES_BACKUP_V1) {
    const data = v1EnvelopeSchema.parse(decoded);
    return { ...data, images: [] };
  }

  if (format.data.format === NOTES_BACKUP_V2) {
    return v2EnvelopeSchema.parse(decoded);
  }

  throw new Error(`Unsupported backup format: ${format.data.format}`);
}

export function downloadNotesBackup(serialized: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([serialized], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `notes-backup-${new Date().toISOString().replaceAll(":", "-")}.json`;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function buildImportDryRun(
  localNotes: readonly Note[],
  getLocalImage: (id: string) => Promise<Blob | null>,
  parsed: ParsedBackup,
): Promise<ImportDryRun> {
  const localById = new Map(localNotes.map((n) => [n.id, n] as const));
  const incomingImages = new Map<string, Blob>();
  for (const wire of parsed.images) {
    incomingImages.set(wire.id, base64ToBlob(wire));
  }

  const autoNotes: Note[] = [];
  const autoImages: Array<{ id: string; blob: Blob; createdAt: Date }> = [];
  const imageConflicts: ConflictItem[] = [];
  const noteConflicts: ConflictItem[] = [];

  for (const incoming of parsed.notes) {
    const local = localById.get(incoming.id);
    if (!local) {
      autoNotes.push(toNote(incoming));
      continue;
    }
    if (isSameNoteData(local, incoming)) continue;
    noteConflicts.push({
      kind: "note",
      id: incoming.id,
      local,
      incoming: toNote(incoming),
    });
  }

  for (const [id, incomingBlob] of incomingImages) {
    const localBlob = await getLocalImage(id);
    if (!localBlob) {
      autoImages.push({ id, blob: incomingBlob, createdAt: new Date() });
      continue;
    }
    if (await blobsEqual(localBlob, incomingBlob)) continue;
    imageConflicts.push({
      kind: "image",
      id,
      local: localBlob,
      incoming: incomingBlob,
    });
  }

  return {
    autoNotes,
    autoImages,
    conflicts: [...imageConflicts, ...noteConflicts],
  };
}

export function applyImportChoices(
  dryRun: ImportDryRun,
  choices: ReadonlyMap<ResolutionKey, "local" | "incoming">,
): {
  notes: Note[];
  images: Array<{ id: string; blob: Blob; createdAt: Date }>;
} {
  const noteWrites = new Map<string, Note>();
  const imageWrites = new Map<string, { blob: Blob; createdAt: Date }>();

  for (const n of dryRun.autoNotes) noteWrites.set(n.id, n);
  for (const img of dryRun.autoImages) {
    imageWrites.set(img.id, { blob: img.blob, createdAt: img.createdAt });
  }

  for (const c of dryRun.conflicts) {
    const key = resolutionKey(c);
    const choice = choices.get(key);
    if (!choice) {
      throw new Error(`Missing resolution for ${c.kind} "${c.id}".`);
    }
    if (c.kind === "note") {
      if (choice === "incoming") noteWrites.set(c.id, c.incoming);
      if (choice === "local") noteWrites.delete(c.id);
      continue;
    }
    if (choice === "incoming") {
      imageWrites.set(c.id, { blob: c.incoming, createdAt: new Date() });
    } else {
      imageWrites.delete(c.id);
    }
  }

  return {
    notes: [...noteWrites.values()],
    images: [...imageWrites.entries()].map(([id, v]) => ({
      id,
      blob: v.blob,
      createdAt: v.createdAt,
    })),
  };
}
