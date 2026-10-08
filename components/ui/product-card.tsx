"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/* Context for sharing state between compound components */

type ProductCardVariant = "default" | "inner";
type ProductCardSize = "sm" | "default" | "lg";

interface ProductCardContextValue {
  variant: ProductCardVariant;
  size: ProductCardSize;
  animated: boolean;
}

const ProductCardContext = React.createContext<ProductCardContextValue | null>(
  null,
);

function useProductCardContext() {
  const context = React.useContext(ProductCardContext);
  if (!context) {
    throw new Error(
      "ProductCard compound components must be used within <ProductCard>",
    );
  }
  return context;
}

/* Size tables: only the values that cannot be derived. The card's type size
 * is set once on the root and inherited by title, subtitle and metric. */

const cardWidth: Record<ProductCardSize, string> = {
  sm: "max-w-[200px]",
  default: "max-w-[320px]",
  lg: "max-w-[460px]",
};

const cardText: Record<ProductCardSize, string> = {
  sm: "text-xs",
  default: "text-sm",
  lg: "text-base",
};

const imagePadding: Record<ProductCardSize, string> = {
  sm: "p-4",
  default: "p-8",
  lg: "p-12",
};

// The inner variant parks the title/metric row over the bottom of the same
// square, so the object-contain subject has to clear it.
const imagePaddingInner: Record<ProductCardSize, string> = {
  sm: "pb-14",
  default: "pb-20",
  lg: "pb-24",
};

const contentPadding: Record<ProductCardSize, string> = {
  sm: "px-0.5 py-2",
  default: "px-1 py-3",
  lg: "px-2 py-4",
};

const contentPaddingInner: Record<ProductCardSize, string> = {
  sm: "p-2",
  default: "p-3",
  lg: "p-4",
};

const badgePosition: Record<ProductCardSize, string> = {
  sm: "top-1.5 right-1.5 px-1.5 py-0.5",
  default: "top-2 right-2 px-2 py-1",
  lg: "top-3 right-3 px-3 py-1.5",
};

/* ProductCard (root) */

interface ProductCardProps extends React.ComponentProps<"div"> {
  /** `default` puts the content below the image, `inner` lays it over it. */
  variant?: ProductCardVariant;
  size?: ProductCardSize;
  /** Lift the image on hover and press. Defaults to true. */
  animated?: boolean;
}

function ProductCard({
  className,
  variant = "default",
  size = "default",
  animated = true,
  children,
  ...props
}: ProductCardProps) {
  // A card is not a control. It only claims to be clickable when a handler
  // actually arrives. A card that has to be keyboard-reachable should put a
  // real <a>/<button> on its title and stretch it (`after:absolute
  // after:inset-0`) rather than making this div interactive.
  const interactive = Boolean(props.onClick);

  return (
    <ProductCardContext.Provider value={{ variant, size, animated }}>
      <div
        data-slot="product-card"
        className={cn(
          "w-full overflow-hidden",
          "rounded-[var(--radius-container,calc(var(--radius,0.5rem)_+_4px))]",
          cardText[size],
          // The size step caps the card's width; a `w-*`/`max-w-*` in
          // className overrides the cap outright.
          cardWidth[size],
          interactive && "cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ProductCardContext.Provider>
  );
}

/* ProductCardImage */

interface ProductCardImageProps extends React.ComponentProps<"div"> {
  src: string;
  alt: string;
  /** Classes for the `<img>` itself. */
  imageClassName?: string;
}

function ProductCardImage({
  className,
  src,
  alt,
  imageClassName,
  children,
  ...props
}: ProductCardImageProps) {
  const { variant, size, animated } = useProductCardContext();
  const wellRef = React.useRef<HTMLDivElement>(null);
  // Touch screens have no hover, so a tap pins the lift here and the next tap
  // anywhere else releases it. Desktop keeps hover alone.
  const [pressed, setPressed] = React.useState(false);
  React.useEffect(() => {
    if (!pressed) return;
    const release = (event: PointerEvent) => {
      if (!wellRef.current?.contains(event.target as Node)) setPressed(false);
    };
    document.addEventListener("pointerdown", release);
    return () => document.removeEventListener("pointerdown", release);
  }, [pressed]);
  const pressToHold = (event: React.PointerEvent<HTMLDivElement>) => {
    if (animated && event.pointerType === "touch") setPressed(true);
  };

  return (
    <div
      ref={wellRef}
      data-slot="product-card-image"
      data-pressed={pressed || undefined}
      onPointerDown={pressToHold}
      className={cn(
        "group/card-image relative aspect-square w-full overflow-hidden",
        "transition-colors duration-(--motion-fast) ease-spring",
        "rounded-[var(--radius-container,calc(var(--radius,0.5rem)_+_4px))]",
        "bg-muted hover:bg-muted/80 active:bg-muted/80 data-[pressed]:bg-muted/80",
        className,
      )}
      {...props}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- registry
          component: must not depend on next/image. */}
      <img
        data-slot="product-card-img"
        src={src || "/placeholder.svg"}
        alt={alt}
        className={cn(
          "absolute inset-0 h-full w-full object-contain",
          animated && [
            "transition-transform duration-(--motion-slow) ease-spring",
            "group-hover/card-image:-translate-y-2 group-active/card-image:-translate-y-2",
            "group-data-[pressed]/card-image:-translate-y-2",
          ],
          imagePadding[size],
          variant === "inner" && imagePaddingInner[size],
          imageClassName,
        )}
      />
      {children}
    </div>
  );
}

/* ProductCardBadge */

interface ProductCardBadgeProps extends React.ComponentProps<"button"> {
  /** Swaps the badge to the filled treatment. */
  isActive?: boolean;
  icon?: React.ReactNode;
}

function ProductCardBadge({
  className,
  isActive = false,
  icon,
  children,
  onClick,
  ...props
}: ProductCardBadgeProps) {
  const { size } = useProductCardContext();

  return (
    <button
      data-slot="product-card-badge"
      type="button"
      onClick={(e) => {
        // A wishlist toggle must not also open the product.
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cn(
        "absolute flex items-center gap-1 font-medium",
        "transition-colors duration-(--motion-fast) ease-spring",
        "rounded-[var(--radius-button,var(--radius,0.5rem))]",
        "text-[0.85em]",
        badgePosition[size],
        isActive
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-popover text-popover-foreground hover:bg-accent",
        "outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

/* ProductCardContent (container for title, subtitle, metric) */

type ProductCardContentProps = React.ComponentProps<"div">;

function ProductCardContent({
  className,
  children,
  ...props
}: ProductCardContentProps) {
  const { variant, size } = useProductCardContext();

  return (
    <div
      data-slot="product-card-content"
      className={cn(
        "flex items-start justify-between gap-2",
        variant === "default" && contentPadding[size],
        variant === "inner" && [
          "absolute inset-x-0 bottom-0 items-end",
          contentPaddingInner[size],
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ProductCardHeader (wrapper for title + subtitle) */

type ProductCardHeaderProps = React.ComponentProps<"div">;

function ProductCardHeader({
  className,
  children,
  ...props
}: ProductCardHeaderProps) {
  return (
    <div
      data-slot="product-card-header"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* Title / Subtitle / Metric inherit the card's font size. */

type ProductCardTitleProps = React.ComponentProps<"h3">;

function ProductCardTitle({
  className,
  children,
  ...props
}: ProductCardTitleProps) {
  return (
    <h3
      data-slot="product-card-title"
      className={cn("text-foreground truncate font-medium", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

type ProductCardSubtitleProps = React.ComponentProps<"p">;

function ProductCardSubtitle({
  className,
  children,
  ...props
}: ProductCardSubtitleProps) {
  return (
    <p
      data-slot="product-card-subtitle"
      className={cn("text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

type ProductCardMetricProps = React.ComponentProps<"span">;

function ProductCardMetric({
  className,
  children,
  ...props
}: ProductCardMetricProps) {
  return (
    <span
      data-slot="product-card-metric"
      className={cn("text-foreground shrink-0 font-medium", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export {
  ProductCard,
  ProductCardImage,
  ProductCardBadge,
  ProductCardContent,
  ProductCardHeader,
  ProductCardTitle,
  ProductCardSubtitle,
  ProductCardMetric,
  type ProductCardProps,
  type ProductCardImageProps,
  type ProductCardBadgeProps,
  type ProductCardContentProps,
  type ProductCardHeaderProps,
  type ProductCardTitleProps,
  type ProductCardSubtitleProps,
  type ProductCardMetricProps,
  type ProductCardSize,
  type ProductCardVariant,
};

export default ProductCard;
