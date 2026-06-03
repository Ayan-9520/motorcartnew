import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Star, CheckCircle, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BulkUploadZone } from "../components/BulkUploadZone";
import { InventoryOptimizer } from "../components/InventoryOptimizer";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { CRMDataToolbar } from "../components/CRMDataToolbar";
import { VehicleInventoryDrawer, type VehicleFormState } from "../components/VehicleInventoryDrawer";
import { useDealer } from "../hooks/useDealer";
import { useDealerCRM } from "../hooks/useDealerCRM";
import { usePaginatedFilter } from "../hooks/usePaginatedFilter";
import { createVehicle, updateVehicle, deleteVehicle, mapDbToListing } from "@/services/vehicle.service";
import { fetchDealerVehiclesByDealerId } from "../services/dealer.service";
import { generateAISpecs } from "../lib/excel-parser";
import { calculateEmiMonthly } from "../data/indian-automobile-catalog";
import type { DbVehicle } from "@/types/database";
import type { VehicleListing } from "@/types/vehicle";
import { formatCurrency } from "@/lib/utils";
import { vehicleDetailPath } from "@/lib/vehicle-utils";
import toast from "react-hot-toast";
import { setPageMeta } from "@/utils/seo";
import { suggestVehiclePrice } from "../services/dealer-enterprise.service";
import { AIInventoryTips } from "@/ai/ecosystem";

export function DealerInventoryCRMPage() {
  const { dealer, user } = useDealer();
  const { refetch: refetchCRM } = useDealerCRM();
  const [vehicles, setVehicles] = useState<VehicleListing[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleListing | null>(null);
  const [statusTab, setStatusTab] = useState("all");

  const load = useCallback(async () => {
    if (!dealer) return;
    const rows = await fetchDealerVehiclesByDealerId(dealer.id);
    setVehicles(rows.length ? rows.map((v) => mapDbToListing(v as DbVehicle)) : []);
  }, [dealer]);

  useEffect(() => {
    setPageMeta({ title: "Inventory Management" });
    void load();
  }, [load]);

  const filteredByStatus = useMemo(() => {
    if (statusTab === "all") return vehicles;
    return vehicles.filter((v) => v.status === statusTab);
  }, [vehicles, statusTab]);

  const {
    query,
    setQuery,
    page,
    setPage,
    pageItems,
    totalPages,
    totalCount,
    resetPage,
  } = usePaginatedFilter(
    filteredByStatus,
    (v, q) => {
      const s = q.toLowerCase();
      return (
        v.title.toLowerCase().includes(s) ||
        v.brand.toLowerCase().includes(s) ||
        v.model.toLowerCase().includes(s)
      );
    },
    6
  );

  const buildPayload = (form: VehicleFormState) => {
    const images = form.imageUrls.map((u) => u.trim()).filter(Boolean);
    const emiMonthly = calculateEmiMonthly(form.price, form.emiRate, form.emiTenure);
    return {
      title: form.title || `${form.year} ${form.brand} ${form.model}`,
      brand: form.brand,
      model: form.model,
      variant: form.variant,
      year: form.year,
      price: form.price,
      fuelType: form.fuelType,
      transmission: form.transmission,
      bodyType: form.bodyType,
      category: form.category,
      kmsDriven: form.kmsDriven,
      owners: form.owners,
      color: form.color,
      city: form.city,
      state: form.state,
      description: form.description,
      images,
      condition: form.condition,
      metadata: {
        discountPercent: form.discount,
        emiMonthly,
        specifications: generateAISpecs({
          rowNumber: 0,
          brand: form.brand,
          model: form.model,
          year: form.year,
          fuel: form.fuelType,
          transmission: form.transmission,
          kmsDriven: form.kmsDriven,
          ownership: form.owners,
          price: form.price,
          registrationState: form.state,
        }),
      },
    };
  };

  const saveVehicle = async (form: VehicleFormState) => {
    if (!user || !dealer) {
      toast.error("Dealer profile not ready — refresh or complete signup");
      return;
    }
    const images = form.imageUrls.map((u) => u.trim()).filter(Boolean);
    if (!images.length) {
      toast.error("Add at least one photo (upload or URL)");
      return;
    }
    const payload = buildPayload(form);
    if (editing) {
      const { error } = await updateVehicle(editing.id, {
        ...payload,
        status: form.status,
        is_featured: form.featured,
      } as never);
      if (error) {
        toast.error(error.message ?? "Could not update listing");
        throw new Error(error.message);
      }
      toast.success("Listing updated");
    } else {
      const { error } = await createVehicle(payload, user.id, dealer.id);
      if (error) {
        toast.error(error.message ?? "Could not add vehicle");
        throw new Error(error.message);
      }
      toast.success("Vehicle added to inventory");
    }
    setEditing(null);
    await load();
    refetchCRM();
  };

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (v: VehicleListing) => {
    setEditing(v);
    setDrawerOpen(true);
  };

  const markSold = async (id: string) => {
    await updateVehicle(id, { status: "sold" });
    toast.success("Marked sold");
    await load();
  };

  const toggleFeatured = async (v: VehicleListing) => {
    await updateVehicle(v.id, { is_featured: !v.isFeatured } as never);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await deleteVehicle(id);
    toast.success("Deleted");
    await load();
  };

  const statusFilters = [
    { value: "all", label: "All" },
    { value: "available", label: "Live" },
    { value: "reserved", label: "Reserved" },
    { value: "sold", label: "Sold" },
  ];

  return (
    <DealerConsoleShell
      title="Inventory management"
      description="Add & edit vehicles with Indian brand catalog, multi-image URLs, EMI and featured listings."
      crumbs={[{ label: "Inventory" }]}
      actions={
        <Button className="gap-1 rounded-xl" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add vehicle
        </Button>
      }
    >
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">All inventory</TabsTrigger>
          <TabsTrigger value="upload">Bulk upload</TabsTrigger>
          <TabsTrigger value="optimizer">AI optimizer</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          <CRMDataToolbar
            search={query}
            onSearchChange={(v) => {
              setQuery(v);
              resetPage();
            }}
            searchPlaceholder="Search Hyundai, Creta, Nexon…"
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
            filters={statusFilters}
            activeFilter={statusTab}
            onFilterChange={(v) => {
              setStatusTab(v);
              resetPage();
            }}
          />

          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(240px,280px)]">
            <div className="space-y-3 min-w-0">
              {pageItems.map((v) => (
                <article key={v.id} className="dealer-inventory-row">
                  <img
                    src={v.images[0]}
                    alt=""
                    className="dealer-inventory-thumb"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={v.status === "available" ? "default" : "secondary"}>{v.status}</Badge>
                      {v.isFeatured && <Badge>Featured</Badge>}
                      <Badge variant="outline">{v.brand}</Badge>
                    </div>
                    <h3 className="mt-1 font-semibold truncate">{v.title}</h3>
                    <p className="text-primary font-bold">{formatCurrency(v.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.kmsDriven.toLocaleString()} km · {v.fuelType} · {v.transmission}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={vehicleDetailPath(v)}>View</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleFeatured(v)}>
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markSold(v.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(v.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </article>
              ))}
              {!pageItems.length && (
                <div className="dealer-os-card py-16 text-center text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary opacity-50" />
                  No listings match — add Hyundai, Tata, Maruti stock from Add vehicle.
                </div>
              )}
            </div>
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <AIInventoryTips vehicles={vehicles} />
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <BulkUploadZone dealer={dealer} sellerId={user?.id} onComplete={() => { void load(); refetchCRM(); }} />
        </TabsContent>

        <TabsContent value="optimizer" className="mt-4">
          <InventoryOptimizer vehicles={vehicles} />
        </TabsContent>
      </Tabs>

      <VehicleInventoryDrawer
        open={drawerOpen}
        editing={editing}
        dealerId={dealer?.id}
        defaultCity={dealer?.city ?? "Mumbai"}
        defaultState={dealer?.state ?? "Maharashtra"}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSave={saveVehicle}
        onAiPrice={(form) => {
          const s = suggestVehiclePrice({
            year: form.year,
            kmsDriven: form.kmsDriven,
            listedPrice: form.price || 500000,
            brand: form.brand,
          });
          toast.success(`Suggested ${formatCurrency(s.suggested)} · ${s.confidence}% confidence`);
        }}
      />
    </DealerConsoleShell>
  );
}
