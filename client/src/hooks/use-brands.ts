import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type BrandInput } from "@shared/routes";

export function useBrands() {
  return useQuery({
    queryKey: [api.brands.list.path],
    queryFn: async () => {
      const res = await fetch(api.brands.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch brands");
      return await res.json(); // Array of Brand
    },
  });
}

export function useBrand(id: number | null) {
  return useQuery({
    queryKey: [api.brands.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.brands.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch brand");
      return await res.json();
    },
    enabled: !!id,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BrandInput) => {
      const res = await fetch(api.brands.create.path, {
        method: api.brands.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        let message = "Failed to create brand";
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
          if (body?.field) message += ` (${body.field})`;
        } catch {
          // Keep the meaningful fallback when the server did not return JSON.
        }
        throw new Error(message);
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.brands.list.path] }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<BrandInput>) => {
      const url = buildUrl(api.brands.update.path, { id });
      const res = await fetch(url, {
        method: api.brands.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update brand");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.brands.list.path] }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.brands.delete.path, { id });
      const res = await fetch(url, {
        method: api.brands.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete brand");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.brands.list.path] }),
  });
}
