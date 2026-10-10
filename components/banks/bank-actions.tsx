"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createBankAction, selectBankAction } from "@/app/actions/banks";
import { Alert, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SelectBankButton({ bankId, name }: { bankId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await selectBankAction(bankId);
          if (!res.ok) return void toast.error(res.error);
          toast.success(`Switched to ${name}`);
          router.push("/dashboard");
          router.refresh();
        })
      }
    >
      Switch to this institution
    </Button>
  );
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function CreateBankDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await createBankAction({
        name,
        slug,
        description: String(fd.get("description") ?? ""),
        logo_url: String(fd.get("logo_url") ?? ""),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        return;
      }
      toast.success(`${name} created and selected.`);
      setOpen(false);
      router.push("/sources");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> Add institution
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add financial institution</DialogTitle>
          <DialogDescription>
            Each institution has fully separate sources, posts, investigations and responses.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>{formError}</AlertTitle>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="bank-name">Name *</Label>
            <Input
              id="bank-name"
              value={name}
              maxLength={120}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? <p className="text-destructive text-xs">{errors.name.join(" ")}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-slug">Identifier (slug) *</Label>
            <Input
              id="bank-slug"
              value={slug}
              maxLength={60}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              aria-invalid={Boolean(errors.slug)}
            />
            {errors.slug ? <p className="text-destructive text-xs">{errors.slug.join(" ")}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-description">Description</Label>
            <Textarea id="bank-description" name="description" rows={3} maxLength={1000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-logo">Logo URL</Label>
            <Input
              id="bank-logo"
              name="logo_url"
              type="url"
              placeholder="https://"
              aria-invalid={Boolean(errors.logo_url)}
            />
            {errors.logo_url ? <p className="text-destructive text-xs">{errors.logo_url.join(" ")}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Create institution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
