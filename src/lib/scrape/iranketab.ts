/**
 * Parsers for iranketab.ir — server-side only (used by the scrape proxy routes).
 *
 * Verified against the live site:
 * - Search:  GET /result/{urlencoded term}   (term is a PATH segment, not a query param)
 *   Result cards live in div[page-search-result]; book cards link to /book/{id}-{slug}#pts={editionId}
 * - Book:    GET /book/{id}-{slug}
 *   One page = one work with N edition blocks, each <div id="p-{productId}">.
 *   Labeled detail rows: <span class="text-default">LABEL:</span> followed by value element.
 *   Page-level intro in #section_about, categories in #section_categories.
 */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

const BASE = "https://www.iranketab.ir";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** Strip zero-width / bidi control characters that leak into scraped values. */
function clean(text: string): string {
  return text
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\u2028\u2029]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toInt(text: string): number | undefined {
  const m = clean(text).match(/\d+/);
  return m ? parseInt(m[0], 10) : undefined;
}

export interface ScrapeSearchResult {
  /** Path of the book page, e.g. /book/1023-too-loud-a-solitude */
  bookPath: string;
  /** Specific edition id from the #pts= fragment, when present */
  productId?: string;
  title: string;
  /** Series / collection line, when present */
  subtitle?: string;
  author?: string;
  thumbUrl?: string;
}

export interface ScrapedEdition {
  productId: string;
  title: string;
  titleLatin?: string;
  author?: string;
  translator?: string;
  publisher?: string;
  pages?: number;
  yearShamsi?: number;
  yearGregorian?: number;
  isbn?: string;
  trimSize?: string;
  binding?: string;
  printRun?: number;
  coverUrl?: string;
  /** iranketab page for this work; the chosen edition is reachable via #pts= */
  sourcePath: string;
}

export interface ScrapeBookPageResult {
  /** Path that was scraped, without fragment */
  sourcePath: string;
  /** Edition preselected by the search result link or the pasted URL */
  defaultProductId?: string;
  editions: ScrapedEdition[];
  intro?: string;
  categories: string[];
}

export async function fetchPage(pathOrUrl: string): Promise<string> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`iranketab returned ${res.status} for ${url}`);
  }
  return res.text();
}

export function normalizeBookPath(raw: string): string | null {
  // Accept full URLs, bare paths, or raw book ids. Strips any #pts= fragment
  // (returned separately) and query params.
  let candidate = raw.trim();
  if (/^\d+$/.test(candidate)) {
    return `/book/${candidate}`;
  }
  try {
    const url = new URL(candidate, BASE);
    if (url.hostname !== "www.iranketab.ir" && url.hostname !== "iranketab.ir") {
      return null;
    }
    const m = url.pathname.match(/^\/book\/[^/]+/);
    if (!m) return null;
    return m[0];
  } catch {
    return null;
  }
}

export function extractProductId(raw: string): string | undefined {
  const m = raw.match(/#pts=(\d+)/) ?? raw.match(/\/book\/(\d+)/);
  return m ? m[1] : undefined;
}

export function searchBooks(term: string, html: string): ScrapeSearchResult[] {
  const $ = cheerio.load(html);
  const results: ScrapeSearchResult[] = [];
  const seen = new Set<string>();

  $('div[page-search-result] a[href^="/book/"]').each((_, el) => {
    const a = $(el);
    const href = a.attr("href") ?? "";
    const [path, fragment] = href.split("#");
    const title = clean(a.find("div.text-primary").text());
    const subtitle = clean(a.find("div.text-xs").first().text());
    const author = clean(a.find("div.text-sm").first().text());
    const thumbUrl = a.find("img").attr("src");

    const key = `${path}${fragment ?? ""}`;
    if (seen.has(key) || !title) return;
    seen.add(key);
    results.push({
      bookPath: path,
      productId: fragment?.match(/^pts=(\d+)/)?.[1],
      title,
      subtitle: subtitle || undefined,
      author: author || undefined,
      thumbUrl,
    });
  });

  return results;
}

/**
 * Parse one labeled row: label span followed by value element(s).
 * Returns undefined for author/translator/publisher rows (handled separately
 * via link extraction) unless no links are present.
 */
function parseDetailRows(
  $: cheerio.CheerioAPI,
  scope: cheerio.Cheerio<AnyNode>,
): Record<string, string> {
  const rows: Record<string, string> = {};
  scope.find('span.text-default').each((_, el) => {
    const label = clean($(el).text()).replace(/[:：]\s*$/, "");
    if (!label) return;
    const valueEl = $(el).next();
    if (valueEl.length === 0) return;
    if (!(label in rows)) {
      rows[label] = clean(valueEl.text());
    }
  });
  return rows;
}

/** Extract people/publisher links from labeled rows; joins multiple links. */
function parseLinkedRow(
  $: cheerio.CheerioAPI,
  scope: cheerio.Cheerio<AnyNode>,
  label: string,
): string | undefined {
  let value: string | undefined;
  scope.find('span.text-default').each((_, el) => {
    if (value) return;
    const elLabel = clean($(el).text()).replace(/[:：]\s*$/, "");
    if (elLabel !== label) return;
    const links = $(el)
      .next()
      .find("a")
      .map((__, a) => clean($(a).text()))
      .get()
      .filter(Boolean);
    if (links.length > 0) {
      value = links.join("، ");
    } else {
      const text = clean($(el).next().text());
      if (text) value = text;
    }
  });
  return value;
}

export function parseBookPage(
  html: string,
  sourcePath: string,
  defaultProductId?: string,
): ScrapeBookPageResult {
  const $ = cheerio.load(html);

  const intro = clean(
    $("#section_about .card div.text-sm").first().text(),
  );
  const categories = $("#section_categories a[href^='/tag/']")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter(Boolean);

  const editions: ScrapedEdition[] = [];
  const seenProducts = new Set<string>();

  $("div[id^='p-']").each((_, block) => {
    const scope = $(block);
    const productId = scope.attr("id")?.slice(2) ?? "";
    if (!productId || seenProducts.has(productId)) return;
    seenProducts.add(productId);

    const title = clean(scope.find("h2[itemprop='name']").first().text());
    if (!title) return;

    // English title: the .ltr div directly after the h2
    const titleLatin =
      clean(
        scope
          .find("h2[itemprop='name']")
          .first()
          .next(".ltr")
          .text(),
      ) || undefined;

    const coverUrl =
      scope.find("a[rel^='product_pics_lg_']").first().attr("href") ||
      scope.find("img[itemprop='image']").first().attr("src") ||
      undefined;

    const rows = parseDetailRows($, scope);

    const yearShamsi = toInt(rows["سال انتشار شمسی"] ?? "");
    const yearGregorian = toInt(rows["سال انتشار میلادی"] ?? "");
    const pages = toInt(rows["تعداد صفحه"] ?? "");
    const printRun = toInt(rows["سری چاپ"] ?? "");

    editions.push({
      productId,
      title,
      titleLatin,
      author: parseLinkedRow($, scope, "نویسنده"),
      translator: parseLinkedRow($, scope, "مترجم"),
      publisher: parseLinkedRow($, scope, "انتشارات"),
      pages,
      yearShamsi,
      yearGregorian,
      isbn: rows["شابک"] || undefined,
      trimSize: rows["قطع"] || undefined,
      binding: rows["نوع جلد"] || undefined,
      printRun,
      coverUrl,
      sourcePath,
    });
  });

  return {
    sourcePath,
    defaultProductId,
    editions,
    intro: intro || undefined,
    categories,
  };
}
