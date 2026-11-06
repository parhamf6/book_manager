"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BookForm } from "@/components/book-form";
import {
  DEFAULT_OWNERSHIP,
  DEFAULT_STATUS,
  persistNewBook,
  type BookInput,
} from "@/lib/books";
import type {
  ScrapeBookPageResult,
  ScrapeSearchResult,
  ScrapedEdition,
} from "@/lib/scrape/iranketab";

const inputClass =
  "w-full rounded-md border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-amber focus:outline-none";

const emptyValues: BookInput = {
  title: "",
  categories: [],
  userCategories: [],
  tags: [],
  status: DEFAULT_STATUS,
  ownership: DEFAULT_OWNERSHIP,
  source: "manual",
};

type Step = "source" | "batch" | "results" | "editions" | "form";

/** One link in a batch, with its fetch outcome and progress. */
interface BatchItem {
  url: string;
  data?: ScrapeBookPageResult;
  error?: string;
  saved: boolean;
}

export default function AddBookPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("source");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ScrapeSearchResult[]>([]);
  const [linkInput, setLinkInput] = useState("");

  const [bookData, setBookData] = useState<ScrapeBookPageResult | undefined>();
  const [selectedEdition, setSelectedEdition] = useState<ScrapedEdition | undefined>();

  // Batch state: items plus the index currently being worked on.
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [batchIndex, setBatchIndex] = useState<number | undefined>();
  const batchMode = batchIndex !== undefined;
  const savedCount = batch.filter((b) => b.saved).length;

  const [formInitial, setFormInitial] = useState<{
    values: BookInput;
    coverUrl?: string;
  }>({ values: emptyValues });

  async function runSearch() {
    const term = searchTerm.trim();
    if (!term) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/scrape/search?term=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results ?? []);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "جستجو ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  /** Single-link flow (also used from search results). */
  async function loadBook(url: string) {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/scrape/book?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookData(data);
      setSelectedEdition(undefined);
      if (data.editions.length === 1) {
        startForm(data.editions[0], data);
      } else {
        setStep("editions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت اطلاعات ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  /** Multi-link flow: fetch each page (sequentially, gently) into a checklist. */
  async function runBatch(urls: string[]) {
    setBusy(true);
    setError(undefined);
    const items: BatchItem[] = urls.map((url) => ({ url, saved: false }));
    setBatch(items);
    setStep("batch");

    for (let i = 0; i < items.length; i++) {
      try {
        const res = await fetch(`/api/scrape/book?url=${encodeURIComponent(items[i].url)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBatch((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, data } : it)),
        );
      } catch (err) {
        setBatch((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  error:
                    err instanceof Error ? err.message : "دریافت اطلاعات ناموفق بود",
                }
              : it,
          ),
        );
      }
      // Small pause between requests to stay gentle with iranketab.
      if (i < items.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    setBusy(false);
  }

  function handleLinkSubmit() {
    const urls = Array.from(
      new Set(
        linkInput
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
    if (urls.length === 0) return;
    if (urls.length === 1) {
      loadBook(urls[0]);
    } else {
      runBatch(urls);
    }
  }

  function startForm(edition: ScrapedEdition, data: ScrapeBookPageResult) {
    setSelectedEdition(edition);
    setValuesFromEdition(edition, data);
    setStep("form");
  }

  function setValuesFromEdition(edition: ScrapedEdition, data: ScrapeBookPageResult) {
    setFormInitial({
      values: {
        title: edition.title,
        titleLatin: edition.titleLatin,
        author: edition.author,
        translator: edition.translator,
        publisher: edition.publisher,
        pages: edition.pages,
        yearShamsi: edition.yearShamsi,
        yearGregorian: edition.yearGregorian,
        isbn: edition.isbn,
        trimSize: edition.trimSize,
        binding: edition.binding,
        intro: data.intro,
        categories: data.categories,
        userCategories: [],
        tags: [],
        status: DEFAULT_STATUS,
        ownership: DEFAULT_OWNERSHIP,
        coverUrl: edition.coverUrl,
        source: "iranketab",
        sourceUrl: `https://www.iranketab.ir${edition.sourcePath}#pts=${edition.productId}`,
      },
      coverUrl: edition.coverUrl,
    });
  }

  /** Open an item from the batch checklist (single edition → form, else editions). */
  function openBatchItem(index: number) {
    const item = batch[index];
    if (!item.data || item.saved) return;
    setBatchIndex(index);
    setBookData(item.data);
    setSelectedEdition(undefined);
    if (item.data.editions.length === 1) {
      startForm(item.data.editions[0], item.data);
    } else {
      setStep("editions");
    }
  }

  /** Batch save: persist, mark done, and return to the checklist. */
  async function saveBatchItem(
    input: BookInput,
    cover: { file?: File; url?: string },
  ): Promise<undefined> {
    await persistNewBook(input, cover);
    setBatch((prev) =>
      prev.map((it, idx) => (idx === batchIndex ? { ...it, saved: true } : it)),
    );
    setBatchIndex(undefined);
    setStep("batch");
    return undefined;
  }

  function backFromEditions() {
    if (batchMode) {
      setBatchIndex(undefined);
      setStep("batch");
    } else {
      setStep("source");
    }
  }

  const pendingLinkCount = Array.from(
    new Set(
      linkInput
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).length;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator */}
        <nav aria-label="مراحل افزودن کتاب" className="mb-6 flex flex-wrap gap-2 text-xs text-ink-soft">
          {(
            [
              ["source", "منبع"],
              ["batch", "افزودن گروهی"],
              ["results", "نتایج جستجو"],
              ["editions", "انتخاب نسخه"],
              ["form", "اطلاعات کتاب"],
            ] as const
          ).map(([key, label]) => (
            <span
              key={key}
              className={`rounded-full px-3 py-1 ${
                step === key ? "bg-amber-soft font-medium text-ink" : "bg-paper-deep"
              }`}
            >
              {label}
            </span>
          ))}
        </nav>

        {error && (
          <p role="alert" className="mb-4 rounded-md border border-danger bg-card px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {step === "source" && (
          <section className="flex flex-col gap-6">
            {/* Paste link(s) */}
            <div className="rounded-lg border border-line bg-card p-5">
              <h2 className="mb-1 font-semibold text-ink">افزودن با لینک ایران‌کتاب</h2>
              <p className="mb-3 text-sm text-ink-soft">
                لینک صفحه‌ی کتاب را در ایران‌کتاب اینجا بچسبانید — هر لینک در یک خط.
                چند لینک بدهید تا گروهی اضافه شوند.
              </p>
              <textarea
                dir="ltr"
                rows={4}
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder={"https://www.iranketab.ir/book/1023-too-loud-a-solitude\nhttps://www.iranketab.ir/book/61161-bookstore-notes"}
                className={`${inputClass} text-left font-mono text-xs`}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy || pendingLinkCount === 0}
                  onClick={handleLinkSubmit}
                  className="cursor-pointer rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-paper hover:bg-amber-bright disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy
                    ? "…"
                    : pendingLinkCount > 1
                      ? `دریافت همه (${pendingLinkCount} کتاب)`
                      : "دریافت اطلاعات"}
                </button>
                {pendingLinkCount > 1 && (
                  <span className="text-xs text-ink-soft">
                    برای هر کتاب، همان مراحل انتخاب نسخه و تکمیل اطلاعات را طی می‌کنید.
                  </span>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="rounded-lg border border-line bg-card p-5">
              <h2 className="mb-1 font-semibold text-ink">جستجو در ایران‌کتاب</h2>
              <p className="mb-3 text-sm text-ink-soft">نام کتاب یا نویسنده را بنویسید.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="مثلاً تنهایی پرهیاهو"
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={busy || !searchTerm.trim()}
                  onClick={runSearch}
                  className="cursor-pointer rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-paper hover:bg-amber-bright disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "…" : "جستجو"}
                </button>
              </div>
            </div>

            {/* Manual */}
            <div className="rounded-lg border border-line bg-card p-5">
              <h2 className="mb-1 font-semibold text-ink">افزودن دستی</h2>
              <p className="mb-3 text-sm text-ink-soft">
                همه‌ی اطلاعات را خودتان وارد می‌کنید.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBatchIndex(undefined);
                  setFormInitial({ values: emptyValues });
                  setStep("form");
                }}
                className="cursor-pointer rounded-md border border-line-strong px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper-deep"
              >
                فرم خالی
              </button>
            </div>
          </section>
        )}

        {step === "batch" && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-ink">
                افزودن گروهی — {savedCount} از {batch.length} ذخیره شد
              </h2>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="cursor-pointer rounded-md bg-amber px-4 py-2 text-sm font-medium text-paper hover:bg-amber-bright"
              >
                اتمام و بازگشت به کتابخانه
              </button>
            </div>
            {busy && (
              <p className="mb-4 text-sm text-ink-soft">در حال دریافت اطلاعات کتاب‌ها…</p>
            )}
            <ul className="flex flex-col gap-2">
              {batch.map((item, index) => {
                const title =
                  item.data?.editions[0]?.title ?? item.url.replace(/^.*\/book\//, "");
                return (
                  <li
                    key={item.url}
                    className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
                      item.saved ? "border-line opacity-60" : "border-line"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        item.saved
                          ? "bg-amber text-paper"
                          : item.error
                            ? "bg-danger text-paper"
                            : "bg-paper-deep text-ink-soft"
                      }`}
                      aria-hidden="true"
                    >
                      {item.saved ? "✓" : item.error ? "!" : index + 1}
                    </span>
                    <div className="min-w-0 grow">
                      <p className="truncate text-sm font-medium text-ink">{title}</p>
                      {item.error && <p className="truncate text-xs text-danger">{item.error}</p>}
                      {!item.error && item.data && !item.saved && (
                        <p className="text-xs text-ink-soft">
                          {item.data.editions.length} نسخه پیدا شد
                        </p>
                      )}
                      {item.saved && <p className="text-xs text-ink-soft">ذخیره شد</p>}
                    </div>
                    {!item.saved && !item.error && item.data && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openBatchItem(index)}
                        className="shrink-0 cursor-pointer rounded-md border border-line-strong px-4 py-2 text-xs font-medium text-ink hover:bg-paper-deep disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {item.data.editions.length === 1 ? "تکمیل و ذخیره" : "انتخاب نسخه"}
                      </button>
                    )}
                    {item.error && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-xs text-amber hover:underline"
                      >
                        بررسی لینک
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {step === "results" && (
          <section>
            <button
              type="button"
              onClick={() => setStep("source")}
              className="mb-4 cursor-pointer text-sm text-amber hover:underline"
            >
              ← بازگشت
            </button>
            {results.length === 0 ? (
              <p className="rounded-lg border border-line bg-card p-8 text-center text-ink-soft">
                نتیجه‌ای پیدا نشد. عبارت دیگری را امتحان کنید.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {results.map((r) => (
                  <li key={`${r.bookPath}-${r.productId ?? ""}`}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        loadBook(
                          `https://www.iranketab.ir${r.bookPath}${
                            r.productId ? `#pts=${r.productId}` : ""
                          }`,
                        )
                      }
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-line bg-card p-3 text-start hover:border-line-strong disabled:opacity-60"
                    >
                      {r.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.thumbUrl}
                          alt=""
                          className="h-[84px] w-[57px] shrink-0 rounded-md object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-[84px] w-[57px] shrink-0 rounded-md bg-paper-deep" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{r.title}</p>
                        {r.subtitle && (
                          <p className="truncate text-xs text-ink-soft">{r.subtitle}</p>
                        )}
                        {r.author && (
                          <p className="mt-1 truncate text-sm text-ink-soft">{r.author}</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {step === "editions" && bookData && (
          <section>
            <button
              type="button"
              onClick={backFromEditions}
              className="mb-4 cursor-pointer text-sm text-amber hover:underline"
            >
              {batchMode ? "← بازگشت به فهرست" : "← بازگشت"}
            </button>
            <h2 className="mb-1 font-semibold text-ink">
              این کتاب با {bookData.editions.length} نسخه در ایران‌کتاب ثبت شده است
            </h2>
            <p className="mb-4 text-sm text-ink-soft">
              نسخه‌ای را که دارید یا می‌خوانید انتخاب کنید.
            </p>
            <ul className="flex flex-col gap-3">
              {bookData.editions.map((ed) => (
                <li key={ed.productId}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startForm(ed, bookData)}
                    className="flex w-full cursor-pointer items-start justify-between gap-4 rounded-lg border border-line bg-card p-4 text-start hover:border-line-strong disabled:opacity-60"
                  >
                    <div>
                      <p className="font-medium text-ink">{ed.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {ed.publisher}
                        {ed.translator && ` — مترجم: ${ed.translator}`}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {[
                          ed.pages && `${ed.pages} صفحه`,
                          ed.trimSize,
                          ed.binding,
                          ed.yearShamsi && `چاپ ${ed.yearShamsi}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {ed.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ed.coverUrl}
                        alt=""
                        className="h-[96px] w-[65px] shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {step === "form" && (
          <section>
            {selectedEdition && (
              <button
                type="button"
                onClick={() => setStep("editions")}
                className="mb-4 cursor-pointer text-sm text-amber hover:underline"
              >
                ← تغییر نسخه
              </button>
            )}
            <BookForm
              key={`${batchIndex ?? "single"}-${selectedEdition?.productId ?? "manual"}`}
              initial={formInitial.values}
              initialCoverUrl={formInitial.coverUrl}
              save={batchMode ? saveBatchItem : undefined}
            />
          </section>
        )}

        <p className="mt-8 text-center text-xs text-ink-soft">
          <Link href="/" className="hover:text-amber">
            بازگشت به کتابخانه
          </Link>
        </p>
      </main>
    </div>
  );
}
