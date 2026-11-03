"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

/**
 * Renders a book cover from the IndexedDB blob cache, falling back to the
 * original URL through the image proxy. No cover = paper placeholder.
 */
export function CoverImage({
  bookId,
  url,
  alt,
  className,
}: {
  bookId: string;
  url?: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | undefined;

    db.covers
      .get(bookId)
      .then((record) => {
        if (!alive) return;
        if (record) {
          objectUrl = URL.createObjectURL(record.blob);
          setSrc(objectUrl);
        } else if (url) {
          setSrc(`/api/proxy/image?url=${encodeURIComponent(url)}`);
        }
      })
      .catch(() => {
        if (alive && url) {
          setSrc(`/api/proxy/image?url=${encodeURIComponent(url)}`);
        }
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookId, url]);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-paper-deep text-ink-soft ${className ?? ""}`}
        role="img"
        aria-label={alt}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-8 w-8 opacity-50"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.25c-2.5-1.5-5.5-1.5-8-.5v12c2.5-1 5.5-1 8 .5 2.5-1.5 5.5-1.5 8-.5v-12c-2.5-1-5.5-1-8 .5Zm0 0v12"
          />
        </svg>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
