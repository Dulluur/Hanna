import { toggleArrayValue } from "@/lib/url-state";
import { cn } from "@/lib/utils";


interface Option {
  code: string;
  name: string;
}


interface MultiProps {
  options: readonly Option[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
  label: string;
  limit?: number;
}


export function MultiChips({
  options,
  selected,
  onChange,
  label,
  limit,
}: MultiProps) {
  const visible = limit ? options.slice(0, limit) : options;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {visible.map((opt) => {
        const active = selected.includes(opt.code);
        return (
          <button
            key={opt.code}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(toggleArrayValue(selected, opt.code))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground hover:bg-accent",
            )}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}


interface SingleProps {
  options: readonly Option[];
  selected: string | null;
  onChange: (next: string | null) => void;
  label: string;
}


export function SingleChips({
  options,
  selected,
  onChange,
  label,
}: SingleProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((opt) => {
        const active = selected === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : opt.code)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground hover:bg-accent",
            )}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}
