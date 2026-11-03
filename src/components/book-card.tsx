"use client";

import Link from "next/link";
import { CoverImage } from "./cover-image";
import {
  OWNERSHIP_LABELS,
  READING_STATUS_LABELS,
  type Book,
} from "@/lib/types";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  queued: "bg-paper-deep text-ink",
  reading: "bg-amber-soft text-ink",
  read: "bg-ink text-paper",
};

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-card hover:border-line-strong"
    >
      <CoverImage
        bookId={book.id}
        url={book.coverUrl}
        alt={`جلد ${book.title}`}
        className="aspect-[2/3] w-full object-cover"
      />
      <div className="flex flex-col gap-1 p-3">
        <h3 className="truncate text-sm font-semibold text-ink group-hover:text-amber">
          {book.title}
        </h3>
        {book.author && (
          <p className="truncate text-xs text-ink-soft">{book.author}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={`rounded-full px-2 py-0.5 ${
              STATUS_BADGE_CLASSES[book.status]
            }`}
          >
            {READING_STATUS_LABELS[book.status]}
          </span>
          <span className="rounded-full border border-line px-2 py-0.5 text-ink-soft">
            {OWNERSHIP_LABELS[book.ownership]}
          </span>
        </div>
      </div>
    </Link>
  );
}
