import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { setPageMeta } from "@/utils/seo";
import { useVehicleHubStore } from "@/store/vehicleHubStore";
import {
  parseHubCategorySlug,
  parseConditionSlug,
  buyListingPath,
} from "../lib/route-utils";
import { getHubCopy } from "../data/marketplace-hub-config";
import { MarketplaceHubHero } from "../components/MarketplaceHubHero";
import { BuyBrowseByBrand } from "../components/BuyBrowseByBrand";
import { BuyBrowseByType } from "../components/BuyBrowseByType";

export function BuyHubPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeHub = useVehicleHubStore((s) => s.activeHub);
  const activeCondition = useVehicleHubStore((s) => s.activeCondition);
  const setBuyContext = useVehicleHubStore((s) => s.setBuyContext);
  const copy = getHubCopy(activeHub);
  const primedCarsRef = useRef(false);

  const hubParam = searchParams.get("hub");
  const conditionParam = searchParams.get("condition");

  useEffect(() => {
    const hub = parseHubCategorySlug(hubParam ?? undefined);
    if (!hub) return;
    const condition =
      parseConditionSlug(conditionParam ?? undefined) ?? activeCondition;
    setBuyContext(hub, condition);
    navigate(buyListingPath(hub, condition), { replace: true });
  }, [hubParam, conditionParam, activeCondition, navigate, setBuyContext]);

  useEffect(() => {
    setPageMeta({
      title: `Buy ${copy.plural} — New & Pre-Owned`,
      description: `Browse new and pre-owned ${copy.plural.toLowerCase()} by brand, type & budget with verified dealers on Motorcart.`,
    });
  }, [copy.plural]);

  // First open of /buy → Cars + New (premium brand-first)
  useEffect(() => {
    if (hubParam || primedCarsRef.current) return;
    primedCarsRef.current = true;
    setBuyContext("cars", "new");
  }, [hubParam, setBuyContext]);

  return (
    <div className="buy-hub-page buy-hub-premium min-h-screen">
      <MarketplaceHubHero mode="buy" />

      <div className="container space-y-10 pb-14 pt-8 md:space-y-12 md:pb-16 md:pt-10">
        <motion.div
          key={`brands-${activeHub}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BuyBrowseByBrand hub={activeHub} condition={activeCondition} />
        </motion.div>

        <motion.div
          key={`types-${activeHub}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04 }}
        >
          <BuyBrowseByType hub={activeHub} condition={activeCondition} />
        </motion.div>
      </div>
    </div>
  );
}
