"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSourceAction, toggleSourceAction } from "@/app/actions/sources";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export function SourceActiveToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label={`${active ? "Deactivate" : "Activate"} ${name}`}
      onCheckedChange={(next) =>
        startTransition(async () => {
          const res = await toggleSourceAction(id, next);
          if (!res.ok) toast.error(res.error);
          else toast.success(next ? "Source activated." : "Source deactivated.");
          router.refresh();
        })
      }
    />
  );
}

export function DeleteSourceButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Delete ${name}`}>
          <Trash2 aria-hidden /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{name}”?</DialogTitle>
          <DialogDescription>
            The source will no longer be used for new analyses. Past investigations keep a snapshot of the evidence they
            cited. Consider deactivating instead if you may need it again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteSourceAction(id);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Source deleted.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Delete source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
