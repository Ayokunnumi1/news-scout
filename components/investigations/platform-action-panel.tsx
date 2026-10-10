"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePlatformActionAction } from "@/app/actions/review";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionStatus } from "@/types/domain";

/** Lets staff record that they executed (or dismissed) the recommended action manually. */
export function PlatformActionPanel({ investigationId, status }: { investigationId: string; status: ActionStatus }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function update(next: ActionStatus) {
    startTransition(async () => {
      const res = await updatePlatformActionAction(investigationId, { status: next, note });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setNote("");
      toast.success(
        next === "COMPLETED"
          ? "Action recorded as completed."
          : next === "DISMISSED"
            ? "Action dismissed."
            : "Action reopened.",
      );
      router.refresh();
    });
  }

  if (status !== "PENDING") {
    return (
      <Button variant="outline" size="sm" onClick={() => update("PENDING")} disabled={pending}>
        <RotateCcw aria-hidden /> Reopen
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Optional note, e.g. platform report reference number"
        aria-label="Action note"
        className="text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => update("COMPLETED")} disabled={pending}>
          <Check aria-hidden /> Mark as done
        </Button>
        <Button size="sm" variant="ghost" onClick={() => update("DISMISSED")} disabled={pending}>
          <X aria-hidden /> Dismiss
        </Button>
      </div>
    </div>
  );
}
