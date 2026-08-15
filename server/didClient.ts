const DID_BASE = "https://api.d-id.com";

if (!process.env.DID_API_KEY) {
  console.warn("[d-id] DID_API_KEY is not set — avatar generation will fall back to Replicate");
}

export const DID_CONFIGURED = !!process.env.DID_API_KEY;

function didAuth(): string {
  const key = process.env.DID_API_KEY ?? "";
  // D-ID API keys are already in "API_USERNAME:API_PASSWORD" format —
  // encode as-is. Do NOT append an extra ":" (that breaks Basic Auth parsing).
  return "Basic " + Buffer.from(key).toString("base64");
}

// Upload a face image to D-ID's hosting; returns public D-ID URL
export async function uploadImageToDID(
  imageBuffer: Buffer,
  filename = "face.jpg",
  mimeType = "image/jpeg",
): Promise<string> {
  const form = new FormData();
  form.append("image", new Blob([imageBuffer], { type: mimeType }), filename);

  console.log(`[d-id] Uploading image (${Math.round(imageBuffer.length / 1024)} KB)…`);
  const res = await fetch(`${DID_BASE}/images`, {
    method: "POST",
    headers: { Authorization: didAuth() },
    body: form,
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`D-ID image upload failed (${res.status}): ${body}`);
  }
  const data = JSON.parse(body);
  const url: string = data.url;
  if (!url) throw new Error(`D-ID image upload returned no url: ${body}`);
  console.log(`[d-id] Image uploaded → ${url}`);
  return url;
}

// Upload a driver video to D-ID's clip driver hosting; returns public D-ID driver URL
export async function uploadDriverToDID(
  videoBuffer: Buffer,
  filename = "driver.mp4",
  mimeType = "video/mp4",
): Promise<string> {
  const form = new FormData();
  form.append("driver", new Blob([videoBuffer], { type: mimeType }), filename);

  console.log(`[d-id] Uploading driver video (${Math.round(videoBuffer.length / 1024)} KB)…`);
  const res = await fetch(`${DID_BASE}/clips/drivers`, {
    method: "POST",
    headers: { Authorization: didAuth() },
    body: form,
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`D-ID driver upload failed (${res.status}): ${body}`);
  }
  const data = JSON.parse(body);
  const url: string = data.url ?? data.driver_url ?? data.id;
  if (!url) throw new Error(`D-ID driver upload returned no url: ${body}`);
  console.log(`[d-id] Driver uploaded → ${url}`);
  return url;
}

// Create a D-ID Clip job; returns the clip ID
export async function createDIDClip(
  sourceUrl: string,
  driverUrl: string,
): Promise<string> {
  console.log(`[d-id] Creating clip (source=${sourceUrl.slice(0, 60)}…)`);
  const res = await fetch(`${DID_BASE}/clips`, {
    method: "POST",
    headers: {
      Authorization: didAuth(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      source_url: sourceUrl,
      driver_url: driverUrl,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`D-ID clip creation failed (${res.status}): ${body}`);
  }
  const data = JSON.parse(body);
  const id: string = data.id;
  if (!id) throw new Error(`D-ID clip creation returned no id: ${body}`);
  console.log(`[d-id] Clip created → id=${id}`);
  return id;
}

// Poll a D-ID Clip; returns normalised status info
export async function getDIDClip(clipId: string): Promise<{
  status: "created" | "started" | "done" | "error" | string;
  resultUrl: string | null;
  error: string | null;
}> {
  const res = await fetch(`${DID_BASE}/clips/${clipId}`, {
    headers: {
      Authorization: didAuth(),
      Accept: "application/json",
    },
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`D-ID clip status check failed (${res.status}): ${body}`);
  }
  const data = JSON.parse(body);
  const errMsg =
    data.error?.description ??
    data.error?.kind ??
    (typeof data.error === "string" ? data.error : null);

  return {
    status:    data.status ?? "unknown",
    resultUrl: data.result_url ?? null,
    error:     errMsg,
  };
}