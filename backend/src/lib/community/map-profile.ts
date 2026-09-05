import type {
  CommunityBusinessProfile,
  CommunityUserProfile,
} from "@prisma/client";
import { mapPublicBusinessProfile, mapPublicUserProfile } from "./serialize";

export function mapUserProfile(
  p: CommunityUserProfile,
  extras?: { is_following?: boolean; is_self?: boolean },
) {
  return mapPublicUserProfile(p, extras);
}

export function mapBusinessProfile(b: CommunityBusinessProfile) {
  return mapPublicBusinessProfile(b);
}
