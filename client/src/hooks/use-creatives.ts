import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type GenerateCreativeInput } from "@shared/routes";

export function useCreatives(brandId?: number) {
  return useQuery({
    queryKey: [api.creatives.list.path, brandId],
    queryFn: async () => {
      let url = api.creatives.list.path;
      if (brandId) url += `?brandId=${brandId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch creatives");
      return await res.json();
    },
  });
}

export function useCreative(id: number | null) {
  return useQuery({
    queryKey: [api.creatives.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.creatives.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch creative");
      return await res.json();
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      return data?.status === "generating" ? 2000 : false;
    },
  });
}

export function useGenerateCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateCreativeInput & { mediaType?: string }) => {
      const res = await fetch(api.creatives.generate.path, {
        method: api.creatives.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start generation");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.creatives.list.path] }),
  });
}

export function useUploadVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      file: File;
      brandId: number;
      title: string;
      platform: string;
      formatSize: string;
      formatName: string;
      productName: string;
      productDescription: string;
      goal: string;
      targetAudience?: string;
    }) => {
      const formData = new FormData();
      formData.append("video", data.file);
      formData.append("brandId", String(data.brandId));
      formData.append("title", data.title);
      formData.append("platform", data.platform);
      formData.append("formatSize", data.formatSize);
      formData.append("formatName", data.formatName);
      formData.append("productName", data.productName);
      formData.append("productDescription", data.productDescription);
      formData.append("goal", data.goal);
      if (data.targetAudience) formData.append("targetAudience", data.targetAudience);

      const res = await fetch("/api/creatives/upload-video", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload video");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.creatives.list.path] }),
  });
}

export function useToggleFavoriteCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      const url = buildUrl(api.creatives.toggleFavorite.path, { id });
      const res = await fetch(url, {
        method: api.creatives.toggleFavorite.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.creatives.list.path] }),
  });
}

export function useDeleteCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.creatives.delete.path, { id });
      const res = await fetch(url, {
        method: api.creatives.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete creative");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.creatives.list.path] }),
  });
}
