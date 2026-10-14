interface SpinnerProps {
  /** Overrides the default size/border-width (e.g. `"h-5 w-5 border-2"` for an inline button spinner). Defaults to `h-12 w-12 border-4`. */
  className?: string;
}

/**
 * Brand-colored loading spinner. Pure presentational markup (no hooks, no
 * client-only APIs), so it can be rendered from Server Components (e.g.
 * `loading.tsx` files) as well as Client Components (e.g. a submit
 * button's pending state).
 */
export function Spinner({ className = "h-12 w-12 border-4" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block animate-spin rounded-full border-solid border-cairo-text/15 border-t-cairo-primary ${className}`}
    />
  );
}
