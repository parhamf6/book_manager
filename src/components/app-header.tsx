import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-xl font-bold text-ink hover:text-amber">
          کتابخانه من
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/queue"
            className="cursor-pointer rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:border-line-strong"
          >
            صف خواندن
          </Link>
          <Link
            href="/settings"
            className="cursor-pointer rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:border-line-strong"
            aria-label="تنظیمات"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </Link>
          <Link
            href="/add"
            className="cursor-pointer rounded-md bg-amber px-4 py-2 text-sm font-medium text-paper hover:bg-amber-bright"
          >
            افزودن کتاب
          </Link>
        </div>
      </div>
    </header>
  );
}
