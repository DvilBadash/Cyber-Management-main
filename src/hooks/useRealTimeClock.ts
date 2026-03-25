import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export function useRealTimeClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const dateStr = format(now, 'dd/MM/yyyy');
  const timeStr = format(now, 'HH:mm:ss');

  return { now, dateStr, timeStr, display: `${dateStr} | ${timeStr}` };
}
