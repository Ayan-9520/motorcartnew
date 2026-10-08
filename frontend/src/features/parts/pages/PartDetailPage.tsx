import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, FileText, Minus, Plus, ShieldCheck, ShoppingCart, Star, Truck, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { useAuth } from "@/hooks/useAuth";
import { usePartDetail } from "../hooks/usePartDetail";
import { PartReviews } from "../components/PartReviews";
import { PartsWhatsAppButton } from "../components/PartsWhatsAppButton";
import { PartsAiRecommendations } from "../components/PartsAiRecommendations";
import { PartOriginBadge } from "../components/PartOriginBadge";
import { usePartsCartStore } from "@/store/partsCartStore";
import { hasBulkTier, unitPriceForQty } from "../lib/part-utils";
import { recommendParts } from "../lib/ai-parts";
import { usePartsList } from "../hooks/usePartsList";
import toast from "react-hot-toast";
import { postPartReview } from "../services/parts.service";
import { PART_CATEGORIES } from "../types";

export function PartDetailPage() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const navigate = useNavigate();
  const { part, reviews, loading, refetch } = usePartDetail(category, slug);
  const { parts: categoryParts } = usePartsList(part?.categorySlug, "", null);
  const { isAuthenticated } = useAuth();
  const addProduct = usePartsCartStore((s) => s.addProduct);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => {
    if (part) {
      setPageMeta({
        title: `${part.name} — Motorcart Parts`,
        description: part.description ?? `${part.brand ?? ""} ${part.name} with GST invoice and Cash on Delivery.`.trim(),
      });
      setQty(1);
      setActiveImage(0);
    }
  }, [part]);

  const related = part
    ? recommendParts(
        categoryParts.filter((item) => item.id !== part.id),
        { category: part.categorySlug, vehicle: part.compatibility[0] },
        4
      )
    : [];

  const addToCart = (goToCart = false) => {
    if (!part) return;
    if (part.stock <= 0) {
      toast.error("This part is out of stock");
      return;
    }
    if (qty > part.stock) {
      toast.error(`Only ${part.stock} in stock`);
      return;
    }
    addProduct(part, qty);
    if (goToCart) navigate("/cart");
    else toast.success("Added to cart");
  };

  const submitReview = async () => {
    if (!part) return;
    if (reviewBody.trim().length < 10) {
      toast.error("Write at least 10 characters");
      return;
    }
    setReviewBusy(true);
    const { error } = await postPartReview(part.slug, reviewRating, reviewTitle.trim(), reviewBody.trim());
    setReviewBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Thanks — your review is live");
      setReviewTitle("");
      setReviewBody("");
      setReviewRating(5);
      void refetch();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold">Part not found</p>
        <p className="mt-1 text-sm text-muted-foreground">It may have been removed or the link is incorrect.</p>
        <Button className="mt-4" asChild><Link to="/parts">Back to parts</Link></Button>
      </div>
    );
  }

  const bulk = hasBulkTier(part);
  const unitPrice = unitPriceForQty(part, qty);
  const mrp = part.mrp ?? part.originalPrice;
  const offPct = mrp != null && mrp > part.price ? Math.round(((mrp - part.price) / mrp) * 100) : null;
  const bulkSavePct = bulk ? Math.round(((part.price - part.wholesalePrice!) / part.price) * 100) : 0;
  const outOfStock = part.stock <= 0;
  const maxQty = Math.max(1, Math.min(part.stock, 500));
  const categoryLabel = PART_CATEGORIES.find((c) => c.slug === part.categorySlug)?.label ?? part.categorySlug;
  const waLine = [{
    partId: part.id, slug: part.slug, name: part.name, categorySlug: part.categorySlug, image: part.images[0] ?? "",
    price: part.price, wholesalePrice: part.wholesalePrice, gstRate: part.gstRate, bulkMinQty: part.bulkMinQty, sellerId: part.sellerId, qty,
  }];

  return (
    <div className="container mx-auto max-w-6xl space-y-12 px-4 py-8">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/parts" className="hover:text-primary">Parts</Link>
        <span>/</span>
        <Link to={`/parts/${part.categorySlug}`} className="hover:text-primary">{categoryLabel}</Link>
        <span>/</span>
        <span className="line-clamp-1 text-foreground">{part.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-3xl border bg-muted shadow-card">
            <img src={part.images[activeImage] ?? part.images[0]} alt={part.name} className="h-full w-full object-cover" />
            <PartOriginBadge origin={part.partOrigin} className="absolute left-4 top-4" />
            {offPct != null && offPct > 0 && (
              <Badge className="absolute right-4 top-4 border-0 bg-amber-500 text-white">-{offPct}% off MRP</Badge>
            )}
          </div>
          {part.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {part.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={cn("shrink-0 overflow-hidden rounded-xl border-2", i === activeImage ? "border-primary" : "border-transparent")}
                  aria-label={`Image ${i + 1}`}
                >
                  <img src={src} alt="" className="h-16 w-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            {part.brand && <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{part.brand}</p>}
            <h1 className="mt-1 text-2xl font-bold leading-tight md:text-3xl">{part.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {part.reviewCount > 0 ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <Star className="h-4 w-4 fill-current" /> {part.rating.toFixed(1)}
                  <span className="text-muted-foreground">({part.reviewCount} review{part.reviewCount === 1 ? "" : "s"})</span>
                </span>
              ) : (
                <span>No reviews yet</span>
              )}
              {part.sku && <span>SKU {part.sku}</span>}
              {part.hsnCode && <span>HSN {part.hsnCode}</span>}
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-bold text-primary">{formatCurrency(unitPrice)}</p>
              {mrp != null && mrp > unitPrice && (
                <p className="text-base text-muted-foreground line-through">MRP {formatCurrency(mrp)}</p>
              )}
              <span className="text-xs text-muted-foreground">per unit · incl. {part.gstRate}% GST</span>
            </div>

            {bulk && (
              <p className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                qty >= part.bulkMinQty ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
              )}>
                <Zap className="h-3.5 w-3.5" />
                {qty >= part.bulkMinQty
                  ? `Bulk price applied — you save ${formatCurrency((part.price - part.wholesalePrice!) * qty)}`
                  : `Buy ${part.bulkMinQty}+ at ${formatCurrency(part.wholesalePrice!)} each (save ${bulkSavePct}%)`}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-xl border">
                <Button variant="ghost" size="icon" type="button" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                  className="w-14 bg-transparent text-center font-semibold outline-none"
                  aria-label="Quantity"
                />
                <Button variant="ghost" size="icon" type="button" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Increase quantity">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm">
                <p className="font-semibold">Total {formatCurrency(unitPrice * qty)}</p>
                <p className={cn("text-xs", outOfStock ? "text-destructive" : part.stock < 10 ? "text-amber-600" : "text-primary")}>
                  {outOfStock ? "Out of stock" : part.stock < 10 ? `Only ${part.stock} left` : "In stock"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button className="h-11 gap-2" disabled={outOfStock} onClick={() => addToCart(false)}>
                <ShoppingCart className="h-5 w-5" /> Add to cart
              </Button>
              <Button variant="outline" className="h-11 gap-2" disabled={outOfStock} onClick={() => addToCart(true)}>
                Buy now
              </Button>
            </div>
            <div className="mt-3">
              <PartsWhatsAppButton lines={waLine} label="Ask on WhatsApp" />
            </div>
          </div>

          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            <li className="flex items-start gap-2 rounded-2xl border bg-card p-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Sold &amp; fulfilled by <strong>{part.sellerName ?? "verified seller"}</strong></span>
            </li>
            <li className="flex items-start gap-2 rounded-2xl border bg-card p-3">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Cash on Delivery available</span>
            </li>
            <li className="flex items-start gap-2 rounded-2xl border bg-card p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>GST invoice with every order (add your GSTIN at checkout)</span>
            </li>
            <li className="flex items-start gap-2 rounded-2xl border bg-card p-3">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Dispatch in 1–3 working days with courier tracking</span>
            </li>
          </ul>

          {part.description && (
            <section>
              <h2 className="text-lg font-semibold">About this part</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{part.description}</p>
            </section>
          )}

          {part.compatibility.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Fits these vehicles</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {part.compatibility.map((c) => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Not sure? Share your vehicle model and year in the order note or on WhatsApp — the parts desk verifies fitment before dispatch.</p>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && <PartsAiRecommendations parts={related} title="Frequently bought together" />}

      <div className="grid gap-8 lg:grid-cols-2">
        <PartReviews reviews={reviews} />
        {isAuthenticated ? (
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h3 className="text-lg font-semibold">Write a review</h3>
            <div>
              <Label>Your rating</Label>
              <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={reviewRating === n} aria-label={`${n} star`} onClick={() => setReviewRating(n)}>
                    <Star className={cn("h-7 w-7", n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-title">Title (optional)</Label>
              <Input id="review-title" className="mt-1" maxLength={120} value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="review-body">Review</Label>
              <Textarea id="review-body" className="mt-1" rows={4} maxLength={1500} value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="Fitment, quality, delivery experience…" />
            </div>
            <Button onClick={submitReview} disabled={reviewBusy}>{reviewBusy ? "Submitting…" : "Submit review"}</Button>
          </div>
        ) : (
          <div className="flex flex-col items-start justify-center gap-3 rounded-2xl border bg-card p-6">
            <h3 className="text-lg font-semibold">Bought this part?</h3>
            <p className="text-sm text-muted-foreground">Log in to rate it. Reviews from delivered orders are marked as verified purchases.</p>
            <Button variant="outline" asChild><Link to="/login" state={{ from: { pathname: `/parts/${part.categorySlug}/${part.slug}` } }}>Log in to review</Link></Button>
          </div>
        )}
      </div>
    </div>
  );
}
