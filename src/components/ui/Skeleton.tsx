/**
 * Generic pulsing placeholder box, used to build route-level loading states
 * (`loading.tsx`) that mirror the shape of the content they stand in for,
 * avoiding layout shifts once real data arrives.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-cairo-text/10 ${className}`} />;
}
