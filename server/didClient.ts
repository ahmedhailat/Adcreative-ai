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

// Upload a face image to D-ID's hosting; returns public D-ID URL (used as source_url)
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

// Create a D-ID Talk using a custom source image + a custom driving video.
// NOTE: driver_url must be a plain, publicly-fetchable URL — D-ID does NOT
// have a separate "upload driver video" endpoint. The caller is responsible
// for exposing the driving video at a temporary public URL (e.g. via a
// short-lived signed route on our own server) before calling this.
// NOTE: using a custom driver_url requires a D-ID plan with "custom scene"
// permission — accounts without it will get a 403 PermissionError here,
// which the caller should catch and fall back to another provider.
export async function createDIDTalk(
  sourceUrl: string,
  driverUrl: string,
): Promise<string> {
  console.log(`[d-id] Creating talk (source=${sourceUrl.slice(0, 60)}…, driver=${driverUrl.slice(0, 60)}…)`);
  const res = await fetch(`${DID_BASE}/talks`, {
    method: "POST",
    headers: {
      Authorization: didAuth(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      source_url: sourceUrl,
      driver_url: driverUrl,
      // D-ID's /talks endpoint requires a "script". Since the goal here is to
      // replicate the driving video's own motion + speech, we point the audio
      // source at the same driver video (D-ID extracts the audio track).
      script: {
        type: "audio",
        audio_url: driverUrl,
      },
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`D-ID talk creation failed (${res.status}): ${body}`);
  }
  const data = JSON.parse(body);
  const id: string = data.id;
  if (!id) throw new Error(`D-ID talk creation returned no id: ${body}`);
  console.log(`[d-id] Talk created → id=${id}`);
  return id;
}

// Poll a D-ID Talk; returns normalised status info
export async function getDIDTalk(talkId: string): Promise<{
  status: "created" | "started" | "done" | "error" | string;
  resultUrl: string | null;
  error: string | null;
}> {
  const res = await fetch(`${DID_BASE}/talks/${talkId}`, {
    headers: {
      Authorization: didAuth(),
      Accept: "application/json",
    },
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`D-ID talk status check failed (${res.status}): ${body}`);
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
