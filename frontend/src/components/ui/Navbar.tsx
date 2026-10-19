"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowLeft, Menu, X, Sparkles } from "lucide-react";

interface NavbarProps {
  onReset?: () => void;
}

export function Navbar({ onReset }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 p-3 sm:p-4">
        <div className="max-w-[1440px] mx-auto bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full px-4 sm:px-6 py-2.5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between h-10 sm:h-11">
            {/* Left: Logo + Desktop Links */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  ✓
                </div>
                <span className="text-gray-900 font-bold text-[15px] tracking-tight">
                  ATS<span className="text-[#F26522]">Checker</span>
                </span>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1.5">
                <Link
                  href="/ats"
                  className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                    pathname === "/ats"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-slate-100"
                  }`}
                >
                  Resume ATS
                </Link>

                <Link
                  href="/linkedin"
                  className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                    pathname === "/linkedin"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-slate-100"
                  }`}
                >
                  <Sparkles size={13} className="text-[#F26522]" />
                  <span>LinkedIn Scanner</span>
                </Link>

                <Link
                  href="/profile"
                  className={`text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-all ${
                    pathname === "/profile"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-slate-100"
                  }`}
                >
                  Job Tracker
                </Link>
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {onReset && (
                <button
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-gray-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>New Scan</span>
                </button>
              )}

              <Show when="signed-in">
                <Link
                  href="/profile"
                  className="hidden sm:inline-flex text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#FAFAFA] border border-slate-200 text-gray-700 hover:text-black hover:border-slate-300 transition-colors"
                >
                  My Saved Scans
                </Link>
                <div className="flex items-center ml-1">
                  <UserButton />
                </div>
              </Show>

              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-full transition-all shadow-sm cursor-pointer">
                    Sign In
                  </button>
                </SignInButton>
              </Show>

              {/* Mobile menu trigger */}
              <button
                className="md:hidden bg-slate-100 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-slate-200"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Toggle navigation menu"
              >
                <Menu size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 shadow-2xl transition-transform duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <span className="font-bold text-gray-900 text-base">Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-gray-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-3 mb-6">
              <Link
                href="/ats"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-semibold text-gray-900 py-2 border-b border-slate-50 flex items-center justify-between"
              >
                <span>Resume ATS Scanner</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-medium">Active</span>
              </Link>
              <Link
                href="/linkedin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-semibold text-gray-900 py-2 border-b border-slate-50"
              >
                LinkedIn Profile Scanner
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-semibold text-gray-900 py-2 border-b border-slate-50"
              >
                Job Tracker &amp; Saved Scans
              </Link>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-semibold text-gray-900 py-2"
              >
                Home / Overview
              </Link>
            </nav>

            {onReset && (
              <button
                onClick={() => {
                  onReset();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 bg-[#F26522] text-white font-semibold rounded-full flex items-center justify-center gap-2 mb-3 shadow-md"
              >
                <ArrowLeft size={16} />
                <span>Start New Resume Scan</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
