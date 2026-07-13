'use client';

interface LoaderProps {
  fullScreen?: boolean;
  message?: string;
}

export function Loader({ fullScreen = false, message = 'Loading...' }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-[#0066CC] animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-2 h-2 rounded-full bg-[#0066CC] animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 rounded-full bg-[#0066CC] animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      {message && <p className="text-sm text-[#7A8699]">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F4F5F7]">
        {content}
      </div>
    );
  }

  return content;
}
