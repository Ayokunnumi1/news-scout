"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Server errors reach the client with their message redacted in production;
// we never render error details, only a friendly message and a retry.
export default function ConsoleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <TriangleAlert className="text-risk-high size-8" aria-hidden />
      <h1 className="text-lg font-semibold">This page couldn&apos;t be loaded</h1>
      <p className="text-muted-foreground text-sm">
        A temporary problem occurred while loading data. Please try again. If it keeps happening, check that the
        database is reachable.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
