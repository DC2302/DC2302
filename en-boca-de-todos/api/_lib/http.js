export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

export async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

/* "data:image/jpeg;base64,...." from the admin page → { mediaType, data, bytes } */
export function parseImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ""));
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 4_000_000) return null;
  return { mediaType: m[1], data: m[2], bytes };
}
