"use client";

import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative">
      <div className="mb-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-sm">✓</span>
          </div>
          <span className="font-semibold text-white text-lg">ATS Checker</span>
        </Link>
      </div>

      <Suspense fallback={<div className="w-full max-w-md h-96 bg-zinc-900/50 rounded-2xl animate-pulse" />}>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "bg-zinc-900 border border-zinc-800 shadow-2xl",
            },
          }}
        />
      </Suspense>
    </div>
  );
}
