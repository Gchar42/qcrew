import Link from "next/link";

interface CrewCardProps {
  id: string;
  name: string;
  slug: string;
  inviteCode: string;
}

export function CrewCard({ id, name, slug, inviteCode }: CrewCardProps) {
  return (
    <div className="glass rounded-xl p-5 hover-lift">
      <Link href={`/crew/${id}`} className="block group">
        <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
          {name}
        </h3>
        <p className="text-sm text-zinc-500 mt-0.5">/{slug}</p>
      </Link>
      <p className="text-xs text-zinc-500 mt-3">
        Invite: <code className="text-zinc-400">{inviteCode}</code>
      </p>
      <Link
        href={`/crew/${id}`}
        className="mt-3 inline-block text-sm text-indigo-400 hover:text-indigo-300"
      >
        Open crew →
      </Link>
    </div>
  );
}
