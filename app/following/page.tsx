import type { Metadata } from "next";
import FollowingFeed from "@/components/following/FollowingFeed";
import "./following.css";

export const metadata: Metadata = {
  title: "Following — StatGap.gg",
  description: "Track your favorite League of Legends players.",
};

export default function FollowingPage() {
  return <FollowingFeed />;
}
