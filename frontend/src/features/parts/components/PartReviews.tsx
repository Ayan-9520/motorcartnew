import { BadgeCheck, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PartReview } from "../types";

interface PartReviewsProps {
  reviews: PartReview[];
}

export function PartReviews({ reviews }: PartReviewsProps) {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          Ratings &amp; reviews
          {reviews.length > 0 && (
            <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
              <Star className="h-4 w-4 fill-current" /> {avg.toFixed(1)} · {reviews.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet — be the first to review this part.</p>}
        {reviews.map((r) => (
          <article key={r.id} className="border-b pb-4 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                  />
                ))}
              </span>
              {r.verifiedPurchase && (
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified purchase
                </span>
              )}
              <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
            {r.content && <p className="mt-1 text-sm text-muted-foreground">{r.content}</p>}
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
