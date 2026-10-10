"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSourceAction } from "@/app/actions/sources";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SOURCE_TYPE_LABELS, TRUST_LEVEL_LABELS } from "@/lib/labels";
import { SOURCE_TYPES, TRUST_LEVELS, type SourceType, type TrustedSource, type TrustLevel } from "@/types/domain";

export function SourceFormDialog({ source }: { source?: TrustedSource }) {
  const router = useRouter();
  const editing = Boolean(source);
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>(source?.source_type ?? "OFFICIAL_PRESS_RELEASE");
  const [trust, setTrust] = useState<TrustLevel>(source?.trust_level ?? "HIGH");
  const [active, setActive] = useState(source?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveSourceAction(source?.id ?? null, {
        name: String(fd.get("name") ?? ""),
        url: String(fd.get("url") ?? ""),
        content: String(fd.get("content") ?? ""),
        source_type: sourceType,
        trust_level: trust,
        active,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        return;
      }
      setErrors({});
      setFormError(null);
      setOpen(false);
      toast.success(editing ? "Source updated." : "Trusted source added.");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setErrors({});
          setFormError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="sm">
            <Pencil aria-hidden /> Edit
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden /> Add trusted source
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit trusted source" : "Add trusted source"}</DialogTitle>
          <DialogDescription>
            Paste the authoritative text. The AI may only cite this stored text as evidence — URLs are not fetched.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>{formError}</AlertTitle>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="src-name">Name *</Label>
            <Input
              id="src-name"
              name="name"
              defaultValue={source?.name}
              maxLength={200}
              aria-invalid={Boolean(errors.name)}
            />
            <FieldError messages={errors.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="src-type">Source type *</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <SelectTrigger id="src-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SOURCE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="src-trust">Trust level *</Label>
              <Select value={trust} onValueChange={(v) => setTrust(v as TrustLevel)}>
                <SelectTrigger id="src-trust">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_LEVELS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRUST_LEVEL_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="src-url">Reference URL</Label>
            <Input
              id="src-url"
              name="url"
              type="url"
              placeholder="https://"
              defaultValue={source?.url ?? ""}
              aria-invalid={Boolean(errors.url)}
            />
            <FieldError messages={errors.url} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="src-content">Source content *</Label>
            <Textarea
              id="src-content"
              name="content"
              rows={8}
              maxLength={20_000}
              defaultValue={source?.content}
              placeholder="Paste the official statement, press release or regulatory text…"
              aria-invalid={Boolean(errors.content)}
            />
            <FieldError messages={errors.content} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="src-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="src-active">Active — used as evidence in new analyses</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {editing ? "Save changes" : "Add source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-destructive text-xs">{messages.join(" ")}</p>;
}
