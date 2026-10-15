import { useEffect, useState } from 'react';
import { currentCalendar } from '../../api/admin';
import type { CalendarSnapshot } from '../../types/admin';
import { calendarLabel } from './calendar-label';

export function CalendarStatus() {
  const [calendar, setCalendar] = useState<CalendarSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    currentCalendar()
      .then((loaded) => {
        if (active) {
          setCalendar(loaded);
        }
      })
      .catch(() => {
        if (active) {
          setCalendar(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!calendar) {
    return null;
  }

  return <p className="calendar-chip">{calendarLabel(calendar)}</p>;
}
