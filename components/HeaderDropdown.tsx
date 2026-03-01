"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface HeaderDropdownProps {
  email: string;
  displayName: string;
}

export function HeaderDropdown({ email, displayName }: HeaderDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 font-medium">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline max-w-[120px] truncate">
          {displayName}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 glass rounded-xl py-1 border border-white/10 shadow-xl">
          <div className="px-3 py-2 text-xs text-zinc-500 truncate border-b border-white/10">
            {email}
          </div>
          <Link
            href="/dashboard"
            className="block px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="block w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-red-400"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
