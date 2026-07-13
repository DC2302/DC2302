export const runtime = "nodejs";
export const maxDuration = 60;

const REPO = process.env.INTAKE_REPO || "DC2302/DC2302";
const BRANCH = process.env.INTAKE_BRANCH || "main";
// Only this workspace's Higgsfield CDN prefix may be bridged — nothing else.
const ALLOWED_PREFIX =
  "https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/";
const MAX_BYTES = 80 * 1024 * 1024; // stay under GitHub's 100MB content cap

function cleanToken(raw) {
  return String(raw || "").trim().replace(/^["']+|["']+$/g, "").trim();
}

// GET /api/bridge?url=<higgsfield cdn url>
// Downloads the asset server-side (Vercel has open egress; the agent sandbox
// does not) and commits it to bridge/<filename> in the repo, where the agent
// pipeline can reach it via git. Returns the repo path.
export async function GET(request) {
  const token = cleanToken(process.env.GITHUB_TOKEN);
  if (!token) {
    return Response.json({ ok: false, error: "GITHUB_TOKEN not configured." }, { status: 500 });
  }
  const url = new URL(request.url).searchParams.get("url") || "";
  if (!url.startsWith(ALLOWED_PREFIX)) {
    return Response.json(
      { ok: false, error: "URL not allowed: only this workspace's Higgsfield CDN can be bridged." },
      { status: 400 }
    );
  }

  let buf;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_BYTES) throw new Error(`file too large (${ab.byteLength} bytes)`);
    buf = Buffer.from(ab);
  } catch (err) {
    return Response.json({ ok: false, error: `Download failed: ${err.message}` }, { status: 502 });
  }

  const name = url.split("/").pop().replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
  const path = `bridge/${name}`;
  const gh = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Bridge asset: ${name}`,
      content: buf.toString("base64"),
      branch: BRANCH,
    }),
  });
  if (!gh.ok) {
    const body = await gh.text();
    return Response.json(
      { ok: false, error: `GitHub ${gh.status}: ${body.slice(0, 200)}` },
      { status: 502 }
    );
  }
  return Response.json({ ok: true, path, bytes: buf.length });
}
