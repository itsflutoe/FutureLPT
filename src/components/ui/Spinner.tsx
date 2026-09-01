export function Spinner({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--accent-color)] ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
