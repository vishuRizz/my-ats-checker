"use client";

interface NavbarProps {
  onReset?: () => void;
}

export function Navbar({ onReset }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={onReset}>
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-sm">✓</span>
          </div>
          <span className="font-semibold text-white">ATS Checker</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            Public Beta
          </span>

          {onReset && (
            <button
              onClick={onReset}
              className="text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors flex items-center gap-2 px-4 py-1.5 rounded-full"
            >
              ← New Scan
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
