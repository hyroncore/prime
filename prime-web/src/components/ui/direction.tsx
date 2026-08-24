import * as React from "react"
import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction"

interface DirectionProps {
  direction?: "ltr" | "rtl"
  children: React.ReactNode
}

function DirectionProvider({ direction = "rtl", children }: DirectionProps) {
  return (
    <RadixDirectionProvider dir={direction}>{children}</RadixDirectionProvider>
  )
}

export { DirectionProvider }