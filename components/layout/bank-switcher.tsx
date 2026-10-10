"use client";

import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { selectBankAction } from "@/app/actions/banks";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BankSwitcher({
  banks,
  currentBankId,
}: {
  banks: { id: string; name: string }[];
  currentBankId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(bankId: string) {
    startTransition(async () => {
      const result = await selectBankAction(bankId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const name = banks.find((b) => b.id === bankId)?.name ?? "institution";
      toast.success(`Switched to ${name}`);
      // Detail pages belong to the previous institution; return to the dashboard.
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Select value={currentBankId} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="w-full min-w-56 sm:w-72" aria-label="Select financial institution">
        <Building2 className="text-muted-foreground" aria-hidden />
        <SelectValue placeholder="Select institution" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Financial institutions</SelectLabel>
          {banks.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
