import { NextResponse } from "next/server";
import { fetchPage, searchBooks } from "@/lib/scrape/iranketab";

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("term")?.trim();
  if (!term) {
    return NextResponse.json({ error: "پارامتر term الزامی است" }, { status: 400 });
  }
  try {
    // The search term is a path segment on iranketab, not a query param.
    const html = await fetchPage(`/result/${encodeURIComponent(term)}`);
    const results = searchBooks(term, html);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("scrape/search failed:", err);
    return NextResponse.json(
      { error: "جستجو در ایران‌کتاب ناموفق بود" },
      { status: 502 },
    );
  }
}
