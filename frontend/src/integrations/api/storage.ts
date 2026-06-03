import { api, apiErrorMessage } from "@/lib/api/axios";

function storageApi(bucket: string) {
  return {
    async upload(path: string, file: File, _opts?: { cacheControl?: string; upsert?: boolean }) {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", bucket);
      form.append("path", path);
      try {
        const { data } = await api.post<{ path: string; publicUrl: string }>("/api/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const base = import.meta.env.VITE_API_URL ?? "";
        const publicUrl = data.publicUrl.startsWith("http")
          ? data.publicUrl
          : `${base}${data.publicUrl}`;
        return { data: { path: data.path, publicUrl }, error: null };
      } catch (err) {
        return { data: null, error: { message: apiErrorMessage(err) } };
      }
    },

    getPublicUrl(path: string) {
      const base = import.meta.env.VITE_API_URL ?? "";
      return { data: { publicUrl: `${base}/uploads/${bucket}/${path}` } };
    },

    async remove(paths: string[]) {
      try {
        await api.delete("/api/upload", { data: { bucket, paths } });
        return { error: null };
      } catch (err) {
        return { error: { message: apiErrorMessage(err) } };
      }
    },
  };
}

export const apiStorage = {
  from: storageApi,
};
