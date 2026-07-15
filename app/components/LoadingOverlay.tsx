interface LoadingOverlayProps {
  message: string;
}

// ไอลอยขึ้นจากหม้อ — เหลื่อมเวลากันเล็กน้อยจะได้ไม่ลอยพร้อมกันเป็นแถว
const STEAM = [
  { left: "38%", delay: "0s" },
  { left: "50%", delay: "0.5s" },
  { left: "62%", delay: "1s" },
];

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 backdrop-in">
      <div className="relative w-28 h-28 mb-4">
        {STEAM.map((s, i) => (
          <span
            key={i}
            className="absolute top-1 w-2 h-2 rounded-full bg-white/60 blur-[1px] steam"
            style={{ left: s.left, animationDelay: s.delay }}
            aria-hidden
          />
        ))}

        <span className="absolute inset-x-0 bottom-3 grid place-items-center">
          <span className="text-5xl md:text-6xl bob select-none" aria-hidden>
            🍲
          </span>
        </span>

        <span className="absolute inset-x-4 bottom-2 h-3 rounded-full bg-[var(--color-brand)]/25 blur-md" />
      </div>

      <p className="text-white/90 font-semibold text-sm md:text-base px-6 text-center max-w-sm leading-relaxed">
        {message}
      </p>

      <div className="flex gap-1.5 mt-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] hop"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
