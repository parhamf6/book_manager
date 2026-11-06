export type ReadingStatus = "queued" | "reading" | "read" | "shelf";
export type Ownership = "physical" | "ebook" | "audio";
export type BookSource = "manual" | "iranketab";

export interface Book {
  id: string;
  title: string;
  /** Title in Latin script, if the book has one (auto-scraped from iranketab) */
  titleLatin?: string;
  author?: string;
  translator?: string;
  publisher?: string;
  pages?: number;
  yearShamsi?: number;
  yearGregorian?: number;
  isbn?: string;
  /** قطع — physical trim size, e.g. رقعی، جیبی */
  trimSize?: string;
  /** نوع جلد — e.g. شومیز، جلد سخت */
  binding?: string;
  /** Auto-imported from iranketab دسته‌بندی */
  categories: string[];
  /** User-defined free-form tags */
  tags: string[];
  /** Auto-imported from iranketab معرفی — editable by user */
  intro?: string;
  /** Fully user-authored free text */
  notes?: string;
  status: ReadingStatus;
  /** Position in the reading queue; only meaningful while status === "queued" */
  queueOrder?: number;
  ownership: Ownership;
  /** Personal rating, 1–5 */
  rating?: number;
  /** Original cover URL (kept for re-fetch/export); display uses the cached blob */
  coverUrl?: string;
  source: BookSource;
  sourceUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CoverRecord {
  bookId: string;
  blob: Blob;
}

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  queued: "در صف",
  reading: "در حال خواندن",
  read: "خوانده‌شده",
  shelf: "در دسترس",
};

export const OWNERSHIP_LABELS: Record<Ownership, string> = {
  physical: "فیزیکی",
  ebook: "الکترونیکی",
  audio: "صوتی",
};
