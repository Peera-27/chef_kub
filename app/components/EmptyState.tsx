interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 lg:py-20 px-6 text-center fade-in">
      <span className="text-5xl md:text-6xl mb-4 md:mb-5 opacity-60">{icon}</span>
      <p className="font-semibold text-gray-700 text-base md:text-lg mb-1">{title}</p>
      {description && (
        <p className="text-sm md:text-base text-gray-400 max-w-[280px] md:max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5 md:mt-6">{action}</div>}
    </div>
  );
}
