"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { AppHeader } from "@/components/app-header";
import { CoverImage } from "@/components/cover-image";
import { db } from "@/lib/db";
import { reorderQueue } from "@/lib/books";

function QueueRow({
  bookId,
  title,
  author,
  coverUrl,
  position,
  isFirst,
  isLast,
  onMove,
  dragHandlers,
  dragging,
  dragOver,
}: {
  bookId: string;
  title: string;
  author?: string;
  coverUrl?: string;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  dragHandlers: React.HTMLAttributes<HTMLLIElement>;
  dragging: boolean;
  dragOver: boolean;
}) {
  return (
    <li
      draggable
      {...dragHandlers}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
        dragging ? "border-amber opacity-50" : dragOver ? "border-amber" : "border-line"
      }`}
    >
      <span
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full bg-paper-deep text-sm text-ink-soft"
        aria-hidden="true"
      >
        ⠿
      </span>
      <span className="w-6 shrink-0 text-center text-sm font-bold text-amber" aria-hidden="true">
        {position}
      </span>
      <CoverImage
        bookId={bookId}
        url={coverUrl}
        alt={`جلد ${title}`}
        className="h-[72px] w-[49px] shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 grow">
        <p className="truncate font-medium text-ink">{title}</p>
        {author && <p className="truncate text-xs text-ink-soft">{author}</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMove(bookId, -1)}
          aria-label={`انتقال ${title} به بالا`}
          className="cursor-pointer rounded border border-line px-2 py-0.5 text-xs text-ink hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          ▲
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMove(bookId, 1)}
          aria-label={`انتقال ${title} به پایین`}
          className="cursor-pointer rounded border border-line px-2 py-0.5 text-xs text-ink hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          ▼
        </button>
      </div>
      <Link
        href={`/book/${bookId}`}
        className="shrink-0 cursor-pointer text-xs text-amber hover:underline"
      >
        جزئیات
      </Link>
    </li>
  );
}

export default function QueuePage() {
  const queued = useLiveQuery(
    () =>
      db.books
        .where("status")
        .equals("queued")
        .toArray()
        .then((list) => list.sort((a, b) => (a.queueOrder ?? 0) - (b.queueOrder ?? 0))),
    [],
    undefined,
  );

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const ordered = useMemo(
    () => (queued ?? []).map((b) => b.id),
    [queued],
  );
  const booksById = new Map((queued ?? []).map((b) => [b.id, b]));

  function move(id: string, direction: -1 | 1) {
    const idx = ordered.indexOf(id);
    const target = idx + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    next.splice(idx, 1);
    next.splice(target, 0, id);
    reorderQueue(next);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const next = [...ordered];
    next.splice(next.indexOf(dragId), 1);
    next.splice(next.indexOf(targetId) + 1, 0, dragId);
    reorderQueue(next);
    setDragId(null);
    setOverId(null);
  }

  const readingNow = useLiveQuery(
    () => db.books.where("status").equals("reading").toArray(),
    [],
    undefined,
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-2 text-xl font-bold text-ink">صف خواندن</h1>
        <p className="mb-6 text-sm text-ink-soft">
          با کشیدن کتاب‌ها ترتیب خواندنشان را مشخص کنید؛ ردیف اول، کتاب بعدی شماست.
        </p>

        {readingNow && readingNow.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-amber">
              در حال خواندن
            </h2>
            <ul className="flex flex-col gap-3">
              {readingNow.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-lg border border-amber bg-card p-3"
                >
                  <CoverImage
                    bookId={b.id}
                    url={b.coverUrl}
                    alt={`جلد ${b.title}`}
                    className="h-[72px] w-[49px] shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0 grow">
                    <p className="truncate font-medium text-ink">{b.title}</p>
                    {b.author && (
                      <p className="truncate text-xs text-ink-soft">{b.author}</p>
                    )}
                  </div>
                  <Link
                    href={`/book/${b.id}`}
                    className="shrink-0 cursor-pointer text-xs text-amber hover:underline"
                  >
                    جزئیات
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">بعدی‌ها</h2>
          {queued === undefined ? (
            <p className="py-8 text-center text-ink-soft">در حال بارگذاری…</p>
          ) : ordered.length === 0 ? (
            <p className="rounded-lg border border-line bg-card px-8 py-12 text-center text-ink-soft">
              صف خالی است. کتاب‌هایی با وضعیت «در صف» اینجا می‌آیند.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ordered.map((id, index) => {
                const b = booksById.get(id)!;
                return (
                  <QueueRow
                    key={id}
                    bookId={b.id}
                    title={b.title}
                    author={b.author}
                    coverUrl={b.coverUrl}
                    position={index + 1}
                    isFirst={index === 0}
                    isLast={index === ordered.length - 1}
                    onMove={move}
                    dragging={dragId === id}
                    dragOver={overId === id && dragId !== id}
                    dragHandlers={{
                      onDragStart: (e) => {
                        setDragId(id);
                        e.dataTransfer.effectAllowed = "move";
                      },
                      onDragOver: (e) => {
                        e.preventDefault();
                        setOverId(id);
                      },
                      onDragLeave: () => setOverId((cur) => (cur === id ? null : cur)),
                      onDrop: (e) => {
                        e.preventDefault();
                        handleDrop(id);
                      },
                      onDragEnd: () => {
                        setDragId(null);
                        setOverId(null);
                      },
                    }}
                  />
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
