import { CalendarHeart, Flower2, Sparkles, Truck, Star } from "lucide-react";

import { ProductGrid } from "@/components/landing/product-grid";
import { Button } from "@/components/ui/button";
import { Hero07 } from "@/components/ui/hero-07";
import { placeholder } from "@/lib/placeholder";

const BENEFITS = [
  {
    icon: Flower2,
    title: "Fresh, seasonal blooms",
    body: "Sourced the morning of your event so every petal looks its best in photographs.",
  },
  {
    icon: Sparkles,
    title: "Custom stage design",
    body: "Arches, backdrops and entrances sketched around your venue, palette and story.",
  },
  {
    icon: CalendarHeart,
    title: "Planned to the hour",
    body: "A single point of contact from first consultation to the last candle being lit.",
  },
  {
    icon: Truck,
    title: "Setup and teardown included",
    body: "Our crew installs before guests arrive and clears everything after the night ends.",
  },
];

// Sample copy for the demo; replace with real customer reviews.
const REVIEWS = [
  {
    quote:
      "The floral arch made our nikkah stage look like a garden. Every guest asked who did the flowers.",
    name: "Sample Customer A",
    event: "Nikkah ceremony",
  },
  {
    quote:
      "Our bouquet and table centerpieces matched perfectly. Delivery was early and the team was so calm.",
    name: "Sample Customer B",
    event: "Wedding reception",
  },
  {
    quote:
      "They understood the mehndi colours straight away. The marigold backdrop was the highlight of the night.",
    name: "Sample Customer C",
    event: "Mehndi night",
  },
];

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6"
        >
          <a href="#top" className="font-serif text-2xl font-semibold tracking-tight">
            GuleGul <span className="text-gold">Flowers</span>
          </a>
          <ul className="hidden items-center gap-8 text-sm md:flex">
            <li><a className="hover:text-gold transition-colors" href="#collection">Collection</a></li>
            <li><a className="hover:text-gold transition-colors" href="#why-us">Why us</a></li>
            <li><a className="hover:text-gold transition-colors" href="#reviews">Reviews</a></li>
          </ul>
          <Button asChild variant="gold" size="sm">
            <a href="#book">Book a consultation</a>
          </Button>
        </nav>
      </header>

      <main id="top">
        <Hero07
          tagline="Wedding stage decor, floral arches, bouquets and centerpieces"
          title="Flowers arranged the way your day deserves to be remembered."
          description="GuleGul Flowers designs and builds wedding stages, arches, bouquets and table pieces, from a single bouquet to a full venue."
          landscapeImage={placeholder("Wedding stage hero", "blush", 1800, 800)}
          landscapeAlt="Placeholder photo of a floral wedding stage"
          animation="subtle"
          primaryCTA={{ ctaEnabled: true, text: "Explore the collection", link: "#collection", variant: "gold" }}
          secondaryCTA={{ ctaEnabled: true, text: "Book a consultation", link: "#book", variant: "link" }}
        />

        <section id="collection" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20 sm:py-28">
          <div className="mb-12 max-w-2xl">
            <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em]">The collection</p>
            <h2 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
              Bouquets, stages and centerpieces
            </h2>
            <p className="text-muted-foreground mt-4">
              A few favourites to start from. Every piece is adjusted to your colours and venue.
            </p>
          </div>
          <ProductGrid />
        </section>

        <section id="why-us" className="scroll-mt-20 bg-card py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="max-w-xl text-4xl font-medium tracking-tight sm:text-5xl">
              Why couples choose GuleGul
            </h2>
            <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <span className="bg-accent text-gold inline-flex size-12 items-center justify-center rounded-full">
                    <Icon aria-hidden="true" size={22} />
                  </span>
                  <h3 className="mt-5 text-2xl font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="reviews" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20 sm:py-28">
          <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">Kind words</h2>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {REVIEWS.map((r) => (
              <li key={r.name} className="bg-card shadow-soft rounded-xl p-8">
                <div className="text-gold flex gap-1" role="img" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-5 font-serif text-2xl leading-snug">
                  &ldquo;{r.quote}&rdquo;
                </blockquote>
                <p className="mt-6 text-sm font-medium">{r.name}</p>
                <p className="text-muted-foreground text-sm">{r.event}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="book" className="scroll-mt-20 px-6 pb-20 sm:pb-28">
          <div className="bg-primary text-primary-foreground mx-auto max-w-5xl rounded-2xl px-8 py-16 text-center shadow-soft-lg sm:px-16 sm:py-20">
            <h2 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">
              Let&rsquo;s plan your flowers
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/75">
              Tell us your date, venue and colours. We&rsquo;ll reply within a day with ideas and a quote.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild variant="gold" size="lg">
                <a href="#top">Book a consultation</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#collection">Browse the collection</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        &copy; GuleGul Flowers. Demo landing page with placeholder photos.
      </footer>
    </>
  );
}
