interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 md:py-16 lg:py-20 px-6 text-center pop-in">
      <div className="relative">
        <span className="text-6xl md:text-7xl select-none inline-block float-y">
          {icon}
        </span>
      </div>
      <p className="font-semibold text-[var(--color-ink)] text-base md:text-lg mt-5 mb-1.5 tracking-tight">{title}</p>
      {description && (
        <p className="text-sm md:text-base text-[var(--color-muted)] max-w-[280px] md:max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5 md:mt-6">{action}</div>}
    </div>
  );
}
