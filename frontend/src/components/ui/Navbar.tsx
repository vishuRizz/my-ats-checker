"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

interface NavbarProps {
  onReset?: () => void;
}

export function Navbar({ onReset }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-sm">✓</span>
          </div>
          <span className="font-semibold text-white">ATS Checker</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/linkedin"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-950/40 border border-blue-800/50 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>LinkedIn Scanner</span>
          </Link>

          <Link
            href="/ats"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors hidden sm:inline-block"
          >
            Resume ATS
          </Link>

          {onReset && (
            <button
              onClick={onReset}
              className="text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-full"
            >
              ← New Scan
            </button>
          )}

          <Show when="signed-in">
            <Link
              href="/profile"
              className="text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
            >
              <span>👤</span>
              <span>Profile & History</span>
            </Link>
            <div className="flex items-center ml-1">
              <UserButton />
            </div>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 px-4 py-1.5 rounded-full transition-all shadow-sm">
                Sign In
              </button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </nav>
  );
}
