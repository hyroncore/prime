"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  size?: "sm" | "default" | "lg"
  id?: string
  name?: string
  children?: React.ReactNode
  className?: string
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, size = "default", disabled, checked, defaultChecked, onCheckedChange, children, id, name, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-7",
      default: "h-6 w-11",
      lg: "h-8 w-14",
    }

    const thumbClasses = {
      sm: "h-3 w-3",
      default: "h-5 w-5",
      lg: "h-6 w-6",
    }

    return (
      <label
        className={cn(
          "inline-flex items-center cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="checkbox"
          className="sr-only peer"
          disabled={disabled}
          ref={ref}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <div
          className={cn(
            "relative inline-flex shrink-0 items-center rounded-full border-2 border-border bg-muted transition-colors duration-200",
            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
            "peer-checked:bg-primary peer-checked:border-primary peer-checked:-translate-x-0",
            "peer-disabled:opacity-50",
            sizeClasses[size],
            "after:content-[''] after:absolute after:top-1/2 after:-translate-y-1/2 after:left-[2px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform",
            "peer-checked:after:translate-x-full after:translate-x-[calc(100%-2px)]",
            "after:transition-transform duration-200",
            "peer-disabled:after:opacity-50"
          )}
        >
          <span className={cn("block bg-white", thumbClasses[size])} />
        </div>
        {children && (
          <span className="ms-2 text-sm font-medium text-foreground peer-disabled:opacity-50">
            {children}
          </span>
        )}
      </label>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }