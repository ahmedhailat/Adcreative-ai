import { z } from "zod";
import { insertBrandSchema, insertCreativeSchema } from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  dashboard: {
    stats: {
      method: "GET" as const,
      path: "/api/dashboard/stats" as const,
      responses: {
        200: z.object({
          totalBrands: z.number(),
          totalCreatives: z.number(),
          readyCreatives: z.number(),
          favoritedCreatives: z.number(),
        }),
      },
    },
  },
  brands: {
    list: {
      method: "GET" as const,
      path: "/api/brands" as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: "GET" as const,
      path: "/api/brands/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/brands" as const,
      input: insertBrandSchema,
      responses: { 201: z.any(), 400: errorSchemas.validation },
    },
    update: {
      method: "PUT" as const,
      path: "/api/brands/:id" as const,
      input: insertBrandSchema.partial(),
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/brands/:id" as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },
  creatives: {
    list: {
      method: "GET" as const,
      path: "/api/creatives" as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: "GET" as const,
      path: "/api/creatives/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    generate: {
      method: "POST" as const,
      path: "/api/creatives/generate" as const,
      input: z.object({
        brandId: z.coerce.number().int().positive(),
        platform: z.string(),
        formatSize: z.string(),
        formatName: z.string(),
        productName: z.string(),
        productDescription: z.string(),
        targetAudience: z.string().optional(),
        goal: z.string(),
        title: z.string(),
      }),
      responses: { 201: z.any(), 400: errorSchemas.validation },
    },
    toggleFavorite: {
      method: "PATCH" as const,
      path: "/api/creatives/:id/favorite" as const,
      input: z.object({ isFavorite: z.boolean() }),
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/creatives/:id" as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },
  templates: {
    list: {
      method: "GET" as const,
      path: "/api/templates" as const,
      responses: { 200: z.array(z.any()) },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type BrandInput = z.infer<typeof insertBrandSchema>;
export type GenerateCreativeInput = z.infer<typeof api.creatives.generate.input>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
