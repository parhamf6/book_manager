import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "www.iranketab.ir",
  "iranketab.ir",
  "img.iranketab.ir",
]);

/**
 * Streams a remote iranketab image to the client so the browser can cache it
 * as a blob (bypassing CORS). The client fetches each cover once through this
 * route and persists it in IndexedDB.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "پارامتر url الزامی است" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "آدرس تصویر نامعتبر است" }, { status: 400 });
  }

  if (
    target.protocol !== "https:" ||
    !ALLOWED_HOSTS.has(target.hostname)
  ) {
    return NextResponse.json({ error: "آدرس تصویر مجاز نیست" }, { status: 403 });
  }

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/126",
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok || !res.body) {
      return NextResponse.json({ error: "دریافت تصویر ناموفق بود" }, { status: 502 });
    }
    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("proxy/image failed:", err);
    return NextResponse.json({ error: "دریافت تصویر ناموفق بود" }, { status: 502 });
  }
}
