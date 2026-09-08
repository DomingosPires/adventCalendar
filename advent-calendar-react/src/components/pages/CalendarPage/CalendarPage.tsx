import { useMemo, useState } from 'react';
import { CalendarTemplate } from '../../templates/CalendarTemplate';
import { SiteHeader } from '../../molecules/SiteHeader';
import { CalendarGrid, type CalendarGridItem } from '../../organisms/CalendarGrid';
import { DayDialog } from '../../organisms/DayDialog';
import { CALENDAR, type CalendarDay } from '../../../data/calendar';
import { getDayState } from '../../../lib/dayState';
import { useAdventDay } from '../../../hooks/useAdventDay';
import { useOpenedDays } from '../../../hooks/useOpenedDays';

const TITLE = 'Calendário do Advento';
const SUBTITLE = 'Abre uma porta por dia até ao Natal';

export function CalendarPage() {
  const today = useAdventDay();
  const { openedDays, markOpened } = useOpenedDays();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const items = useMemo<CalendarGridItem[]>(
    () =>
      CALENDAR.map((day) => ({
        day,
        state: getDayState(day.day, today, openedDays),
      })),
    [today, openedDays],
  );

  const handleOpen = (dayNumber: number) => {
    const dayData = CALENDAR.find((entry) => entry.day === dayNumber);
    /* v8 ignore next */
    if (!dayData) return;
    markOpened(dayNumber);
    setSelectedDay(dayData);
  };

  return (
    <CalendarTemplate
      header={<SiteHeader title={TITLE} subtitle={SUBTITLE} />}
      grid={<CalendarGrid items={items} onOpen={handleOpen} />}
      dialog={
        <DayDialog day={selectedDay} onClose={() => setSelectedDay(null)} />
      }
    />
  );
}
