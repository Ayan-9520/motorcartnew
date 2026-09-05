import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Car,
  Linkedin,
  Film,
  MoreHorizontal,
  Trash2,
  Bookmark,
} from "lucide-react";
import { SocialAvatar } from "./SocialAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "../lib/time";
import type { CommunityPost } from "../types";
import { youtubeEmbedSrc, buildShareUrl } from "../lib/embed-utils";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { useAppConfirmModal } from "@/shared/ui/modal/useAppConfirmModal";
import { cn } from "@/lib/utils";

function HashtagBody({ text }: { text: string }) {
  const parts = text.split(/(#\w+)/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link key={i} to={`/community?tag=${encodeURIComponent(tag)}`} className="font-medium text-primary hover:underline">
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

interface PostCardProps {
  post: CommunityPost;
  onLike?: () => void;
  onFlag?: () => void;
  onDelete?: () => void | Promise<void>;
  onShare?: () => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  compact?: boolean;
  premium?: boolean;
}

export function PostCard({ post, onLike, onFlag, onDelete, onShare, onSave, compact, premium }: PostCardProps) {
  const { user, isAuthenticated } = useAuth();

  const requireAuth = (action: string) => {
    if (isAuthenticated && user) return true;
    toast.error(`Sign in to ${action}`);
    return false;
  };
  const { requestConfirm } = useAppConfirmModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthor = Boolean(user?.id && post.authorId === user.id);
  const yt = post.embedProvider === "youtube" && post.embedUrl ? youtubeEmbedSrc(post.embedUrl) : null;

  const shareNative = async () => {
    const url = buildShareUrl(post.id);
    try {
      if (navigator.share) await navigator.share({ title: "Motorcart community", text: post.body.slice(0, 80), url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    const ok = await requestConfirm({
      title: "Delete post?",
      description: "This cannot be undone. Comments and likes on this post will be removed.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok || !onDelete) return;
    await onDelete();
  };

  return (
    <Card className={premium ? "community-premium-post community-premium-post-live overflow-hidden" : "overflow-hidden"}>
      <CardContent className={premium ? "p-5" : "p-4"}>
        <div className="flex items-start gap-3">
          <SocialAvatar
            userId={post.authorId}
            name={post.authorName}
            src={post.authorAvatar}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Link to={`/community/u/${post.authorId}`} className="font-semibold text-foreground hover:text-primary">
                  {post.authorName ?? "Member"}
                </Link>
                <span>·</span>
                <span>{formatRelativeTime(post.createdAt)}</span>
                {post.groupSlug && (
                  <>
                    <span>·</span>
                    <Link to={`/community/groups/${post.groupSlug}`} className="text-primary hover:underline">
                      #{post.groupSlug}
                    </Link>
                  </>
                )}
                {post.postKind === "review" && <Badge variant="secondary">Review</Badge>}
                {post.postKind === "poll" && <Badge variant="secondary">Poll</Badge>}
                {post.postKind === "embed" && <Badge variant="outline">{post.embedProvider}</Badge>}
                {post.needsReview && <Badge variant="destructive">Review queue</Badge>}
              </div>
              {(isAuthor && onDelete) || onFlag ? (
                <div className="relative shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Post options"
                    onClick={() => setMenuOpen((o) => !o)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {menuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-40"
                        aria-label="Close menu"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-9 z-50 min-w-[10rem] rounded-xl border border-border bg-card py-1 shadow-lg">
                        {isAuthor && onDelete && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                            onClick={() => void handleDelete()}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete post
                          </button>
                        )}
                        {onFlag && !isAuthor && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60"
                            onClick={() => {
                              setMenuOpen(false);
                              onFlag();
                            }}
                          >
                            <Flag className="h-4 w-4" />
                            Report
                          </button>
                        )}
                        {onFlag && isAuthor && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60"
                            onClick={() => {
                              setMenuOpen(false);
                              onFlag();
                            }}
                          >
                            <Flag className="h-4 w-4" />
                            Report
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {post.body ? <HashtagBody text={post.body} /> : null}
        {post.mediaUrls?.[0] && (
          <img
            src={post.mediaUrls[0]}
            alt=""
            className={cn(
              "mt-4 w-full rounded-xl object-cover",
              compact ? "max-h-48" : premium ? "max-h-80" : "max-h-72"
            )}
          />
        )}
        {yt && (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border bg-black">
            <iframe title="YouTube" className="h-full w-full" src={yt} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" />
          </div>
        )}
        {post.embedProvider === "linkedin" && post.embedUrl && (
          <a
            href={post.embedUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm hover:bg-muted/60"
          >
            <Linkedin className="h-5 w-5 text-primary" />
            Open LinkedIn article
          </a>
        )}
        {post.embedProvider === "reel" && post.embedUrl && (
          <a
            href={post.embedUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm hover:bg-muted/60"
          >
            <Film className="h-5 w-5 text-pink-600" />
            Watch reel
          </a>
        )}
        {post.vehicleId && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Car className="h-3.5 w-3.5" />
            Vehicle discussion thread
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
          <Button
            variant={post.likedByMe ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => {
              if (!requireAuth("like posts")) return;
              onLike?.();
            }}
          >
            <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-current" : ""}`} />
            {post.likeCount}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link to={`/community/post/${post.id}`}>
              <MessageCircle className="h-4 w-4" />
              {post.commentCount}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              if (!requireAuth("share posts")) return;
              void (onShare ? onShare() : shareNative());
            }}
          >
            <Share2 className="h-4 w-4" />
            {post.shareCount}
          </Button>
          {onSave && (
            <Button
              variant={post.savedByMe ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => {
                if (!requireAuth("save posts")) return;
                void onSave();
              }}
            >
              <Bookmark className={`h-4 w-4 ${post.savedByMe ? "fill-current" : ""}`} />
            </Button>
          )}
          {onFlag && !isAuthor && (
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground lg:hidden" onClick={onFlag}>
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
