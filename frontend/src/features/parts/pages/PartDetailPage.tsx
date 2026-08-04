import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { useAuth } from "@/hooks/useAuth";
import { usePartDetail } from "../hooks/usePartDetail";
import { PartReviews } from "../components/PartReviews";
import { PartsWhatsAppButton } from "../components/PartsWhatsAppButton";
import { PartsAiRecommendations } from "../components/PartsAiRecommendations";
import { usePartsCartStore } from "@/store/partsCartStore";
import { displayUnitPrice } from "../lib/part-utils";
import { recommendParts } from "../lib/ai-parts";
import { usePartsList } from "../hooks/usePartsList";
import toast from "react-hot-toast";
import { postPartReview } from "../services/parts.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PartDetailPage() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const { part, reviews, loading } = usePartDetail(category, slug);
  const { parts: categoryParts } = usePartsList(part?.categorySlug, "", null);
  const { user, isAuthenticated } = useAuth();
  const addProduct = usePartsCartStore((s) => s.addProduct);
  const [qty, setQty] = useState(1);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  useEffect(() => {
    if (part) {
      setPageMeta({ title: `${part.name} — Motorcart Parts`, description: part.description ?? part.name });
      setQty(part.bulkMinQty);
    }
  }, [part]);

  const related = part
    ? recommendParts(
        categoryParts.filter((item) => item.id !== part.id),
        { category: part.categorySlug, vehicle: part.compatibility[0] },
        4
      )
    : [];

  const addToCart = () => {
    if (!part) return;
    if (qty < part.bulkMinQty) {
      toast.error(`Minimum order quantity is ${part.bulkMinQty}`);
      return;
    }
    if (qty > part.stock) {
      toast.error("Not enough stock");
      return;
    }
    const unit = displayUnitPrice(part, user?.role);
    addProduct(part, qty, unit);
    toast.success("Added to cart");
  };

  const submitReview = async () => {
    if (!part || !user) {
      toast.error("Login to review");
      return;
    }
    const { error } = await postPartReview(part.id, user.id, reviewRating, reviewTitle, reviewBody);
    if (error) toast.error(error.message);
    else {
      toast.success("Review submitted");
      setReviewTitle("");
      setReviewBody("");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full max-w-4xl rounded-2xl" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Product not found</p>
        <Button variant="link" asChild><Link to="/parts">Back to parts hub</Link></Button>
      </div>
    );
  }

  const unitPrice = displayUnitPrice(part, user?.role);
  const waLine = [{ partId: part.id, slug: part.slug, name: part.name, categorySlug: part.categorySlug, image: part.images[0], price: unitPrice, wholesalePrice: part.wholesalePrice, gstRate: part.gstRate, bulkMinQty: part.bulkMinQty, sellerId: part.sellerId, qty }];

  return (
    <div className="container mx-auto max-w-6xl space-y-10 px-4 py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/parts" className="hover:text-primary">Parts</Link>
        <span>/</span>
        <Link to={`/parts/${part.categorySlug}`} className="hover:text-primary capitalize">
          {part.categorySlug.replace(/-/g, " ")}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
            <img src={part.images[0]} alt={part.name} className="h-full w-full object-cover" />
          </div>
          {part.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {part.images.map((src) => (
                <img key={src} src={src} alt="" className="h-16 w-16 shrink-0 rounded-lg border object-cover" />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <Badge variant="secondary">{part.brand}</Badge>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">{part.name}</h1>
            <p className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> Ships 1–3 days</span>
              <span>SKU {part.sku}</span>
              <span>GST {part.gstRate}% included</span>
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <p className="text-3xl font-bold text-primary">{formatCurrency(unitPrice * qty)}</p>
            <p className="text-sm text-muted-foreground">for {qty} units @ {formatCurrency(unitPrice)}</p>
            <div className="mt-4 flex items-center gap-3">
              <Button variant="outline" size="icon" type="button" onClick={() => setQty((q) => Math.max(part.bulkMinQty, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <Button variant="outline" size="icon" type="button" onClick={() => setQty((q) => Math.min(part.stock, q + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Stock: {part.stock} · Bulk minimum: {part.bulkMinQty}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="default" className="gap-2" onClick={addToCart}>
                <ShoppingCart className="h-5 w-5" /> Add to cart
              </Button>
              <PartsWhatsAppButton lines={waLine} label="WhatsApp order" />
            </div>
          </div>

          {part.description && (
            <section>
              <h2 className="font-semibold">Description</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{part.description}</p>
            </section>
          )}

          {part.compatibility.length > 0 && (
            <section>
              <h2 className="font-semibold">Compatibility</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {part.compatibility.map((c) => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <PartsAiRecommendations parts={related} title="Frequently bought together" />

      <div className="grid gap-8 lg:grid-cols-2">
        <PartReviews reviews={reviews} />
        {isAuthenticated && (
          <div className="rounded-xl border p-6 space-y-3">
            <h3 className="font-semibold">Write a review</h3>
            <div>
              <Label>Rating (1–5)</Label>
              <Input type="number" min={1} max={5} value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} />
            </div>
            <div>
              <Label>Review</Label>
              <Input value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} />
            </div>
            <Button onClick={submitReview}>Submit review</Button>
          </div>
        )}
      </div>
    </div>
  );
}
