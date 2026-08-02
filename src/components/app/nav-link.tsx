"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function PendingMark() {
  const { pending } = useLinkStatus();

  return pending ? (
    <span aria-hidden="true" className="bg-primary absolute inset-y-2 left-0 w-0.5 animate-pulse rounded-full" />
  ) : null;
}

export function AppNavLink({
  children,
  className,
  ...props
}: ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link {...props} prefetch className={cn("relative", className)}>
      <PendingMark />
      {children}
    </Link>
  );
}
