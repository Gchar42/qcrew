"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "statgap_following";
const MAX_FOLLOWS = 20;

export type FollowEntry = {
  riotId: string;
  region: string;
  addedAt: number;
};

function load(): FollowEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(entries: FollowEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota or disabled */
  }
}

function entryKey(riotId: string, region: string): string {
  return `${riotId.toLowerCase()}:${region.toLowerCase()}`;
}

export function useFollowing() {
  const [follows, setFollows] = useState<FollowEntry[]>([]);

  useEffect(() => {
    setFollows(load());
  }, []);

  const addFollow = useCallback((riotId: string, region: string) => {
    setFollows((prev) => {
      const key = entryKey(riotId, region);
      if (prev.some((f) => entryKey(f.riotId, f.region) === key)) return prev;
      const next = [
        { riotId, region, addedAt: Date.now() },
        ...prev,
      ].slice(0, MAX_FOLLOWS);
      save(next);
      return next;
    });
  }, []);

  const removeFollow = useCallback((riotId: string, region: string) => {
    setFollows((prev) => {
      const key = entryKey(riotId, region);
      const next = prev.filter((f) => entryKey(f.riotId, f.region) !== key);
      save(next);
      return next;
    });
  }, []);

  const isFollowing = useCallback(
    (riotId: string, region: string) => {
      const key = entryKey(riotId, region);
      return follows.some((f) => entryKey(f.riotId, f.region) === key);
    },
    [follows],
  );

  return { follows, addFollow, removeFollow, isFollowing };
}
