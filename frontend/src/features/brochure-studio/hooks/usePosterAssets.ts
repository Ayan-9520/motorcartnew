import { useEffect, useState } from "react";
import { loadPosterImage, qrImage } from "../lib/image-loader";
import { galleryLabel, type PosterAssets } from "../lib/render-poster";
import type { BrochureDesign, BrochureVehicle } from "../types";

const EMPTY: PosterAssets = {
  hero: null,
  secondary: null,
  gallery: [],
  compareHero: null,
  dealerLogo: null,
  brandLight: null,
  brandDark: null,
  qr: null,
};

/** Loads every image a poster needs; re-runs only when the underlying URLs change. */
export function usePosterAssets(design: BrochureDesign | null, vehicle: BrochureVehicle | null, qrText: string) {
  const [assets, setAssets] = useState<PosterAssets>(EMPTY);
  const [loading, setLoading] = useState(false);

  const hero = design?.images.heroUrl ?? "";
  const secondary = design?.images.secondaryUrl ?? "";
  const gallery = (design?.images.galleryUrls ?? []).join("|");
  const compareHero = design?.images.compareHeroUrl ?? "";
  const logo = design?.branding.logoUrl ?? "";
  const qrColor = design?.colors.dark ?? "#0b1f4b";

  useEffect(() => {
    if (!vehicle) return;
    let cancelled = false;
    setLoading(true);
    const galleryUrls = gallery ? gallery.split("|") : [];
    void Promise.all([
      loadPosterImage(hero),
      loadPosterImage(secondary),
      Promise.all(galleryUrls.map((u) => loadPosterImage(u))),
      loadPosterImage(compareHero),
      loadPosterImage(logo),
      loadPosterImage("/brand/motorcart-lockup.png"),
      loadPosterImage("/brand/motorcart-wordmark-dark.png"),
      qrText ? qrImage(qrText, qrColor) : Promise.resolve(null),
    ]).then(([h, s, g, c, l, bl, bd, q]) => {
      if (cancelled) return;
      setAssets({
        hero: h,
        secondary: s,
        gallery: galleryUrls.map((u, i) => ({ img: g[i] ?? null, label: galleryLabel(vehicle, u, i) })),
        compareHero: c,
        dealerLogo: l,
        brandLight: bl,
        brandDark: bd,
        qr: q,
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [vehicle, hero, secondary, gallery, compareHero, logo, qrText, qrColor]);

  return { assets, loading };
}
