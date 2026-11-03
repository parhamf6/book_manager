export default function HomePage() {
  // Placeholder shell — the live library grid lands in a later milestone.
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-ink">کتابخانه من</h1>
          <button
            type="button"
            className="cursor-pointer rounded-md bg-amber px-4 py-2 text-sm font-medium text-paper hover:bg-amber-bright"
          >
            افزودن کتاب
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-lg border border-line bg-card px-8 py-16 text-center">
          <p className="text-lg font-semibold text-ink">کتابخانه‌ات خالی است</p>
          <p className="mt-2 text-sm text-ink-soft">
            اولین کتاب را با لینک ایران‌کتاب اضافه کن، یا دستی وارد کن.
          </p>
        </div>
      </main>
    </div>
  );
}
