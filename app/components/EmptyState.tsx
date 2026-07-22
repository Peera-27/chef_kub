import Image from "next/image";

interface EmptyStateProps {
  /** อิโมจิบอกบริบทว่าอะไรว่าง — โชว์เป็นป้ายเล็กมุมล่างขวาของมาสคอต */
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 md:py-16 lg:py-20 px-6 text-center pop-in">
      {/* มาสคอตเป็นตัวนำ ส่วนอิโมจิเดิมลดบทเป็นป้ายบอกบริบท —
          ถ้าใช้มาสคอตตัวเดียวล้วนทุกหน้าจะแยกไม่ออกว่ากำลังว่างเรื่องอะไร */}
      <div className="relative float-y">
        <Image
          src="/mascot.png"
          alt=""
          width={384}
          height={384}
          className="h-24 w-24 md:h-28 md:w-28 select-none"
          priority={false}
        />
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 grid h-9 w-9 md:h-10 md:w-10 place-items-center rounded-full bg-white text-lg md:text-xl shadow-[var(--shadow-md)] ring-1 ring-black/[0.04] select-none"
        >
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
