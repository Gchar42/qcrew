"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SummonerProfileBeige from "@/components/SummonerProfileBeige";

export default function SummonerPage() {
  return (
    <Suspense
      fallback={
        <div className="profile-loading">
          <div className="profile-loading-spinner" />
          <p className="mt-4">
            <span className="profile-loading-text">Loading...</span>
          </p>
        </div>
      }
    >
      <SummonerPageContent />
    </Suspense>
  );
}

function SummonerPageContent() {
  const searchParams = useSearchParams();
  const riotId = searchParams.get("riotId");
  const region = searchParams.get("region") ?? "na1";
  return <SummonerProfileBeige riotId={riotId} region={region} />;
}
