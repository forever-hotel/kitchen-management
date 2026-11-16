'use client';

import { useEffect, useState } from 'react';

import styles from './kms-header.module.css';

const hotelClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Colombo',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

/**
 * Keep the SSR and first browser render identical. The live time is filled
 * after hydration, avoiding a server/client time-dependent markup mismatch.
 */
export function KmsCurrentTime() {
  const [time, setTime] = useState('--:--');

  useEffect(() => {
    const updateTime = () => setTime(hotelClock.format(new Date()));

    updateTime();
    const interval = setInterval(updateTime, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <time className={styles.clock} aria-label="Current hotel time (Sri Lanka)">
      {time}
    </time>
  );
}
