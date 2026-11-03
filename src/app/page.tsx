import { AppHeader } from "@/components/app-header";

export default function HomePage() {
  // Placeholder shell — the live library grid lands in a later milestone.
  return (
    <div className="min-h-screen">
      <AppHeader />
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
