import Dexie, { type Table } from "dexie";
import type { Book, CoverRecord } from "./types";

export class BookArchiveDB extends Dexie {
  books!: Table<Book, string>;
  /** Cover images cached as blobs so they render offline without re-downloading */
  covers!: Table<CoverRecord, string>;

  constructor() {
    super("book-archive");
    this.version(1).stores({
      books:
        "id, status, ownership, title, queueOrder, *tags, *categories, updatedAt",
      covers: "bookId",
    });
  }
}

export const db = new BookArchiveDB();

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
