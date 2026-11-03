import { NextResponse } from "next/server";
import {
  extractProductId,
  fetchPage,
  normalizeBookPath,
  parseBookPage,
} from "@/lib/scrape/iranketab";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "پارامتر url الزامی است" }, { status: 400 });
  }

  const path = normalizeBookPath(raw);
  if (!path) {
    return NextResponse.json(
      { error: "لینک واردشده یک کتاب ایران‌کتاب نیست" },
      { status: 400 },
    );
  }

  try {
    const html = await fetchPage(path);
    const parsed = parseBookPage(html, path, extractProductId(raw));
    if (parsed.editions.length === 0) {
      return NextResponse.json(
        { error: "هیچ نسخه‌ای در این صفحه پیدا نشد" },
        { status: 404 },
      );
    }
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("scrape/book failed:", err);
    return NextResponse.json(
      { error: "دریافت اطلاعات کتاب ناموفق بود" },
      { status: 502 },
    );
  }
}
