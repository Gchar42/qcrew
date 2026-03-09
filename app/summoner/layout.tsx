import "./profile.css";

export default function SummonerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="profile-page">
      <div className="profile-container">{children}</div>
    </div>
  );
}
