import { format } from 'date-fns';

export function formatDate(timestamp: number): string {
  console.log('Timestamp:', timestamp);  // Log the timestamp to the console

  // Ensure the timestamp is a valid number
  if (isNaN(timestamp) || timestamp <= 0) {
    return 'Invalid date'; // Fallback in case of an invalid timestamp
  }

  // Always convert to milliseconds
  const correctedTimestamp = timestamp * 1000;

  return format(new Date(correctedTimestamp), 'dd MMM yyyy');
}




export function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.startsWith("www.") ? hostname.substring(4) : hostname;
  } catch {
    return '';
  }
}
