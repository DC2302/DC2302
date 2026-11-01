import { getPhoto } from "./_lib/store.js";

/* Photos sit in a private Blob store; this streams one back. Keys carry a random suffix, so they never change. */
export async function GET(request) {
  const key = new URL(request.url).searchParams.get("k") ?? "";
  const photo = await getPhoto(key);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(photo.body, { headers: { "content-type": photo.contentType, "cache-control": "public, max-age=31536000, immutable" } });
}
