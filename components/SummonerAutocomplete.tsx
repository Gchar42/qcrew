"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getProfileIconUrl } from "@/lib/riotAssets";
import "./summoner-autocomplete.css";

type Suggestion = {
  riotId: string;
  gameName: string;
  tagLine: string;
  puuid: string;
  profileIconId?: number;
  summonerLevel?: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (riotId: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export default function SummonerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Name#Tag",
  className = "",
  inputClassName = "",
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [show, setShow] = useState(false);
  const [hlIndex, setHlIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    abortRef.current?.abort();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(q)}&limit=8`,
        { signal: ctrl.signal }
      );
      if (!res.ok) return;
      const json = await res.json();
      const items: Suggestion[] = (json.suggestions ?? []).map(
        (s: Suggestion & { updatedAt?: string }) => ({
          riotId: s.riotId ?? `${s.gameName}#${s.tagLine}`,
          gameName: s.gameName ?? s.riotId?.split("#")[0] ?? "",
          tagLine: s.tagLine ?? s.riotId?.split("#")[1] ?? "",
          puuid: s.puuid ?? "",
          profileIconId: s.profileIconId,
          summonerLevel: s.summonerLevel,
        })
      );
      setSuggestions(items);
      setHlIndex(-1);
      if (items.length > 0) setShow(true);
    } catch {
      /* aborted or network error */
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pick = (riotId: string) => {
    onChange(riotId);
    onSelect(riotId);
    setShow(false);
    setSuggestions([]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!show || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHlIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHlIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && hlIndex >= 0) {
      e.preventDefault();
      pick(suggestions[hlIndex].riotId);
    } else if (e.key === "Escape") {
      setShow(false);
    }
  };

  return (
    <div ref={wrapRef} className={`summoner-ac ${className}`} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShow(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setShow(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />
      {show && suggestions.length > 0 && (
        <div className="summoner-ac-dropdown">
          {suggestions.map((s, i) => (
            <button
              key={s.puuid || s.riotId}
              type="button"
              className={`summoner-ac-item${i === hlIndex ? " highlighted" : ""}`}
              onMouseEnter={() => setHlIndex(i)}
              onClick={() => pick(s.riotId)}
            >
              {s.profileIconId != null && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="summoner-ac-icon"
                  src={getProfileIconUrl(s.profileIconId)}
                  alt=""
                  width={28}
                  height={28}
                />
              )}
              <span className="summoner-ac-name">
                {s.gameName}
                <span className="summoner-ac-tag">#{s.tagLine}</span>
              </span>
              {s.summonerLevel != null && (
                <span className="summoner-ac-level">Lv. {s.summonerLevel}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
