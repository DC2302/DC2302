export const runtime = "nodejs";

const REPO = process.env.INTAKE_REPO || "DC2302/DC2302";
const BRANCH = process.env.INTAKE_BRANCH || "main";
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "submission"
  );
}

function safeName(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

async function commitFile(token, path, contentBase64, message) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, content: contentBase64, branch: BRANCH }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
}

export async function POST(request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      { ok: false, error: "Server is not configured yet (missing GITHUB_TOKEN env var on Vercel)." },
      { status: 500 }
    );
  }

  let fd;
  try {
    fd = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const text = (k) => String(fd.get(k) || "").trim();
  const idea = text("idea");
  const brandName = text("brandName");
  if (!idea || !brandName) {
    return Response.json({ ok: false, error: "Brand name and idea are required." }, { status: 400 });
  }

  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const folder = `intake/${stamp}-${slugify(brandName)}-${slugify(idea).slice(0, 24)}`;

  const intake = {
    submittedAt: new Date().toISOString(),
    status: "pending",
    brand: {
      name: brandName,
      website: text("website"),
      oneLiner: text("oneLiner"),
      tone: text("tone"),
      palette: text("palette"),
      wordsUse: text("wordsUse"),
      wordsBan: text("wordsBan"),
    },
    request: {
      idea,
      goal: text("goal") || "agents-decide",
      platforms: fd.getAll("platforms").map(String),
      lengthSeconds: text("length"),
      cta: text("cta"),
      specialInstructions: text("special"),
      characterNotes: text("characterNotes"),
    },
    contact: { email: text("email") },
    assets: { logo: null, inspiration: [], characters: [] },
  };

  // Collect files first so intake.json can reference them.
  const uploads = [];
  const collect = (field, single = false) => {
    const files = fd.getAll(field).filter((f) => f instanceof File && f.size > 0);
    for (const f of files.slice(0, single ? 1 : 6)) {
      if (f.size > MAX_FILE_BYTES) continue;
      const rel = `assets/${field}-${safeName(f.name)}`;
      uploads.push({ file: f, rel });
      if (single) intake.assets[field] = rel;
      else intake.assets[field].push(rel);
    }
  };
  collect("logo", true);
  collect("inspiration");
  collect("characters");

  try {
    for (const { file, rel } of uploads) {
      const buf = Buffer.from(await file.arrayBuffer());
      await commitFile(token, `${folder}/${rel}`, buf.toString("base64"), `OCD intake asset: ${rel}`);
    }
    await commitFile(
      token,
      `${folder}/intake.json`,
      Buffer.from(JSON.stringify(intake, null, 2)).toString("base64"),
      `OCD intake: ${brandName} — ${idea.slice(0, 60)}`
    );
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 502 });
  }

  return Response.json({ ok: true, path: folder });
}
