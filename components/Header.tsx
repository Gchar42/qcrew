import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { HeaderDropdown } from "./HeaderDropdown";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4" />
      {user && (
        <HeaderDropdown
          email={user.email ?? ""}
          displayName={user.user_metadata?.full_name ?? user.email ?? "User"}
        />
      )}
    </header>
  );
}
