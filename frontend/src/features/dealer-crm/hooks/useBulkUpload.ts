import { useCallback, useState } from "react";
import { parseWorkbook, parseCSV, parsedRowToVehiclePayload, detectDuplicates } from "../lib/excel-parser";
import { createNewCarInventory } from "@/features/new-car-dealer/services/new-car-dealer.service";
import { createVehicle } from "@/services/vehicle.service";
import { createInventoryUploadRecord, completeInventoryUpload, fetchDealerVehiclesByDealerId } from "../services/dealer.service";
import type { BulkUploadState, ParsedInventoryRow, UploadRowResult } from "../types";
import type { DealerProfile } from "../types";
import toast from "react-hot-toast";

const initial: BulkUploadState = {
  status: "idle",
  progress: 0,
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
  warnings: [],
  results: [],
};

function shouldPublishAsNewCar(
  dealer: DealerProfile,
  payload: { category: string; condition: "new" | "used" },
): boolean {
  return (
    dealer.dealerType === "new_car_dealer" ||
    payload.category === "new-cars" ||
    payload.condition === "new"
  );
}

export function useBulkUpload(dealer: DealerProfile | null, sellerId: string | undefined) {
  const [state, setState] = useState<BulkUploadState>(initial);
  const [parsedRows, setParsedRows] = useState<ParsedInventoryRow[]>([]);

  const parseFile = useCallback(async (file: File) => {
    setState({ ...initial, status: "parsing" });
    const buffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const { rows, errors, warnings } =
      ext === "csv" ? parseCSV(new TextDecoder().decode(buffer)) : parseWorkbook(buffer);

    if (dealer) {
      const existing = await fetchDealerVehiclesByDealerId(dealer.id);
      const dupes = detectDuplicates(rows, existing);
      dupes.forEach((msg, rowNum) => {
        errors.push({ row: rowNum, message: msg });
        const idx = rows.findIndex((r) => r.rowNumber === rowNum);
        if (idx >= 0) rows.splice(idx, 1);
      });
    }

    setParsedRows(rows);
    setState({
      ...initial,
      status: "idle",
      total: rows.length,
      errors,
      warnings,
      failed: errors.length,
    });
    if (rows.length) {
      toast.success(`${rows.length} row(s) ready to upload`);
    } else if (errors.length) {
      toast.error("No valid rows — Brand and Model are required");
    }
    return { rows, errors, warnings };
  }, [dealer]);

  const uploadRows = useCallback(
    async (rowsToUpload?: ParsedInventoryRow[]) => {
      if (!dealer || !sellerId) {
        toast.error("Sign in with an approved dealer account to upload inventory");
        return;
      }
      const rows = rowsToUpload ?? parsedRows;
      if (!rows.length) return;

      setState((s) => ({ ...s, status: "uploading", progress: 0, total: rows.length, results: [] }));

      const uploadRecord = await createInventoryUploadRecord({
        dealerId: dealer.id,
        uploadedBy: sellerId,
        fileName: `bulk-${Date.now()}.xlsx`,
        totalRows: rows.length,
      });

      const results: UploadRowResult[] = [];
      let success = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const payload = parsedRowToVehiclePayload(row, {
            city: dealer.city,
            state: dealer.state,
            dealerType: dealer.dealerType,
          });

          // Force marketplace category for new-car showroom so /buy/cars/new can find the row
          const publishNew = shouldPublishAsNewCar(dealer, payload);
          if (publishNew) {
            payload.category = "new-cars";
            payload.condition = "new";
            payload.kmsDriven = 0;
            payload.owners = 0;
          }

          const { data, error } = await createVehicle(payload, sellerId, dealer.id);
          if (error) throw new Error(error.message);

          if (publishNew) {
            const ncd = await createNewCarInventory(
              dealer.id,
              {
                brand: row.brand,
                model: row.model,
                variant: row.variant ?? "",
                fuelType: row.fuel || "",
                transmission: row.transmission || "",
                exShowroomPrice: row.priceOnRequest ? 0 : row.dealerPrice ?? row.price,
                onRoadPrice: row.onRoadPrice,
                stock: 1,
                stockStatus: "available",
                imageUrl: row.mainImageUrl || row.imageUrls?.[0],
                images: row.imageUrls?.length ? row.imageUrls : row.mainImageUrl ? [row.mainImageUrl] : undefined,
                waitingPeriodDays: row.waitingPeriodDays ? Number(row.waitingPeriodDays) || undefined : undefined,
                brochureUrl: row.brochureUrl,
                year: row.year,
                bodyType: row.bodyType,
                engineCc: row.engineCc,
                mileage: row.mileage,
                rangeKm: row.rangeKm,
                batteryKwh: row.batteryKwh,
                power: row.power,
                torque: row.torque,
                seating: row.seating,
                bootSpace: row.bootSpace,
                groundClearance: row.groundClearance,
                driveType: row.driveType,
                airbags: row.airbags,
                features: row.features,
                notes: row.description,
              },
              {
                sellerId,
                dealerCity: dealer.city,
                dealerState: dealer.state,
                syncMarketplace: false,
                linkedVehicleId: data?.id,
              },
            );
            if (ncd.error) {
              throw new Error(ncd.error.message ?? "Failed to publish to New Cars stock");
            }
          }

          success++;
          results.push({ row: row.rowNumber, success: true, vehicleId: data?.id, data: row });
        } catch (e) {
          failed++;
          results.push({
            row: row.rowNumber,
            success: false,
            error: e instanceof Error ? e.message : "Insert failed",
            data: row,
          });
        }
        setState((s) => ({
          ...s,
          progress: Math.round(((i + 1) / rows.length) * 100),
          success,
          failed,
          results: [...results],
        }));
      }

      if (uploadRecord.data?.id) {
        await completeInventoryUpload(
          uploadRecord.data.id,
          success,
          failed,
          results.filter((r) => !r.success).map((r) => ({ row: r.row, error: r.error }))
        );
      }

      setState((s) => ({
        ...s,
        status: "done",
        progress: 100,
        success,
        failed,
        results,
        uploadId: uploadRecord.data?.id,
      }));
      toast.success(`Upload complete — ${success} succeeded, ${failed} failed`);
    },
    [dealer, sellerId, parsedRows]
  );

  const retryFailed = useCallback(async () => {
    const failedRows = state.results
      .filter((r) => !r.success && r.data)
      .map((r) => r.data!);
    if (failedRows.length) await uploadRows(failedRows);
  }, [state.results, uploadRows]);

  const reset = useCallback(() => {
    setState(initial);
    setParsedRows([]);
  }, []);

  return { state, parsedRows, parseFile, uploadRows, retryFailed, reset };
}
