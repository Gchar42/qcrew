import Link from "next/link";
import "./profile.css";

export default function SummonerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="profile-page">
        <nav className="profile-nav">
          <Link href="/" className="profile-nav-logo">
            STATGAP
          </Link>
          <Link href="/search" className="profile-nav-search">
            Search summoner
          </Link>
          <Link href="/favorites" className="profile-nav-search">
            Favorites
          </Link>
        </nav>
        <div className="profile-container">{children}</div>
      </div>
    </>
  );
}
