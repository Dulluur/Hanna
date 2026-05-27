import type { PlaceTopDishRead } from "@/api/types";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { formatRub } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";


interface Props {
  dishes: PlaceTopDishRead[];
}


const PRICE_BUCKETS: {
  code: string;
  label: string;
  min: number;
  max: number | null;
}[] = [
  { code: "all", label: "Все цены", min: 0, max: null },
  { code: "cheap", label: "До 500 ₽", min: 0, max: null },
  { code: "mid", label: "500-1000 ₽", min: 500, max: 1000 },
  { code: "pricey", label: "1000-2000 ₽", min: 1000, max: 2000 },
  { code: "premium", label: "> 2000 ₽", min: 2000, max: null },
];


type SortMode = "default" | "price-asc" | "price-desc";


export function PlaceMenu({ dishes }: Props) {
  const [bucket, setBucket] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("default");
  const [active, setActive] = useState<PlaceTopDishRead | null>(null);

  const filtered = useMemo(() => {
    const range =
      PRICE_BUCKETS.find((b) => b.code === bucket) ?? PRICE_BUCKETS[0]!;
    const list = dishes.filter((d) => {
      if (d.price < range.min) return false;
      if (range.max != null && d.price >= range.max) return false;
      return true;
    });
    if (sort === "price-asc")
      return list.slice().sort((a, b) => a.price - b.price);
    if (sort === "price-desc")
      return list.slice().sort((a, b) => b.price - a.price);
    return list
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [dishes, bucket, sort]);

  if (dishes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Меню пока не опубликовано. Заходите позже - партнер скоро добавит блюда.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Фильтр по цене"
        className="flex flex-wrap gap-1.5"
      >
        {PRICE_BUCKETS.map((b) => {
          const active = bucket === b.code;
          return (
            <button
              key={b.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setBucket(b.code)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground hover:bg-accent",
              )}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtered.length} из {dishes.length}
        </span>
        <label className="flex items-center gap-2">
          <span>Сортировка</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="default">по умолчанию</option>
            <option value="price-asc">сначала дешевле</option>
            <option value="price-desc">сначала дороже</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          В выбранном диапазоне блюд нет - выберите другой фильтр.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((dish) => (
            <li key={dish.id}>
              <DishCard dish={dish} onClick={() => setActive(dish)} />
            </li>
          ))}
        </ul>
      )}

      <DishDetailsSheet
        dish={active}
        open={active != null}
        onClose={() => setActive(null)}
      />
    </div>
  );
}


function DishCard({
  dish,
  onClick,
}: {
  dish: PlaceTopDishRead;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="overflow-hidden hover:border-primary/40 transition-colors h-full flex flex-col">
        {dish.photo_url ? (
          <img
            src={dish.photo_url}
            alt={dish.name}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder
            seed={dish.name}
            alt={dish.name}
            className="aspect-square w-full"
          />
        )}

        <CardContent className="p-3 flex flex-col gap-1.5 flex-1">
          <div className="text-base font-semibold leading-none">
            {formatRub(dish.price)}
          </div>

          <div className="text-sm font-medium line-clamp-2 leading-tight">
            {dish.name}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
            {dish.weight && (
              <span className="text-xs text-muted-foreground">
                {dish.weight}
              </span>
            )}
            {dish.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5">
                {t}
              </Badge>
            ))}
            {dish.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{dish.tags.length - 2}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}


function DishDetailsSheet({
  dish,
  open,
  onClose,
}: {
  dish: PlaceTopDishRead | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={dish?.name ?? ""}>
      {dish && (
        <div className="space-y-3">
          {dish.photo_url ? (
            <img
              src={dish.photo_url}
              alt={dish.name}
              className="aspect-[4/3] w-full rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <ImagePlaceholder
              seed={dish.name}
              alt={dish.name}
              className="aspect-[4/3] w-full rounded-lg"
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-semibold">
              {formatRub(dish.price)}
            </div>
            {dish.weight && (
              <span className="text-sm text-muted-foreground">
                {dish.weight}
              </span>
            )}
          </div>

          {dish.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dish.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          {dish.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {dish.description}
            </p>
          )}

          {!dish.description && !dish.weight && dish.tags.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Партнёр пока не добавил подробностей о блюде
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
