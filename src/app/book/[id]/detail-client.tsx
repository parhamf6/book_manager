"use client";

import { use } from "react";
import { BookDetail } from "@/components/book-detail";

export function BookDetailClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <BookDetail id={id} />;
}
