"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Category } from "@/types/menu";

export function CategoryNav({
  restaurantSlug,
  categories,
}: {
  restaurantSlug: string;
  categories: Category[];
}) {
  const { text } = useLocale();
  const pathname = usePathname();
  const activeSlug = pathname.split("/").pop();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [edgeState, setEdgeState] = useState({ start: true, end: false });

  const updateEdgeState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdgeState({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    updateEdgeState();
  }, [categories]);

  useEffect(() => {
    if (!activeSlug) return;
    pillRefs.current[activeSlug]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeSlug]);

  return (
    <nav className="sticky top-0 z-10 border-b border-ink-100 bg-paper/95 backdrop-blur-sm">
      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={updateEdgeState}
          className="no-scrollbar mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-3"
        >
          {categories.map((category) => {
            const isActive = category.slug === activeSlug;
            return (
              <Link
                key={category.id}
                ref={(el) => {
                  pillRefs.current[category.slug] = el;
                }}
                href={`/r/${restaurantSlug}/${category.slug}`}
                aria-current={isActive ? "true" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
                  isActive
                    ? "bg-accent-600 text-on-accent shadow-sm shadow-accent-500/30"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200 active:bg-ink-200"
                }`}
              >
                {text(category.name)}
              </Link>
            );
          })}
        </div>
        {!edgeState.start && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-paper to-transparent"
          />
        )}
        {!edgeState.end && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper to-transparent"
          />
        )}
      </div>
    </nav>
  );
}
