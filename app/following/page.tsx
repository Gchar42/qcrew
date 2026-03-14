import type { Metadata } from "next";
import FollowingFeed from "@/components/following/FollowingFeed";
import "./following.css";

export const metadata: Metadata = {
  title: "Following Feed — Track Your Friends",
  description: "Track your favorite League of Legends players.",
  robots: "noindex, nofollow",
};

export default function FollowingPage() {
  return <FollowingFeed />;
}
