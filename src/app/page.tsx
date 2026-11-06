"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppHeader } from "@/components/app-header";
import { BookCard } from "@/components/book-card";
import { db } from "@/lib/db";
import {
  OWNERSHIP_LABELS,
  READING_STATUS_LABELS,
  type Book,
  type Ownership,
  type ReadingStatus,
} from "@/lib/types";

type StatusTab = "all" | ReadingStatus;
type SortKey = "recent" | "title" | "rating";

const inputClass =
  "rounded-md border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-amber focus:outline-none";

/** Searchable fields — each maps a book + lowercase query to a match. */
const SEARCH_FIELDS = [
  {
    key: "title",
    label: "عنوان",
    match: (b: Book, q: string) =>
      [b.title, b.titleLatin].some((f) => f?.toLowerCase().includes(q)),
  },
  {
    key: "people",
    label: "نویسنده/مترجم",
    match: (b: Book, q: string) =>
      [b.author, b.translator].some((f) => f?.toLowerCase().includes(q)),
  },
  {
    key: "publisher",
    label: "ناشر",
    match: (b: Book, q: string) => b.publisher?.toLowerCase().includes(q) ?? false,
  },
  {
    key: "tags",
    label: "برچسب‌ها",
    match: (b: Book, q: string) => b.tags.some((t) => t.toLowerCase().includes(q)),
  },
  {
    key: "categories",
    label: "دسته‌بندی‌ها",
    match: (b: Book, q: string) =>
      b.categories.some((c) => c.toLowerCase().includes(q)) ||
      (b.userCategories ?? []).some((c) => c.toLowerCase().includes(q)),
  },
  {
    key: "text",
    label: "یادداشت/معرفی",
    match: (b: Book, q: string) =>
      [b.notes, b.intro].some((f) => f?.toLowerCase().includes(q)),
  },
  {
    key: "isbn",
    label: "شابک",
    match: (b: Book, q: string) => b.isbn?.includes(q) ?? false,
  },
] as const;

type SearchFieldKey = (typeof SEARCH_FIELDS)[number]["key"];

/** Default scope mirrors the original behavior: bibliographic fields only. */
const DEFAULT_SEARCH_SCOPE: SearchFieldKey[] = ["title", "people", "publisher"];

export default function LibraryPage() {
  const [tab, setTab] = useState<StatusTab>("all");
  const [ownership, setOwnership] = useState<Ownership | "all">("all");
  const [tag, setTag] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [userCategory, setUserCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchFieldKey[]>(DEFAULT_SEARCH_SCOPE);
  const [sort, setSort] = useState<SortKey>("recent");

  const books = useLiveQuery(() => db.books.toArray(), [], undefined);

  const allTags = useMemo(
    () => Array.from(new Set((books ?? []).flatMap((b) => b.tags))).sort(),
    [books],
  );

  const allCategories = useMemo(
    () => Array.from(new Set((books ?? []).flatMap((b) => b.categories))).sort((a, b) => a.localeCompare(b, "fa")),
    [books],
  );

  const allUserCategories = useMemo(
    () =>
      Array.from(new Set((books ?? []).flatMap((b) => b.userCategories ?? []))).sort((a, b) =>
        a.localeCompare(b, "fa"),
      ),
    [books],
  );

  const filtered = useMemo(() => {
    let list = books ?? [];
    if (tab !== "all") list = list.filter((b) => b.status === tab);
    if (ownership !== "all") list = list.filter((b) => b.ownership === ownership);
    if (tag !== "all") list = list.filter((b) => b.tags.includes(tag));
    if (category !== "all") list = list.filter((b) => b.categories.includes(category));
    if (userCategory !== "all")
      list = list.filter((b) => (b.userCategories ?? []).includes(userCategory));
    const q = query.trim().toLowerCase();
    if (q) {
      const active = SEARCH_FIELDS.filter((f) => searchScope.includes(f.key));
      list = list.filter((b) => active.some((f) => f.match(b, q)));
    }
    return [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "fa");
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return b.createdAt - a.createdAt;
    });
  }, [books, tab, ownership, tag, category, userCategory, query, searchScope, sort]);

  function toggleSearchField(key: SearchFieldKey) {
    setSearchScope((scope) =>
      scope.includes(key)
        ? scope.filter((k) => k !== key)
        : [...scope, key],
    );
  }

  const counts = useMemo(() => {
    const list = books ?? [];
    return {
      all: list.length,
      queued: list.filter((b) => b.status === "queued").length,
      reading: list.filter((b) => b.status === "reading").length,
      read: list.filter((b) => b.status === "read").length,
      shelf: list.filter((b) => b.status === "shelf").length,
    };
  }, [books]);

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Status tabs */}
        <div role="tablist" aria-label="وضعیت خواندن" className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["all", `همه (${counts.all})`],
              ["queued", `${READING_STATUS_LABELS.queued} (${counts.queued})`],
              ["reading", `${READING_STATUS_LABELS.reading} (${counts.reading})`],
              ["read", `${READING_STATUS_LABELS.read} (${counts.read})`],
              ["shelf", `${READING_STATUS_LABELS.shelf} (${counts.shelf})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm ${
                tab === key
                  ? "bg-amber font-medium text-paper"
                  : "border border-line bg-card text-ink hover:border-line-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در کتابخانه…"
            aria-label="جستجو در کتابخانه"
            className={`${inputClass} min-w-52 grow`}
          />
          <select
            value={ownership}
            onChange={(e) => setOwnership(e.target.value as Ownership | "all")}
            aria-label="نوع مالکیت"
            className={inputClass}
          >
            <option value="all">همه‌ی انواع</option>
            {Object.entries(OWNERSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {allUserCategories.length > 0 && (
            <select
              value={userCategory}
              onChange={(e) => setUserCategory(e.target.value)}
              aria-label="دسته‌بندی شخصی"
              className={inputClass}
            >
              <option value="all">همه‌ی دسته‌بندی‌های شخصی</option>
              {allUserCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {allCategories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="دسته‌بندی"
              className={inputClass}
            >
              <option value="all">همه‌ی دسته‌بندی‌ها</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {allTags.length > 0 && (
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              aria-label="برچسب"
              className={inputClass}
            >
              <option value="all">همه‌ی برچسب‌ها</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="ترتیب"
            className={inputClass}
          >
            <option value="recent">جدیدترین</option>
            <option value="title">عنوان</option>
            <option value="rating">امتیاز</option>
          </select>
        </div>

        {/* Search scope */}
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-soft">جستجو در:</span>
          {SEARCH_FIELDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={searchScope.includes(key)}
              onClick={() => toggleSearchField(key)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs ${
                searchScope.includes(key)
                  ? "bg-amber-soft font-medium text-ink"
                  : "border border-line bg-card text-ink-soft hover:border-line-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {books === undefined ? (
          <p className="py-16 text-center text-ink-soft">در حال بارگذاری…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-line bg-card px-8 py-16 text-center">
            <p className="text-lg font-semibold text-ink">
              {books.length === 0 ? "کتابخانه‌ات خالی است" : "چیزی مطابق فیلترها پیدا نشد"}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              {books.length === 0
                ? "اولین کتاب را با لینک ایران‌کتاب اضافه کن، یا دستی وارد کن."
                : "فیلترها را تغییر بده."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {filtered.map((book) => (
              <li key={book.id}>
                <BookCard book={book} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
