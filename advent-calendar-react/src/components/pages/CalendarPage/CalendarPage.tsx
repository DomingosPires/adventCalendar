import { useMemo, useState } from 'react';
import { CalendarTemplate } from '../../templates/CalendarTemplate';
import { SiteHeader } from '../../molecules/SiteHeader';
import { CalendarGrid, type CalendarGridItem } from '../../organisms/CalendarGrid';
import { DoorFocus } from '../../organisms/DoorFocus';
import { CALENDAR } from '../../../data/calendar';
import { getDayState } from '../../../lib/dayState';
import { useAdventDay } from '../../../hooks/useAdventDay';
import { useOpenedDays } from '../../../hooks/useOpenedDays';

const TITLE = 'Calendário do Advento';
const SUBTITLE = 'Abre uma porta por dia até ao Natal';

export function CalendarPage() {
  const today = useAdventDay();
  const { openedDays, markOpened } = useOpenedDays();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);

  const items = useMemo<CalendarGridItem[]>(
    () =>
      CALENDAR.map((day) => ({
        day,
        state: getDayState(day.day, today, openedDays),
      })),
    [today, openedDays],
  );

  const handleOpen = (dayNumber: number, rect: DOMRect) => {
    markOpened(dayNumber);
    setOrigin(rect);
    setOpenDay(dayNumber);
  };

  const openDayData = CALENDAR.find((entry) => entry.day === openDay) ?? null;

  return (
    <>
      <CalendarTemplate
        header={<SiteHeader title={TITLE} subtitle={SUBTITLE} />}
        grid={<CalendarGrid items={items} onOpen={handleOpen} />}
      />
      <DoorFocus
        day={openDayData}
        originRect={origin}
        onClose={() => setOpenDay(null)}
      />
    </>
  );
}
