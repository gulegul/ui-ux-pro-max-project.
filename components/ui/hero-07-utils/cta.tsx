import * as React from "react"

import { Button, type ButtonProps } from "@/components/ui/button"

// Not shipped with the 21st registry entry for Hero07; written to match the
// props the component expects (ctaEnabled / text / link / variant).
export interface CtaProps {
  ctaEnabled: boolean
  text: string
  link: string
  variant?: ButtonProps["variant"]
}

export function Cta({ cta }: Readonly<{ cta: CtaProps }>) {
  return (
    <Button
      asChild
      variant={cta.variant ?? "default"}
      size="lg"
      className={cta.variant === "link" ? "h-auto px-0" : undefined}
    >
      <a href={cta.link}>{cta.text}</a>
    </Button>
  )
}
