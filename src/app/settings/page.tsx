"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import {
  clearLibrary,
  exportCsv,
  exportJson,
  importCsv,
  importJson,
  type ImportMode,
} from "@/lib/io";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const cardClass = "rounded-lg border border-line bg-card p-5";

export default function SettingsPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [storage, setStorage] = useState<string | null>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then((estimate) => {
      if (estimate.usage !== undefined) {
        setStorage(`${(estimate.usage / 1024 / 1024).toFixed(1)} مگابایت`);
      }
    });
  }, []);

  async function handleExport(kind: "json" | "csv") {
    setBusy(true);
    setMessage(null);
    try {
      const date = new Date().toISOString().slice(0, 10);
      if (kind === "json") {
        download(await exportJson(), `book-archive-${date}.json`);
      } else {
        download(await exportCsv(), `book-archive-${date}.csv`);
      }
      setMessage({ kind: "ok", text: "خروجی آماده شد." });
    } catch (err) {
      console.error(err);
      setMessage({ kind: "error", text: "خروجی گرفتن ناموفق بود." });
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(kind: "json" | "csv", file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const result =
        kind === "json" ? await importJson(file, importMode) : await importCsv(file);
      setMessage({
        kind: "ok",
        text: `${result.added} کتاب اضافه شد${result.skipped > 0 ? `، ${result.skipped} مورد نادیده گرفته شد` : ""}.`,
      });
      router.refresh();
    } catch (err) {
      console.error(err);
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "وارد کردن فایل ناموفق بود.",
      });
    } finally {
      setBusy(false);
      if (jsonInput.current) jsonInput.current.value = "";
      if (csvInput.current) csvInput.current.value = "";
    }
  }

  const buttonClass =
    "cursor-pointer rounded-md px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60";
  const primaryButton = `${buttonClass} bg-amber text-paper hover:bg-amber-bright`;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-xl font-bold text-ink">تنظیمات</h1>

        {message && (
          <p
            role="status"
            className={`mb-6 rounded-md border px-4 py-3 text-sm ${
              message.kind === "ok"
                ? "border-line bg-card text-ink"
                : "border-danger bg-card text-danger"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="flex flex-col gap-6">
          {/* Export */}
          <section className={cardClass}>
            <h2 className="mb-1 font-semibold text-ink">خروجی گرفتن از کتابخانه</h2>
            <p className="mb-4 text-sm text-ink-soft">
              JSON شامل همه‌ی اطلاعات و تصاویر جلد است (مناسب پشتیبان‌گیری و انتقال).
              CSV برای مشاهده در نرم‌افزارهای صفحه‌گسترده است و جلد ندارد.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleExport("json")}
                className={primaryButton}
              >
                خروجی JSON
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleExport("csv")}
                className="cursor-pointer rounded-md border border-line-strong px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                خروجی CSV
              </button>
            </div>
          </section>

          {/* Import */}
          <section className={cardClass}>
            <h2 className="mb-1 font-semibold text-ink">وارد کردن کتابخانه</h2>
            <p className="mb-4 text-sm text-ink-soft">
              فایل خروجی همین برنامه (JSON یا CSV) را انتخاب کنید.
            </p>
            <fieldset className="mb-4">
              <legend className="mb-2 text-sm font-medium text-ink">روش وارد کردن:</legend>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")}
                  />
                  افزودن به کتابخانه فعلی (کتاب‌های تکراری نادیده گرفته می‌شوند)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                  />
                  جایگزینی کامل کتابخانه
                </label>
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => jsonInput.current?.click()}
                className={primaryButton}
              >
                وارد کردن JSON
              </button>
              <input
                ref={jsonInput}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(e) => handleImport("json", e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => csvInput.current?.click()}
                className="cursor-pointer rounded-md border border-line-strong px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                وارد کردن CSV
              </button>
              <input
                ref={csvInput}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => handleImport("csv", e.target.files?.[0])}
              />
            </div>
          </section>

          {/* Storage */}
          <section className={cardClass}>
            <h2 className="mb-1 font-semibold text-ink">حجم مصرفی</h2>
            <p className="text-sm text-ink-soft">
              {storage
                ? `کتابخانه و تصاویر جلد در حافظه‌ی مرورگر شما ${storage} فضا اشغال کرده‌اند.`
                : "محاسبه‌ی حجم در این مرورگر پشتیبانی نمی‌شود."}
            </p>
          </section>

          {/* Danger zone */}
          <section className="rounded-lg border border-danger bg-card p-5">
            <h2 className="mb-1 font-semibold text-danger">پاک کردن کتابخانه</h2>
            <p className="mb-4 text-sm text-ink-soft">
              همه‌ی کتاب‌ها و تصاویر جلد از حافظه‌ی مرورگر پاک می‌شوند. قابل بازگشت نیست.
            </p>
            <DangerButton onConfirm={async () => { await clearLibrary(); router.refresh(); setMessage({ kind: "ok", text: "کتابخانه پاک شد." }); }} />
          </section>
        </div>
      </main>
    </div>
  );
}

function DangerButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-3 text-sm">
        <span className="text-danger">مطمئنید؟</span>
        <button
          type="button"
          onClick={async () => {
            setConfirming(false);
            await onConfirm();
          }}
          className="cursor-pointer rounded-md bg-danger px-4 py-2 font-medium text-paper hover:opacity-90"
        >
          بله، همه را پاک کن
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="cursor-pointer text-ink-soft hover:underline"
        >
          انصراف
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="cursor-pointer rounded-md border border-danger px-5 py-2 text-sm text-danger hover:bg-danger hover:text-paper"
    >
      پاک کردن کل کتابخانه
    </button>
  );
}
