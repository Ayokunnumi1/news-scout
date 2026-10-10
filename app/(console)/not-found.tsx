import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <FileQuestion className="text-muted-foreground size-8" aria-hidden />
      <h1 className="text-lg font-semibold">Not found for this institution</h1>
      <p className="text-muted-foreground text-sm">
        The record doesn&apos;t exist, or it belongs to a different institution than the one currently selected.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
