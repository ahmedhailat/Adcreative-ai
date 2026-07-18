import Replicate from "replicate";

if (!process.env.REPLICATE_API_TOKEN) {
  console.warn("[replicate] REPLICATE_API_TOKEN is not set — avatar generation will fail");
}

export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

// fofr/live-portrait — fetched 2026-07-17
export const LIVE_PORTRAIT_VERSION =
  "067dd98cc3e5cb396c4a9efb4bba3eec6c4a9d271211325c477518fc6485e146";
