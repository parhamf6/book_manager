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
