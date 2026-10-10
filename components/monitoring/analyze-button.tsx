"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client/api";

export function AnalyzeButton({
  contentId,
  label = "Analyse",
  variant = "default",
  size = "sm",
}: {
  contentId: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const toastId = toast.loading("Analysing: extracting claim, comparing with trusted sources, scoring risk…");
    const result = await postJson<{ investigationId: string }>("/api/investigations", { contentId });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error, { id: toastId });
      router.refresh();
      return;
    }
    toast.success("Analysis complete.", { id: toastId });
    router.push(`/investigations/${result.data.investigationId}`);
  }

  return (
    <Button size={size} variant={variant} onClick={run} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
      {pending ? "Analysing…" : label}
    </Button>
  );
}
