import Link from "next/link";
import "./profile.css";

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap";

export default function SummonerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="stylesheet" href={FONTS_URL} />
      <div className="profile-page">
        <nav className="profile-nav">
          <Link href="/" className="profile-nav-logo">
            QCREW
          </Link>
          <Link href="/search" className="profile-nav-search">
            Search summoner
          </Link>
        </nav>
        <div className="profile-container">{children}</div>
      </div>
    </>
  );
}
