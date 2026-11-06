"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TagEditor } from "@/components/tag-editor";
import { persistNewBook, type BookInput } from "@/lib/books";
import {
  OWNERSHIP_LABELS,
  READING_STATUS_LABELS,
  type Ownership,
  type ReadingStatus,
} from "@/lib/types";

interface BookFormProps {
  /** Prefilled values (e.g. from a scraped iranketab edition) */
  initial: BookInput;
  /** Original scraped cover URL — used as preview and refetched on save */
  initialCoverUrl?: string;
  /**
   * Custom save behavior (used for editing and batch mode). Receives the form
   * values plus an explicit cover choice. Return a path to navigate to, or
   * undefined to stay on the page. Defaults to creating a new book and
   * navigating to "/".
   */
  save?: (
    input: BookInput,
    cover: { kind: "none" | "url" | "file"; file?: File; url?: string },
  ) => Promise<string | undefined>;
}

function Field({
  label,
  children,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-amber focus:outline-none";

type CoverState =
  | { kind: "none" }
  | { kind: "url"; url: string }
  | { kind: "file"; file: File };

export function BookForm({ initial, initialCoverUrl, save }: BookFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BookInput>(initial);
  const [cover, setCover] = useState<CoverState>(
    initialCoverUrl ? { kind: "url", url: initialCoverUrl } : { kind: "none" },
  );
  const [titleError, setTitleError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();

  const previewSrc = useMemo(() => {
    if (cover.kind === "file") return URL.createObjectURL(cover.file);
    if (cover.kind === "url")
      return `/api/proxy/image?url=${encodeURIComponent(cover.url)}`;
    return null;
  }, [cover]);

  function set<K extends keyof BookInput>(key: K, value: BookInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setTitleError("عنوان کتاب الزامی است");
      return;
    }
    setTitleError(undefined);
    setSaving(true);
    setSaveError(undefined);
    try {
      const coverChoice = {
        kind: cover.kind,
        file: cover.kind === "file" ? cover.file : undefined,
        url: cover.kind === "url" ? cover.url : undefined,
      } as const;
      let target: string | undefined;
      if (save) {
        target = await save({ ...values, title: values.title.trim() }, coverChoice);
      } else {
        await persistNewBook({ ...values, title: values.title.trim() }, coverChoice);
        target = "/";
      }
      if (target) {
        router.push(target);
      } else {
        // Stay on the page (batch mode) — re-enable the button for the next book.
        setSaving(false);
      }
    } catch (err) {
      console.error(err);
      setSaveError("ذخیره کتاب ناموفق بود. دوباره تلاش کنید.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Cover */}
      <section className="flex gap-4 rounded-lg border border-line bg-card p-4">
        <div className="h-[180px] w-[122px] shrink-0 overflow-hidden rounded-md border border-line">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="جلد کتاب" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-paper-deep text-xs text-ink-soft">
              بدون جلد
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <span className="font-medium text-ink">جلد کتاب</span>
          <label className="cursor-pointer">
            <span className="inline-block rounded-md border border-line bg-paper-deep px-3 py-2 hover:border-line-strong">
              آپلود تصویر
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setCover(file ? { kind: "file", file } : { kind: "none" });
              }}
            />
          </label>
          <div>
            <label className="mb-1 block text-xs text-ink-soft" htmlFor="cover-url">
              یا آدرس تصویر
            </label>
            <input
              id="cover-url"
              type="url"
              dir="ltr"
              value={cover.kind === "url" ? cover.url : ""}
              onChange={(e) =>
                setCover(
                  e.target.value
                    ? { kind: "url", url: e.target.value }
                    : { kind: "none" },
                )
              }
              placeholder="https://…"
              className={`${inputClass} text-xs`}
            />
          </div>
          {cover.kind !== "none" && (
            <button
              type="button"
              onClick={() => setCover({ kind: "none" })}
              className="cursor-pointer self-start text-xs text-danger hover:underline"
            >
              حذف جلد
            </button>
          )}
        </div>
      </section>

      {/* Bibliographic data */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="عنوان" required error={titleError}>
            <input
              type="text"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="عنوان لاتین">
          <input
            type="text"
            dir="ltr"
            value={values.titleLatin ?? ""}
            onChange={(e) => set("titleLatin", e.target.value || undefined)}
            className={inputClass}
          />
        </Field>
        <Field label="نویسنده">
          <input
            type="text"
            value={values.author ?? ""}
            onChange={(e) => set("author", e.target.value || undefined)}
            className={inputClass}
          />
        </Field>
        <Field label="مترجم">
          <input
            type="text"
            value={values.translator ?? ""}
            onChange={(e) => set("translator", e.target.value || undefined)}
            className={inputClass}
          />
        </Field>
        <Field label="ناشر">
          <input
            type="text"
            value={values.publisher ?? ""}
            onChange={(e) => set("publisher", e.target.value || undefined)}
            className={inputClass}
          />
        </Field>
        <Field label="تعداد صفحات">
          <input
            type="number"
            min={1}
            value={values.pages ?? ""}
            onChange={(e) => set("pages", e.target.value ? Number(e.target.value) : undefined)}
            className={inputClass}
          />
        </Field>
        <Field label="سال انتشار شمسی">
          <input
            type="number"
            value={values.yearShamsi ?? ""}
            onChange={(e) =>
              set("yearShamsi", e.target.value ? Number(e.target.value) : undefined)
            }
            className={inputClass}
          />
        </Field>
        <Field label="سال انتشار میلادی">
          <input
            type="number"
            value={values.yearGregorian ?? ""}
            onChange={(e) =>
              set("yearGregorian", e.target.value ? Number(e.target.value) : undefined)
            }
            className={inputClass}
          />
        </Field>
        <Field label="شابک">
          <input
            type="text"
            dir="ltr"
            value={values.isbn ?? ""}
            onChange={(e) => set("isbn", e.target.value || undefined)}
            className={inputClass}
          />
        </Field>
        <Field label="قطع">
          <input
            type="text"
            value={values.trimSize ?? ""}
            onChange={(e) => set("trimSize", e.target.value || undefined)}
            className={inputClass}
          />
        </Field>
        <Field label="نوع جلد">
          <input
            type="text"
            value={values.binding ?? ""}
            onChange={(e) => set("binding", e.target.value || undefined)}
            className={inputClass}
          />
        </Field>
      </section>

      {/* Intro */}
      <Field label="معرفی">
        <textarea
          rows={4}
          value={values.intro ?? ""}
          onChange={(e) => set("intro", e.target.value || undefined)}
          className={inputClass}
        />
      </Field>

      {/* Personal data */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="وضعیت خواندن">
          <select
            value={values.status}
            onChange={(e) => set("status", e.target.value as ReadingStatus)}
            className={inputClass}
          >
            {Object.entries(READING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="نوع مالکیت">
          <select
            value={values.ownership}
            onChange={(e) => set("ownership", e.target.value as Ownership)}
            className={inputClass}
          >
            {Object.entries(OWNERSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="امتیاز">
          <div className="flex gap-1 pt-1.5" role="radiogroup" aria-label="امتیاز">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={values.rating === star}
                aria-label={`${star} ستاره`}
                onClick={() =>
                  set("rating", values.rating === star ? undefined : star)
                }
                className="cursor-pointer p-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 ${
                    values.rating && star <= values.rating
                      ? "fill-amber-bright"
                      : "fill-line"
                  }`}
                  aria-hidden="true"
                >
                  <path d="M12 2.5l2.9 5.9 6.6 1-4.7 4.6 1.1 6.5L12 17.4l-5.9 3.1 1.1-6.5L2.5 9.4l6.6-1L12 2.5z" />
                </svg>
              </button>
            ))}
          </div>
        </Field>
      </section>

      <TagEditor
        label="دسته‌بندی شخصی"
        values={values.userCategories}
        onChange={(userCategories) => set("userCategories", userCategories)}
        placeholder="مثلاً کتاب‌های کاری، رمان فارسی… (Enter برای افزودن)"
      />
      <TagEditor
        label="برچسب‌ها"
        values={values.tags}
        onChange={(tags) => set("tags", tags)}
        placeholder="مثلاً رمان، وام‌دار… (Enter برای افزودن)"
      />
      <TagEditor
        label="دسته‌بندی‌های ایران‌کتاب"
        values={values.categories}
        onChange={(categories) => set("categories", categories)}
        placeholder="دسته‌بندی‌های ایران‌کتاب اینجا می‌آیند؛ می‌توانید ویرایش کنید"
      />

      {/* Notes */}
      <Field label="یادداشت‌ها">
        <textarea
          rows={5}
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || undefined)}
          placeholder="یادداشت‌های شخصی شما درباره این کتاب"
          className={inputClass}
        />
      </Field>

      {saveError && <p className="text-sm text-danger">{saveError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer rounded-md bg-amber px-6 py-2.5 text-sm font-medium text-paper hover:bg-amber-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "در حال ذخیره…" : "ذخیره کتاب"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer rounded-md border border-line px-6 py-2.5 text-sm text-ink hover:border-line-strong"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
