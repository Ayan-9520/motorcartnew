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
  results: [],
};

export function useBulkUpload(dealer: DealerProfile | null, sellerId: string | undefined) {
  const [state, setState] = useState<BulkUploadState>(initial);
  const [parsedRows, setParsedRows] = useState<ParsedInventoryRow[]>([]);

  const parseFile = useCallback(async (file: File) => {
    setState({ ...initial, status: "parsing" });
    const buffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const { rows, errors } =
      ext === "csv" ? parseCSV(new TextDecoder().decode(buffer)) : parseWorkbook(buffer);

    if (dealer) {
      const existing = await fetchDealerVehiclesByDealerId(dealer.id);
      const dupes = detectDuplicates(rows, existing);
      dupes.forEach((msg, rowNum) => {
        errors.push({ row: rowNum, message: msg });
      });
    }

    setParsedRows(rows);
    setState({
      ...initial,
      status: "idle",
      total: rows.length,
      errors,
      failed: errors.length,
    });
    return { rows, errors };
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
          const { data, error } = await createVehicle(payload, sellerId, dealer.id);
          if (error) throw new Error(error.message);
          if (dealer.dealerType === "new_car_dealer") {
            await createNewCarInventory(dealer.id, {
              brand: row.brand,
              model: row.model,
              variant: row.variant ?? "Standard",
              fuelType: row.fuel,
              transmission: row.transmission,
              exShowroomPrice: row.dealerPrice ?? row.price,
              onRoadPrice: row.price,
              stockStatus: "available",
              imageUrl: row.mainImageUrl,
              waitingPeriodDays: 14,
            });
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
