import * as React from "react"
import { cn } from "@/lib/utils"

const EnhancedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    variant?: 'default' | 'gradient' | 'glass' | 'elevated' | 'interactive'
    glow?: boolean
  }
>(({ className, variant = 'default', glow = false, ...props }, ref) => {
  const variants = {
    default: "bg-card border border-border shadow-sm",
    gradient: "bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 shadow-lg",
    glass: "bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl",
    elevated: "bg-card border border-border shadow-2xl shadow-versys-primary/5",
    interactive: "bg-card border border-border shadow-sm hover:shadow-xl hover:shadow-versys-primary/10 hover:border-versys-secondary/30 transition-all duration-300 cursor-pointer hover:-translate-y-1"
  }

  const glowEffect = glow 
    ? "before:absolute before:-inset-1 before:rounded-lg before:bg-gradient-to-r before:from-versys-primary/20 before:via-versys-secondary/20 before:to-versys-accent/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 before:blur-sm relative"
    : ""

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg text-card-foreground transition-all duration-300",
        variants[variant],
        glowEffect,
        className
      )}
      {...props}
    />
  )
})
EnhancedCard.displayName = "EnhancedCard"

const EnhancedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'gradient' | 'accent'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: "",
    gradient: "bg-gradient-to-r from-versys-primary to-versys-secondary text-white",
    accent: "bg-gradient-to-r from-versys-secondary to-versys-accent text-white"
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 p-6 relative z-10",
        variants[variant],
        variant !== 'default' && "rounded-t-lg",
        className
      )}
      {...props}
    />
  )
})
EnhancedCardHeader.displayName = "EnhancedCardHeader"

const EnhancedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    gradient?: boolean
  }
>(({ className, gradient = false, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      gradient && "bg-gradient-to-r from-versys-primary to-versys-secondary bg-clip-text text-transparent",
      className
    )}
    {...props}
  />
))
EnhancedCardTitle.displayName = "EnhancedCardTitle"

const EnhancedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
EnhancedCardDescription.displayName = "EnhancedCardDescription"

const EnhancedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 relative z-10", className)} {...props} />
))
EnhancedCardContent.displayName = "EnhancedCardContent"

const EnhancedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 relative z-10", className)}
    {...props}
  />
))
EnhancedCardFooter.displayName = "EnhancedCardFooter"

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
  EnhancedCardFooter,
} 