import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-ink hover:text-amber">
          کتابخانه من
        </Link>
        <Link
          href="/add"
          className="cursor-pointer rounded-md bg-amber px-4 py-2 text-sm font-medium text-paper hover:bg-amber-bright"
        >
          افزودن کتاب
        </Link>
      </div>
    </header>
  );
}
