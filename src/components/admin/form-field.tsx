import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/admin/field-error";
import { cn } from "@/lib/utils";

/** Shared control chrome for inputs, selects and textareas: 36px tall, 6px radius, 14px text. */
export const controlClass =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm md:text-sm";

type Props = {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  className?: string;
  children: React.ReactNode;
};

export function Field({ id, label, hint, errors, className, children }: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] font-normal text-muted-foreground">
        {label}
      </Label>
      {hint && <p className="-mt-1 text-[12px] text-muted-foreground">{hint}</p>}
      {children}
      <FieldError errors={errors} />
    </div>
  );
}
