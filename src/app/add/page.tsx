"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { BookForm } from "@/components/book-form";
import { DEFAULT_OWNERSHIP, DEFAULT_STATUS, type BookInput } from "@/lib/books";
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
  tags: [],
  status: DEFAULT_STATUS,
  ownership: DEFAULT_OWNERSHIP,
  source: "manual",
};

type Step = "source" | "results" | "editions" | "form";

export default function AddBookPage() {
  const [step, setStep] = useState<Step>("source");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ScrapeSearchResult[]>([]);
  const [linkInput, setLinkInput] = useState("");

  const [bookData, setBookData] = useState<ScrapeBookPageResult | undefined>();
  const [selectedEdition, setSelectedEdition] = useState<ScrapedEdition | undefined>();

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

  function startForm(edition: ScrapedEdition, data: ScrapeBookPageResult) {
    setSelectedEdition(edition);
    setValuesFromEdition(edition, data);
    setStep("form");
  }

  const [formInitial, setFormInitial] = useState<{
    values: BookInput;
    coverUrl?: string;
  }>({ values: emptyValues });

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

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator */}
        <nav aria-label="مراحل افزودن کتاب" className="mb-6 flex gap-2 text-xs text-ink-soft">
          {(
            [
              ["source", "منبع"],
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
            {/* Paste link */}
            <div className="rounded-lg border border-line bg-card p-5">
              <h2 className="mb-1 font-semibold text-ink">افزودن با لینک ایران‌کتاب</h2>
              <p className="mb-3 text-sm text-ink-soft">
                لینک صفحه‌ی کتاب را در ایران‌کتاب اینجا بچسبانید.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  dir="ltr"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://www.iranketab.ir/book/…"
                  className={inputClass}
                  onKeyDown={(e) => e.key === "Enter" && loadBook(linkInput)}
                />
                <button
                  type="button"
                  disabled={busy || !linkInput.trim()}
                  onClick={() => loadBook(linkInput)}
                  className="cursor-pointer rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-paper hover:bg-amber-bright disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "…" : "دریافت اطلاعات"}
                </button>
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
              onClick={() => setStep("source")}
              className="mb-4 cursor-pointer text-sm text-amber hover:underline"
            >
              ← بازگشت
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
            <BookForm initial={formInitial.values} initialCoverUrl={formInitial.coverUrl} />
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
