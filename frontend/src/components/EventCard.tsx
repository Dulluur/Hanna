import type { EventListItem } from '@/api/types';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Ticket, MapPin } from 'lucide-react';
import { formatEventStart, formatRub } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { ImagePlaceholder } from '@/components/imagePlaceholder'
import { FavoriteButton } from '@/components/FavoriteButton'




interface Props{
  event: EventListItem
  upsell?: {
    deltaPct: number
    deltaRub: number
  }
}

export function EventCard({event, upsell}: Props){
  const isFree = event.price === 0 || event.price == null

  return(
    <Link
      to={`/events/${event.id}`}
      className='block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg'
      >
        <Card
          className={
            upsell
            ? 'overflow-hidden border-2 border-primary/30 bg-primary/[0.03]'
            : 'overflow-hidden hover:border-primary/40 transition-colors'
          }
        >
          {event.photo_url ? (
            <img
              src={event.photo_url}
              alt={event.title}
              className='aspect-[16/9] w-full object-cover'
              loading='lazy'
              />
          ) : (
            <ImagePlaceholder
              seed={event.title}
              alt={event.title}
              className="aspect-[16/9] w-full"
            />
          )}

          <CardContent className='p-4 pt-3'>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-base font-semibold leading-tight">
                  {event.title}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className='inline-flex items-center gap-1'>
                    <CalendarDays className='h-3.5 w-3.5' aria-hidden/>
                    {formatEventStart(event.starts_at)}
                  </span>
                  {event.place && (
                    <span className='inline-flex items-center gap-1 truncate'>
                      <MapPin className='h-3.5 w-3.5' aria-hidden/>
                      <span className='truncate'>{event.place.name}</span>
                    </span>
                  )}
                </div>
              </div>
              <FavoriteButton kind="event" id={event.id}/>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {event.event_type && <Badge variant="outline">{event.event_type.name}</Badge>}
              {event.age_group && <Badge variant="outline">{event.age_group.name}</Badge>}
              <Badge
                variant={isFree ? 'success' : 'default'}
                className="ml-auto inline-flex items-center gap-1"
                >
                  <Ticket className='h-3 w-3' aria-hidden/>
                  {isFree ? 'Бесплатно' : formatRub(event.price!)}
                </Badge>
            </div>

          {upsell && (
            <div className="mt-3 rounded-md bg-primary/10 p-2.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Чуть выше бюджета</span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                  +{upsell.deltaPct}% · {upsell.deltaRub} ₽
                </span>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      </Link>
  )
}
