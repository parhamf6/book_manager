"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCoverBlob, saveNewBook, type BookInput } from "@/lib/books";
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
}

type TagEditorProps = {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

function TagEditor({ label, values, onChange, placeholder }: TagEditorProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim();
    if (tag && !values.includes(tag)) {
      onChange([...values, tag]);
    }
    setDraft("");
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-amber focus:outline-none"
      />
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onChange(values.filter((t) => t !== tag))}
                className="flex cursor-pointer items-center gap-1 rounded-full border border-line bg-paper-deep px-3 py-1 text-xs text-ink hover:border-line-strong"
                aria-label={`حذف ${tag}`}
              >
                {tag}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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

export function BookForm({ initial, initialCoverUrl }: BookFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BookInput>(initial);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(initialCoverUrl);
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();

  const previewSrc = useMemo(() => {
    if (coverFile) return URL.createObjectURL(coverFile);
    if (coverUrl) return `/api/proxy/image?url=${encodeURIComponent(coverUrl)}`;
    return null;
  }, [coverFile, coverUrl]);

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
      let coverBlob: Blob | undefined;
      if (coverFile) {
        coverBlob = coverFile;
      } else if (coverUrl) {
        coverBlob = await fetchCoverBlob(coverUrl);
      }
      await saveNewBook({ ...values, title: values.title.trim() }, { coverBlob });
      router.push("/");
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
                setCoverFile(e.target.files?.[0]);
                setCoverUrl(undefined);
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
              value={coverUrl ?? ""}
              onChange={(e) => {
                setCoverUrl(e.target.value || undefined);
                setCoverFile(undefined);
              }}
              placeholder="https://…"
              className={`${inputClass} text-xs`}
            />
          </div>
          {(coverFile || coverUrl) && (
            <button
              type="button"
              onClick={() => {
                setCoverFile(undefined);
                setCoverUrl(undefined);
              }}
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
        label="برچسب‌ها"
        values={values.tags}
        onChange={(tags) => set("tags", tags)}
        placeholder="مثلاً رمان، وام‌دار… (Enter برای افزودن)"
      />
      <TagEditor
        label="دسته‌بندی‌ها"
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
