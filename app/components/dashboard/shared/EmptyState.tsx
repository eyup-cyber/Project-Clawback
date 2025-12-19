import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export default function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      className="p-8 sm:p-12 rounded-xl border text-center"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <span className="text-5xl sm:text-6xl block mb-4">{icon}</span>
      <h3
        className="text-lg sm:text-xl font-bold mb-2"
        style={{
          fontFamily: "var(--font-kindergarten)",
          color: "var(--foreground)",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-sm sm:text-base mb-6 max-w-md mx-auto"
          style={{
            color: "var(--foreground)",
            opacity: 0.6,
            fontFamily: "var(--font-body)",
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "var(--primary)",
            color: "var(--background)",
            fontFamily: "var(--font-body)",
            boxShadow: "0 0 20px var(--glow-primary)",
          }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
