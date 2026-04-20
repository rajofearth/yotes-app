// lib/indexdb.ts
// IndexedDB wrapper for offline notes with PQueue for serialized access
// Schema:
// - Database: "notes" (version 1)
// - Object Store: "notes" with keyPath: "id" (string, unique, immutable)
// - Fields: id (string), content (string), createdAt (Date, immutable), updatedAt (Date, updates on change)
// - No auto-increment; IDs generated via crypto.randomUUID()
// - Title is derived from first line of content (handled in utils.ts, not stored here)
// - All operations serialized via PQueue (concurrency: 1) to avoid concurrent DB access issues

import PQueue from "p-queue";

// Install via: npm install p-queue
// Types: npm install @types/p-queue (if needed, but usually bundled)

const DB_NAME = "notes";
const DB_VERSION = 2;
const STORE_NAME = "notes";
const IMAGES_STORE_NAME = "images";
const CONCURRENCY = 1; // Serialize all ops

// Singleton DB promise
let dbPromise: Promise<IDBDatabase> | null = null;

// PQueue instance for serialization
const queue = new PQueue({ concurrency: CONCURRENCY });

/**
 * Opens (or creates) the IndexedDB database.
 * Only runs upgrade on version change.
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  // Ensure we're on the client side
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in browser environment");
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(IMAGES_STORE_NAME)) {
        db.createObjectStore(IMAGES_STORE_NAME, { keyPath: "id" });
      }
    };

    // Handle blocking (e.g., other tabs open)
    request.onblocked = () => {
      console.warn("DB upgrade blocked; close other tabs");
    };
  });

  return dbPromise;
}

/**
 * Generic transaction helper for read/write ops on a specific store.
 * @param storeName Name of the object store
 * @param mode 'readonly' | 'readwrite'
 * @param callback Async function using the store
 */
async function transactStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDB();
  const tx = db.transaction([storeName], mode);
  const store = tx.objectStore(storeName);

  try {
    const result = await callback(store);
    return result;
  } catch (error) {
    // Abort on error
    tx.abort();
    throw error;
  }
}

/**
 * Generic transaction helper for read/write ops on the notes store.
 * @param mode 'readonly' | 'readwrite'
 * @param callback Async function using the store
 */
async function transact<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  return transactStore(STORE_NAME, mode, callback);
}

export interface StoredImage {
  id: string;
  blob: Blob;
  createdAt: Date;
}

/**
 * Save an uploaded image to IndexedDB.
 * @param file The image file to save
 * @returns Promise resolving to a custom image ID string
 */
export async function saveImage(file: File): Promise<string> {
  return queue.add(async () => {
    const id = `img-${crypto.randomUUID()}`;
    const storedImage: StoredImage = {
      id,
      blob: file,
      createdAt: new Date(),
    };

    await transactStore(IMAGES_STORE_NAME, "readwrite", async (store) => {
      const request = store.add(storedImage);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(storedImage);
        request.onerror = () => reject(request.error);
      });
    });

    return id;
  });
}

/**
 * Retrieve an image from IndexedDB by its ID.
 * @param id The image ID string
 * @returns Promise resolving to the image Blob or null if not found
 */
export async function getImage(id: string): Promise<Blob | null> {
  return queue.add(async () => {
    const result = await transactStore(
      IMAGES_STORE_NAME,
      "readonly",
      async (store) => {
        const request = store.get(id);
        return new Promise<StoredImage | undefined>((resolve, reject) => {
          request.onsuccess = () =>
            resolve(request.result as StoredImage | undefined);
          request.onerror = () => reject(request.error);
        });
      },
    );

    return result?.blob ?? null;
  });
}

/**
 * Create a new note.
 * Generates UUID id, extracts no title here (do in utils.ts), sets created/updated to now.
 * @param content Initial note content (string)
 * @returns Promise<Note>
 */
export async function createNote(content: string): Promise<Note> {
  return queue.add(async () => {
    const now = new Date();
    const id = crypto.randomUUID();

    const note: Note = {
      id,
      content,
      createdAt: now,
      updatedAt: now,
    };

    await transact("readwrite", async (store) => {
      const request = store.add(note);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(note);
        request.onerror = () => reject(request.error);
      });
    });

    return note;
  });
}

/**
 * Update an existing note's content and updatedAt.
 * Preserves id and createdAt; throws if note not found.
 * @param id Note ID to update
 * @param content New content
 * @returns Promise<Note>
 */
export async function updateNote(id: string, content: string): Promise<Note> {
  return queue.add(async () => {
    const now = new Date();

    // Fetch existing to preserve createdAt
    const existing = await transact("readonly", async (store) => {
      const request = store.get(id);
      return new Promise<Note | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Note | undefined);
        request.onerror = () => reject(request.error);
      });
    });

    if (!existing) {
      throw new Error(`Note with id ${id} not found`);
    }

    // Explicitly type to ensure TS knows existing is Note after check
    const existingNote = existing as Note;

    const updatedNote: Note = {
      ...existingNote,
      content,
      updatedAt: now,
    };

    await transact("readwrite", async (store) => {
      const request = store.put(updatedNote);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(updatedNote);
        request.onerror = () => reject(request.error);
      });
    });

    return updatedNote;
  });
}

/**
 * Delete a note by ID.
 * @param id Note ID to delete
 * @returns Promise<void>
 */
export async function deleteNote(id: string): Promise<void> {
  return queue.add(async () => {
    await transact("readwrite", async (store) => {
      const request = store.delete(id);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    });
  });
}

/**
 * Get a single note by ID (for completeness).
 * @param id Note ID
 * @returns Promise<Note | null>
 */
export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getNote(id: string): Promise<Note | null> {
  return queue.add(async () => {
    const result = await transact("readonly", async (store) => {
      const request = store.get(id);
      return new Promise<Note | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Note | undefined);
        request.onerror = () => reject(request.error);
      });
    });

    return result ?? null;
  });
}

/**
 * Get all notes (sorted by updatedAt desc).
 * Useful for listing.
 * @returns Promise<Note[]>
 */
export async function getAllNotes(): Promise<Note[]> {
  return queue.add(async () => {
    const notes = await transact("readonly", async (store) => {
      const request = store.getAll();
      return new Promise<Note[]>((resolve, reject) => {
        request.onsuccess = () => {
          const rawNotes = request.result as Note[];
          // Sort by updatedAt desc (client-side for simplicity)
          resolve(
            rawNotes.sort(
              (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
            ),
          );
        };
        request.onerror = () => reject(request.error);
      });
    });

    return notes;
  });
}

/**
 * Upserts many notes in a single IndexedDB transaction (fast for large imports).
 */
export async function bulkUpsertNotes(notes: readonly Note[]): Promise<void> {
  if (notes.length === 0) return;

  return queue.add(async () => {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const note of notes) {
      store.put(note);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  });
}

export type StoredImageWrite = {
  id: string;
  blob: Blob;
  createdAt: Date;
};

/**
 * Upserts notes and images in one IndexedDB transaction.
 */
export async function bulkUpsertNotesAndImages(
  notes: readonly Note[],
  images: readonly StoredImageWrite[],
): Promise<void> {
  if (notes.length === 0 && images.length === 0) return;

  return queue.add(async () => {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, IMAGES_STORE_NAME], "readwrite");
    const noteStore = tx.objectStore(STORE_NAME);
    const imageStore = tx.objectStore(IMAGES_STORE_NAME);
    for (const note of notes) noteStore.put(note);
    for (const image of images) {
      imageStore.put({
        id: image.id,
        blob: image.blob,
        createdAt: image.createdAt,
      } satisfies StoredImage);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  });
}

// Close DB on app unload (optional, for cleanup)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    dbPromise?.then((db) => {
      db.close();
      dbPromise = null;
    });
  });
}
