interface LoadingOverlayProps {
  message: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="w-11 h-11 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin mb-5" />
      <p className="text-orange-200 font-medium text-sm px-6 text-center">
        {message}
      </p>
    </div>
  );
}
