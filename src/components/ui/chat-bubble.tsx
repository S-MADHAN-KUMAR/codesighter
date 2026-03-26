"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "sent" | "received"
}

export function ChatBubble({
  variant = "received",
  className,
  children,
  ...props
}: ChatBubbleProps) {
  return (
    <div
      className={cn(
        "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
        variant === "sent"
          ? "ml-auto bg-primary text-primary-foreground"
          : "bg-muted",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ChatMessageList({
  className,
  children,
  ...props
}: ChatMessageListProps) {
  return (
    <div
      className={cn("flex flex-col gap-4 overflow-y-auto p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface ChatBubbleAvatarProps {
  src?: string
  fallback?: string
  className?: string
}

export function ChatBubbleAvatar({
  src,
  fallback,
  className,
}: ChatBubbleAvatarProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-muted border border-border/50 overflow-hidden",
        className
      )}
    >
      {src ? (
        <img src={src} alt="Avatar" className="h-4 w-4 object-cover" />
      ) : (
        <span className="text-xs font-medium uppercase">{fallback}</span>
      )}
    </div>
  )
}
