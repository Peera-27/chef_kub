import Image from "next/image";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 md:py-16 lg:py-20 px-6 text-center pop-in">
      {/* หัวข้อบอกแล้วว่าอะไรว่าง มาสคอตเป็นแค่หน้าตาของแอป */}
      <div className="relative">
        <Image
          src="/mascot.png"
          alt=""
          width={384}
          height={384}
          className="h-24 w-24 md:h-28 md:w-28 select-none"
          priority={false}
        />
      </div>

      <p className="font-semibold text-[var(--color-ink)] text-lg mt-5 mb-1.5" style={{ fontFamily: "var(--font-display)" }}>{title}</p>
      {description && (
        <p className="text-[15px] md:text-base text-[var(--color-muted)] max-w-[300px] md:max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5 md:mt-6">{action}</div>}
    </div>
  );
}
