"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <code
          style={{
            flex: 1,
            fontSize: 12,
            padding: "8px 12px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "'Fira Code', 'Consolas', monospace",
          }}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            color: copied ? "#22c55e" : "#fff",
            background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
            border: copied ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.2s",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function BadgePage() {
  const params = useParams<{ region: string; riotId: string }>();
  const region = params.region;
  const riotId = decodeURIComponent(params.riotId);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://statgap.gg";
  const badgeUrl = `${origin}/api/badge/${encodeURIComponent(region)}/${encodeURIComponent(riotId)}`;
  const miniUrl = `${badgeUrl}?size=mini`;
  const profileUrl = `${origin}/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0c0c0f",
        color: "#efeff1",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px 80px" }}>
        <Link
          href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`}
          style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}
        >
          &larr; Back to profile
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "20px 0 8px", letterSpacing: "-0.02em" }}>
          Embeddable Rank Badge
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 32px" }}>
          Show your rank in Discord bios, forum signatures, Reddit flairs, and more.
        </p>

        {/* Standard preview */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Standard (400×80)
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badgeUrl}
            alt={`${riotId} rank badge`}
            width={400}
            height={80}
            style={{ borderRadius: 6, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          />
        </div>

        {/* Mini preview */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Mini (200×40)
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={miniUrl}
            alt={`${riotId} mini rank badge`}
            width={200}
            height={40}
            style={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          />
        </div>

        {/* Embed codes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <CopyButton label="Direct Image URL" value={badgeUrl} />
          <CopyButton
            label="Markdown"
            value={`![My Rank](${badgeUrl})`}
          />
          <CopyButton
            label="HTML"
            value={`<a href="${profileUrl}"><img src="${badgeUrl}" alt="${riotId} rank" width="400" height="80" /></a>`}
          />
          <CopyButton
            label="BBCode (Forums)"
            value={`[url=${profileUrl}][img]${badgeUrl}[/img][/url]`}
          />
          <CopyButton
            label="Mini Badge URL"
            value={miniUrl}
          />
        </div>

        {/* Add to Profile */}
        <div
          style={{
            marginTop: 40,
            padding: "20px 24px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Add to Profile
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: "rgba(255,255,255,0.7)" }}>Discord:</strong> Paste the HTML embed into your Discord bio or About Me section.
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "6px 0 0", lineHeight: 1.5 }}>
            <strong style={{ color: "rgba(255,255,255,0.7)" }}>Reddit / Forums:</strong> Use the BBCode or Markdown embed above.
          </p>
        </div>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          Badge updates every 5 minutes. Sample data shown for demo accounts.
        </p>
      </div>
    </div>
  );
}
