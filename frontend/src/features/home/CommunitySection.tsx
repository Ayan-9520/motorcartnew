import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Play, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMMUNITY_POSTS, SOCIAL_LINKS } from "@/features/home/data/homepage-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { realDataOnly } from "@/config/real-data";
import { SectionHeader } from "./SectionHeader";

export function CommunitySection() {
  const { communityPosts } = useHomePage();
  const posts = communityPosts.length ? communityPosts : realDataOnly ? [] : COMMUNITY_POSTS;
  if (!posts.length) return null;

  return (
    <section className="home-section-alt">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Motorcart Social"
          title="India's auto community — dealers, owners & reviewers"
          description="Facebook-style feed for vehicles: verified dealers, purchase stories, reviews & city groups."
          href="/community"
          linkLabel="Open community"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2.5 lg:col-span-2">
            {posts.map((post, i) => (
              <motion.div
                key={`${post.title}-${i}`}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={"href" in post && post.href ? String(post.href) : "/community"} className="mc-card-interactive flex items-start gap-3 p-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold uppercase text-primary">{post.tag}</span>
                    <p className="mt-1 font-semibold text-foreground">{post.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {post.author} · {post.replies} replies
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="mc-card p-5">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <Youtube className="h-5 w-5" />
                <span className="font-semibold">YouTube</span>
              </div>
              <div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-secondary">
                <Play className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Reviews, auctions and dealer stories</p>
              <Button variant="outline" size="sm" className="mt-4 w-full rounded-xl" asChild>
                <a href="https://youtube.com" target="_blank" rel="noreferrer">
                  Watch channel
                </a>
              </Button>
            </div>
            <div className="mc-card p-5">
              <p className="mb-3 text-sm font-semibold">Follow us</p>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
