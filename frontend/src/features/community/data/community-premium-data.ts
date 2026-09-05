import type { LucideIcon } from "lucide-react";
import { Flame, MapPin, Sparkles, Trophy, Users, Zap } from "lucide-react";

/** Batch 6: no fabricated community stats. Empty until real DB counts exist. */
export const COMMUNITY_LIVE_STATS = [
  { label: "Active members", value: "0", icon: Users },
  { label: "Posts today", value: "0", icon: Zap },
  { label: "Verified dealers", value: "0", icon: Trophy },
  { label: "Cities live", value: "0", icon: MapPin },
] as const;

export type CommunitySpotlight = {
  id: string;
  name: string;
  handle: string;
  role: string;
  avatarUrl?: string;
  followers: string;
  badge?: string;
};

export const COMMUNITY_SPOTLIGHT: CommunitySpotlight[] = [];

export const COMMUNITY_TRENDING_TOPICS: { tag: string; posts: number; heat: "hot" | "rising" | "new" }[] = [];

export const COMMUNITY_FEATURED_GROUPS: { slug: string; name: string; members: string; live: boolean }[] = [];

export const COMMUNITY_LIVE_EVENTS: {
  id: string;
  title: string;
  time: string;
  host: string;
  icon: LucideIcon;
}[] = [];

export const COMMUNITY_LEADERBOARD: { rank: number; name: string; score: string; delta: string }[] = [];

void Flame;
void Sparkles;
