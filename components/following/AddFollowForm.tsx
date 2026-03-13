"use client";

import { useState, type FormEvent } from "react";

const REGIONS = [
  { value: "na1", label: "NA" },
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "kr", label: "KR" },
  { value: "jp1", label: "JP" },
  { value: "br1", label: "BR" },
  { value: "la1", label: "LAN" },
  { value: "la2", label: "LAS" },
  { value: "oc1", label: "OCE" },
  { value: "tr1", label: "TR" },
  { value: "ru", label: "RU" },
];

export default function AddFollowForm({
  onAdd,
}: {
  onAdd: (riotId: string, region: string) => void;
}) {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("na1");
  const [open, setOpen] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = riotId.trim();
    if (!trimmed) return;
    onAdd(trimmed, region);
    setRiotId("");
    setOpen(false);
  }

  return (
    <div className="ff-add-section">
      {!open ? (
        <button className="ff-add-toggle" onClick={() => setOpen(true)}>
          + Follow a Summoner
        </button>
      ) : (
        <form className="ff-add-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="ff-add-input"
            placeholder="Riot ID (e.g. Faker#KR1)"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            autoFocus
          />
          <select
            className="ff-add-select"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button type="submit" className="ff-add-submit">
            Follow
          </button>
          <button
            type="button"
            className="ff-add-cancel"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
