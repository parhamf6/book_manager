"use client";

import { useState } from "react";

type TagEditorProps = {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Compact variant for inline use (e.g. detail-page quick controls). */
  compact?: boolean;
};

/**
 * Chip-based editor for string-array fields (tags, categories).
 * Enter or comma commits a value; clicking a chip removes it.
 */
export function TagEditor({
  label,
  values,
  onChange,
  placeholder,
  compact = false,
}: TagEditorProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim();
    if (tag && !values.includes(tag)) {
      onChange([...values, tag]);
    }
    setDraft("");
  }

  const chipClass = compact
    ? "flex cursor-pointer items-center gap-1 rounded-full bg-amber-soft px-2.5 py-1 text-xs text-ink hover:line-through"
    : "flex cursor-pointer items-center gap-1 rounded-full border border-line bg-paper-deep px-3 py-1 text-xs text-ink hover:border-line-strong";

  return (
    <div className={compact ? "flex flex-wrap items-center gap-1.5" : undefined}>
      <label
        className={`${compact ? "sr-only" : "mb-1 block text-sm font-medium text-ink"}`}
        htmlFor={`tag-editor-${label}`}
      >
        {label}
      </label>
      <input
        id={`tag-editor-${label}`}
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
        aria-label={label}
        className={
          compact
            ? "w-36 rounded-md border border-line bg-card px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-amber focus:outline-none"
            : "w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-amber focus:outline-none"
        }
      />
      {values.length > 0 && (
        <ul className={compact ? "flex flex-wrap gap-1.5" : "mt-2 flex flex-wrap gap-2"}>
          {values.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onChange(values.filter((t) => t !== tag))}
                className={chipClass}
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
