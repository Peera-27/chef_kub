interface LoadingOverlayProps {
  message: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6">
      <div className="w-12 h-12 md:w-14 md:h-14 border-[3px] border-white/30 border-t-white rounded-full animate-spin mb-4" />
      <p className="text-white/90 font-medium text-sm md:text-base px-6 text-center max-w-sm">
        {message}
      </p>
    </div>
  );
}
