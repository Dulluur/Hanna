import { fetchMyDishes, fetchMyEvents, fetchMyPlace } from "@/api/partner";
import { PartnerMetricsWidget } from "@/components/PartnerMetricsWidget";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeUrl } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Globe, Phone, UtensilsCrossed } from "lucide-react";

export function DashboardPage() {
  const place = useQuery({ queryKey: ["my-place"], queryFn: fetchMyPlace });
  const dishes = useQuery({ queryKey: ["my-dishes"], queryFn: fetchMyDishes });
  const events = useQuery({ queryKey: ["my-events"], queryFn: fetchMyEvents });

  if (place.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (place.isError || !place.data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Не удалось загрузить данные заведения.
      </div>
    );
  }

  const p = place.data;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Моё заведение</h2>

      <Card className="overflow-hidden">
        {p.photo_url && (
          <img
            src={p.photo_url}
            alt={p.name}
            className="aspect-[16/9] w-full object-cover"
          />
        )}
        <CardHeader>
          <CardTitle>{p.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{p.address}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {p.category && <Badge variant="outline">{p.category.name}</Badge>}
            {p.cuisines.map((c) => (
              <Badge key={c.code} variant="secondary">
                {c.name}
              </Badge>
            ))}
            {p.price_band && (
              <Badge variant="outline">
                {p.price_band.min_price}–{p.price_band.max_price} ₽
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {p.phone && (
              <a
                href={`tel:${p.phone}`}
                className="inline-flex items-center gap-1 hover:underline"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {p.phone}
              </a>
            )}
            {p.website && (
              <a
                href={normalizeUrl(p.website) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {p.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <PartnerMetricsWidget />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" aria-hidden />
              Топ-блюда
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {dishes.data?.length ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Можно опубликовать до 5 блюд
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <CalendarRange className="h-4 w-4" aria-hidden />
              События
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {events.data?.length ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Включая прошедшие и неактивные
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
