import { db } from "./db";
import type { Book, Ownership, ReadingStatus } from "./types";

const EXPORT_VERSION = 1;

export type ImportMode = "merge" | "replace";

export interface ImportResult {
  added: number;
  skipped: number;
}

/* ---------- helpers ---------- */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  return csvEscape(String(value));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/* ---------- export ---------- */

export async function exportJson(): Promise<Blob> {
  const books = await db.books.toArray();
  const covers = await db.covers.toArray();
  const coverByBook = new Map(covers.map((c) => [c.bookId, c.blob]));

  const payload = {
    app: "book-archive",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    books: await Promise.all(
      books.map(async (book) => ({
        ...book,
        coverDataUrl: coverByBook.has(book.id)
          ? await blobToDataUrl(coverByBook.get(book.id)!)
          : undefined,
      })),
    ),
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

const CSV_COLUMNS = [
  "title",
  "titleLatin",
  "author",
  "translator",
  "publisher",
  "pages",
  "yearShamsi",
  "yearGregorian",
  "isbn",
  "trimSize",
  "binding",
  "intro",
  "notes",
  "tags",
  "categories",
  "userCategories",
  "status",
  "ownership",
  "rating",
  "source",
  "sourceUrl",
] as const;

export async function exportCsv(): Promise<Blob> {
  const books = await db.books.toArray();
  const lines: string[] = [];

  lines.push("\uFEFF" + CSV_COLUMNS.join(",")); // BOM so Excel reads Persian
  for (const book of books) {
    const cells = [
      book.title,
      book.titleLatin,
      book.author,
      book.translator,
      book.publisher,
      book.pages,
      book.yearShamsi,
      book.yearGregorian,
      book.isbn,
      book.trimSize,
      book.binding,
      book.intro,
      book.notes,
      book.tags.join("؛ "),
      book.categories.join("؛ "),
      book.userCategories.join("؛ "),
      book.status,
      book.ownership,
      book.rating,
      book.source,
      book.sourceUrl,
    ].map(csvCell);
    lines.push(cells.join(","));
  }
  return new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
}

/* ---------- import ---------- */

interface JsonBook {
  title?: unknown;
  status?: unknown;
  ownership?: unknown;
  tags?: unknown;
  categories?: unknown;
  userCategories?: unknown;
  coverDataUrl?: unknown;
  [key: string]: unknown;
}

function coerceBook(raw: JsonBook, now: number): Book | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;

  const validStatus: ReadingStatus[] = ["queued", "reading", "read", "shelf"];
  const validOwnership: Ownership[] = ["physical", "ebook", "audio"];

  return {
    ...raw,
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    title,
    titleLatin: typeof raw.titleLatin === "string" ? raw.titleLatin : undefined,
    author: typeof raw.author === "string" ? raw.author : undefined,
    translator: typeof raw.translator === "string" ? raw.translator : undefined,
    publisher: typeof raw.publisher === "string" ? raw.publisher : undefined,
    pages: typeof raw.pages === "number" ? raw.pages : undefined,
    yearShamsi: typeof raw.yearShamsi === "number" ? raw.yearShamsi : undefined,
    yearGregorian: typeof raw.yearGregorian === "number" ? raw.yearGregorian : undefined,
    isbn: typeof raw.isbn === "string" ? raw.isbn : undefined,
    trimSize: typeof raw.trimSize === "string" ? raw.trimSize : undefined,
    binding: typeof raw.binding === "string" ? raw.binding : undefined,
    intro: typeof raw.intro === "string" ? raw.intro : undefined,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    categories: Array.isArray(raw.categories)
      ? raw.categories.filter((c): c is string => typeof c === "string")
      : [],
    userCategories: Array.isArray(raw.userCategories)
      ? raw.userCategories.filter((c): c is string => typeof c === "string")
      : [],
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === "string")
      : [],
    status: validStatus.includes(raw.status as ReadingStatus)
      ? (raw.status as ReadingStatus)
      : "queued",
    queueOrder: typeof raw.queueOrder === "number" ? raw.queueOrder : undefined,
    ownership: validOwnership.includes(raw.ownership as Ownership)
      ? (raw.ownership as Ownership)
      : "physical",
    rating:
      typeof raw.rating === "number" && raw.rating >= 1 && raw.rating <= 5
        ? raw.rating
        : undefined,
    coverUrl: typeof raw.coverUrl === "string" ? raw.coverUrl : undefined,
    source: raw.source === "iranketab" ? "iranketab" : "manual",
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : undefined,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
  };
}

export async function importJson(
  file: File,
  mode: ImportMode,
): Promise<ImportResult> {
  const payload = JSON.parse(await file.text()) as { books?: JsonBook[] };
  if (!Array.isArray(payload.books)) {
    throw new Error("فایل خروجی معتبر نیست");
  }

  const now = Date.now();
  const incoming = payload.books
    .map((raw) => coerceBook(raw, now))
    .filter((b): b is Book => b !== null);

  const coverEntries: { bookId: string; blob: Blob }[] = [];
  for (let i = 0; i < payload.books.length; i++) {
    const book = incoming[i];
    const dataUrl = payload.books[i].coverDataUrl;
    if (book && typeof dataUrl === "string") {
      coverEntries.push({ bookId: book.id, blob: await dataUrlToBlob(dataUrl) });
    }
  }

  const result = (await db.transaction(
    "rw",
    db.books,
    db.covers,
    async (): Promise<ImportResult> => {
      if (mode === "replace") {
        await db.books.clear();
        await db.covers.clear();
      }
      const existing = new Set((await db.books.toArray()).map((b) => b.id));
      let added = 0;
      for (const book of incoming) {
        if (existing.has(book.id)) continue;
        existing.add(book.id);
        await db.books.add(book);
        added++;
      }
      for (const entry of coverEntries) {
        if (await db.books.get(entry.bookId)) {
          await db.covers.put(entry);
        }
      }
      return { added, skipped: incoming.length - added };
    },
  )) as ImportResult;

  return result;
}

export async function importCsv(file: File): Promise<ImportResult> {
  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    throw new Error("فایل CSV خالی است");
  }
  const header = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  const colIndex = new Map<string, number>();
  header.forEach((name, i) => colIndex.set(name, i));

  function get(row: string[], column: (typeof CSV_COLUMNS)[number]): string {
    const idx = colIndex.get(column);
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  }

  const now = Date.now();
  let added = 0;
  let skipped = 0;
  let orderCounter =
    (await db.books.where("status").equals("queued").toArray())
      .reduce((max, b) => Math.max(max, b.queueOrder ?? 0), 0) + 1;

  for (const row of rows.slice(1)) {
    const title = get(row, "title");
    if (!title) {
      skipped++;
      continue;
    }
    const status = ["queued", "reading", "read", "shelf"].includes(get(row, "status"))
      ? (get(row, "status") as ReadingStatus)
      : "queued";
    const ownership = ["physical", "ebook", "audio"].includes(get(row, "ownership"))
      ? (get(row, "ownership") as Ownership)
      : "physical";

    await db.books.add({
      id: crypto.randomUUID(),
      title,
      titleLatin: get(row, "titleLatin") || undefined,
      author: get(row, "author") || undefined,
      translator: get(row, "translator") || undefined,
      publisher: get(row, "publisher") || undefined,
      pages: Number(get(row, "pages")) || undefined,
      yearShamsi: Number(get(row, "yearShamsi")) || undefined,
      yearGregorian: Number(get(row, "yearGregorian")) || undefined,
      isbn: get(row, "isbn") || undefined,
      trimSize: get(row, "trimSize") || undefined,
      binding: get(row, "binding") || undefined,
      intro: get(row, "intro") || undefined,
      notes: get(row, "notes") || undefined,
      tags: get(row, "tags")
        .split(/[؛;]/)
        .map((t) => t.trim())
        .filter(Boolean),
      categories: get(row, "categories")
        .split(/[؛;]/)
        .map((c) => c.trim())
        .filter(Boolean),
      userCategories: get(row, "userCategories")
        .split(/[؛;]/)
        .map((c) => c.trim())
        .filter(Boolean),
      status,
      queueOrder: status === "queued" ? orderCounter++ : undefined,
      ownership,
      rating: Number(get(row, "rating")) || undefined,
      source: get(row, "source") === "iranketab" ? "iranketab" : "manual",
      sourceUrl: get(row, "sourceUrl") || undefined,
      createdAt: now,
      updatedAt: now,
    });
    added++;
  }

  return { added, skipped };
}

export async function clearLibrary() {
  await db.transaction("rw", db.books, db.covers, async () => {
    await db.books.clear();
    await db.covers.clear();
  });
}
