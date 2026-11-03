import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { BookDetailClient } from "./detail-client";

export default function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <Suspense
        fallback={<p className="py-16 text-center text-ink-soft">در حال بارگذاری…</p>}
      >
        <BookDetailClient params={params} />
      </Suspense>
    </div>
  );
}
