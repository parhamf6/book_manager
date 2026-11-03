"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { BookForm } from "@/components/book-form";
import { CoverImage } from "@/components/cover-image";
import { db } from "@/lib/db";
import {
  deleteBook,
  fetchCoverBlob,
  replaceCover,
  updateBook,
  type BookInput,
} from "@/lib/books";
import {
  OWNERSHIP_LABELS,
  READING_STATUS_LABELS,
  type Ownership,
  type ReadingStatus,
} from "@/lib/types";

const selectClass =
  "cursor-pointer rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink hover:border-line-strong focus:border-amber focus:outline-none";

function Meta({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

export function BookDetail({ id }: { id: string }) {
  const router = useRouter();
  const book = useLiveQuery(() => db.books.get(id), [id], undefined);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (book === undefined) {
    return <p className="py-16 text-center text-ink-soft">در حال بارگذاری…</p>;
  }
  if (book === null) {
    return (
      <p className="py-16 text-center text-ink-soft">
        این کتاب پیدا نشد.{" "}
        <Link href="/" className="text-amber hover:underline">
          بازگشت به کتابخانه
        </Link>
      </p>
    );
  }

  async function handleEditSave(
    values: BookInput,
    cover: { file?: File; url?: string },
  ): Promise<string> {
    let coverBlob: Blob | undefined;
    if (cover.file) {
      coverBlob = cover.file;
    } else if (cover.url) {
      coverBlob = await fetchCoverBlob(cover.url);
    }
    await replaceCover(id, coverBlob, cover.url);
    await updateBook(id, values);
    setEditing(false);
    return `/book/${id}`;
  }

  if (editing) {
    const initial: BookInput = {
      title: book.title,
      titleLatin: book.titleLatin,
      author: book.author,
      translator: book.translator,
      publisher: book.publisher,
      pages: book.pages,
      yearShamsi: book.yearShamsi,
      yearGregorian: book.yearGregorian,
      isbn: book.isbn,
      trimSize: book.trimSize,
      binding: book.binding,
      intro: book.intro,
      notes: book.notes,
      categories: book.categories,
      tags: book.tags,
      status: book.status,
      ownership: book.ownership,
      rating: book.rating,
      coverUrl: book.coverUrl,
      source: book.source,
      sourceUrl: book.sourceUrl,
    };
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mb-4 cursor-pointer text-sm text-amber hover:underline"
        >
          ← بازگشت به نمایش
        </button>
        <h1 className="mb-6 text-xl font-bold text-ink">ویرایش کتاب</h1>
        <BookForm initial={initial} initialCoverUrl={book.coverUrl} save={handleEditSave} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-amber hover:underline">
          ← کتابخانه
        </Link>
      </div>

      <div className="flex flex-col gap-8 sm:flex-row">
        {/* Cover */}
        <div className="w-[200px] shrink-0">
          <CoverImage
            bookId={book.id}
            url={book.coverUrl}
            alt={`جلد ${book.title}`}
            className="aspect-[2/3] w-full rounded-lg border border-line object-cover"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 grow">
          <h1 className="text-2xl font-bold text-ink">{book.title}</h1>
          {book.titleLatin && (
            <p dir="ltr" className="text-right text-sm text-ink-soft">
              {book.titleLatin}
            </p>
          )}
          {(book.author || book.translator) && (
            <p className="mt-2 text-sm text-ink">
              {book.author}
              {book.translator && (
                <span className="text-ink-soft"> — مترجم: {book.translator}</span>
              )}
            </p>
          )}

          {/* Rating */}
          <div
            className="mt-3 flex gap-0.5"
            aria-label={`امتیاز ${book.rating ?? 0} از ۵`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`h-5 w-5 ${
                  book.rating && star <= book.rating ? "fill-amber-bright" : "fill-line"
                }`}
              >
                <path d="M12 2.5l2.9 5.9 6.6 1-4.7 4.6 1.1 6.5L12 17.4l-5.9 3.1 1.1-6.5L2.5 9.4l6.6-1L12 2.5z" />
              </svg>
            ))}
          </div>

          {/* Quick controls */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="status-select">
              وضعیت خواندن
            </label>
            <select
              id="status-select"
              value={book.status}
              onChange={(e) => updateBook(id, { status: e.target.value as ReadingStatus })}
              className={selectClass}
            >
              {Object.entries(READING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="ownership-select">
              نوع مالکیت
            </label>
            <select
              id="ownership-select"
              value={book.ownership}
              onChange={(e) =>
                updateBook(id, { ownership: e.target.value as Ownership })
              }
              className={selectClass}
            >
              {Object.entries(OWNERSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags & categories */}
          {(book.tags.length > 0 || book.categories.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {book.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-amber-soft px-3 py-1 text-xs text-ink"
                >
                  {t}
                </span>
              ))}
              {book.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Bibliographic metadata */}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Meta label="ناشر" value={book.publisher} />
            <Meta label="تعداد صفحات" value={book.pages} />
            <Meta label="سال انتشار شمسی" value={book.yearShamsi} />
            <Meta label="سال انتشار میلادی" value={book.yearGregorian} />
            <Meta label="شابک" value={book.isbn} />
            <Meta label="قطع" value={book.trimSize} />
            <Meta label="نوع جلد" value={book.binding} />
          </dl>

          {/* Intro */}
          {book.intro && (
            <section className="mt-6">
              <h2 className="mb-1 text-sm font-semibold text-ink">معرفی</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-ink">
                {book.intro}
              </p>
            </section>
          )}

          {/* Notes */}
          {book.notes && (
            <section className="mt-6">
              <h2 className="mb-1 text-sm font-semibold text-ink">یادداشت‌ها</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-ink">
                {book.notes}
              </p>
            </section>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="cursor-pointer rounded-md bg-amber px-5 py-2 text-sm font-medium text-paper hover:bg-amber-bright"
            >
              ویرایش
            </button>
            {book.sourceUrl && (
              <a
                href={book.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line px-5 py-2 text-sm text-ink hover:border-line-strong"
              >
                صفحه‌ی ایران‌کتاب
              </a>
            )}
            {confirmingDelete ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-danger">حذف شود؟</span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteBook(id);
                    router.push("/");
                  }}
                  className="cursor-pointer rounded-md bg-danger px-4 py-2 font-medium text-paper hover:opacity-90"
                >
                  بله، حذف کن
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="cursor-pointer text-ink-soft hover:underline"
                >
                  انصراف
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="cursor-pointer rounded-md border border-danger px-5 py-2 text-sm text-danger hover:bg-danger hover:text-paper"
              >
                حذف کتاب
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
