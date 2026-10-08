"use client";

import * as React from "react";
import { Heart } from "lucide-react";

import {
  ProductCard,
  ProductCardBadge,
  ProductCardContent,
  ProductCardHeader,
  ProductCardImage,
  ProductCardMetric,
  ProductCardSubtitle,
  ProductCardTitle,
} from "@/components/ui/product-card";
import { placeholder, type Tone } from "@/lib/placeholder";

type Product = {
  id: string;
  name: string;
  category: "Bouquet" | "Stage decor" | "Centerpiece";
  price: string;
  tone: Tone;
};

// Placeholder catalogue: replace names, prices and photos with real ones.
const PRODUCTS: Product[] = [
  { id: "blush-bouquet", name: "Blush Peony Bouquet", category: "Bouquet", price: "Rs 4,500", tone: "blush" },
  { id: "ivory-bouquet", name: "Ivory Rose Bouquet", category: "Bouquet", price: "Rs 3,800", tone: "ivory" },
  { id: "floral-arch", name: "Garden Floral Arch", category: "Stage decor", price: "Rs 85,000", tone: "sage" },
  { id: "mehndi-backdrop", name: "Marigold Backdrop", category: "Stage decor", price: "Rs 62,000", tone: "gold" },
  { id: "table-centerpiece", name: "Cascade Centerpiece", category: "Centerpiece", price: "Rs 7,500", tone: "rose" },
  { id: "candle-centerpiece", name: "Candlelit Centerpiece", category: "Centerpiece", price: "Rs 6,200", tone: "ivory" },
];

export function ProductGrid() {
  const [saved, setSaved] = React.useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((p) => {
        const isSaved = saved.has(p.id);
        return (
          <li key={p.id}>
            <ProductCard
              size="lg"
              className="max-w-none rounded-xl bg-card shadow-soft transition-shadow duration-300 hover:shadow-soft-lg"
            >
              <ProductCardImage
                src={placeholder(p.name, p.tone, 800, 1000)}
                alt={`${p.name} (placeholder photo)`}
                className="aspect-[4/5] rounded-b-none bg-accent"
                imageClassName="object-cover p-0"
              >
                <ProductCardBadge
                  isActive={isSaved}
                  aria-pressed={isSaved}
                  aria-label={
                    isSaved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`
                  }
                  icon={<Heart size={14} fill={isSaved ? "currentColor" : "none"} />}
                  onClick={() => toggle(p.id)}
                  className="min-h-9 cursor-pointer"
                >
                  {isSaved ? "Saved" : "Save"}
                </ProductCardBadge>
              </ProductCardImage>
              <ProductCardContent className="px-5 py-5">
                <ProductCardHeader>
                  <ProductCardTitle className="font-serif text-2xl font-semibold">
                    {p.name}
                  </ProductCardTitle>
                  <ProductCardSubtitle className="mt-1 uppercase tracking-widest text-xs">
                    {p.category}
                  </ProductCardSubtitle>
                </ProductCardHeader>
                <ProductCardMetric className="text-gold font-semibold">
                  {p.price}
                </ProductCardMetric>
              </ProductCardContent>
            </ProductCard>
          </li>
        );
      })}
    </ul>
  );
}
