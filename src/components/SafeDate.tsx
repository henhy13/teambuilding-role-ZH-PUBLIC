'use client';

import { useState, useEffect } from 'react';

interface SafeDateProps {
  date: string | Date;
  format?: 'locale' | 'localeDate' | 'localeTime';
  fallback?: string;
}

export default function SafeDate({ date, format = 'locale', fallback = 'Loading...' }: SafeDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span>{fallback}</span>;
  }

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return <span>Invalid Date</span>;
  }

  switch (format) {
    case 'localeDate':
      return <span>{dateObj.toLocaleDateString()}</span>;
    case 'localeTime':
      return <span>{dateObj.toLocaleTimeString()}</span>;
    case 'locale':
    default:
      return <span>{dateObj.toLocaleString()}</span>;
  }
} 