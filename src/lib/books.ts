import { db, newId } from "./db";
import type { Book, Ownership, ReadingStatus } from "./types";

/** Everything the form can set on a book — id/timestamps are assigned here. */
export type BookInput = Omit<Book, "id" | "createdAt" | "updatedAt" | "queueOrder">;

export interface SaveOptions {
  coverBlob?: Blob;
}

/**
 * Persist a new book. Queued books are appended to the end of the reading
 * queue. The cover, when available, is cached as a blob so it renders offline.
 */
export async function saveNewBook(input: BookInput, options: SaveOptions = {}) {
  const now = Date.now();
  const id = newId();

  let queueOrder: number | undefined;
  if (input.status === "queued") {
    const queued = await db.books.where("status").equals("queued").toArray();
    queueOrder = queued.reduce((max, b) => Math.max(max, b.queueOrder ?? 0), 0) + 1;
  }

  const book: Book = { ...input, id, queueOrder, createdAt: now, updatedAt: now };
  await db.books.add(book);

  if (options.coverBlob) {
    await db.covers.put({ bookId: id, blob: options.coverBlob });
  }
  return book;
}

/** Fetch a remote cover through the image proxy and return it as a blob. */
export async function fetchCoverBlob(coverUrl: string): Promise<Blob | undefined> {
  try {
    const res = await fetch(`/api/proxy/image?url=${encodeURIComponent(coverUrl)}`);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return blob.size > 0 ? blob : undefined;
  } catch {
    return undefined;
  }
}

export const DEFAULT_STATUS: ReadingStatus = "queued";
export const DEFAULT_OWNERSHIP: Ownership = "physical";

/** Patch an existing book. Queued books entering the queue get appended last. */
export async function updateBook(id: string, patch: Partial<Book>) {
  const current = await db.books.get(id);
  if (!current) return;

  const next = { ...patch, updatedAt: Date.now() };
  if (patch.status === "queued" && current.status !== "queued" && current.queueOrder === undefined) {
    const queued = await db.books.where("status").equals("queued").toArray();
    next.queueOrder = queued.reduce((max, b) => Math.max(max, b.queueOrder ?? 0), 0) + 1;
  }
  await db.books.update(id, next);
}

export async function deleteBook(id: string) {
  await db.transaction("rw", db.books, db.covers, async () => {
    await db.books.delete(id);
    await db.covers.delete(id);
  });
}

export async function replaceCover(id: string, blob: Blob | undefined, coverUrl?: string) {
  await db.transaction("rw", db.books, db.covers, async () => {
    if (blob) {
      await db.covers.put({ bookId: id, blob });
    } else {
      await db.covers.delete(id);
    }
    await db.books.update(id, { coverUrl, updatedAt: Date.now() });
  });
}

/** Persist a new reading order for the queue (ids in display order). */
export async function reorderQueue(orderedIds: string[]) {
  await db.transaction("rw", db.books, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.books.update(orderedIds[i], { queueOrder: i + 1, updatedAt: Date.now() });
    }
  });
}
