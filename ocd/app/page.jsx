"use client";

import { useState } from "react";

const MAX_FILE_MB = 4;

function OsoMark({ size = 52 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OSO logo"
    >
      {/* bear ears */}
      <circle cx="18" cy="16" r="9" stroke="#F0A83C" strokeWidth="4" />
      <circle cx="46" cy="16" r="9" stroke="#F0A83C" strokeWidth="4" />
      {/* bear head */}
      <circle cx="32" cy="36" r="22" stroke="#F0A83C" strokeWidth="4" />
      {/* muzzle = the middle "S" dot of O-S-O */}
      <circle cx="32" cy="42" r="7" fill="#F0A83C" />
      <circle cx="26" cy="30" r="2.6" fill="#F0A83C" />
      <circle cx="38" cy="30" r="2.6" fill="#F0A83C" />
    </svg>
  );
}

export default function IntakePage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setResult(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    for (const [key, value] of fd.entries()) {
      if (value instanceof File && value.size > MAX_FILE_MB * 1024 * 1024) {
        setResult({
          ok: false,
          msg: `"${value.name}" is over ${MAX_FILE_MB}MB. Please resize it (or add large files to the repo directly) and try again. [${key}]`,
        });
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch("/api/intake", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult({
        ok: true,
        msg: "Submission received. Your brand brief and assets are queued for the OSO agent team.",
        path: data.path,
      });
      form.reset();
    } catch (err) {
      setResult({ ok: false, msg: `Submission failed: ${err.message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <header className="masthead">
        <OsoMark />
        <div>
          <div className="wordmark">
            OSO <span>Content Design</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", letterSpacing: "0.14em" }}>
            O·C·D — OBSESSIVELY CONSISTENT BRANDING
          </div>
        </div>
      </header>
      <p className="tagline">
        Tell us your brand once. Our agent team — strategist, writer, designer,
        producer — turns it into <b>on-brand video and image content</b>, every time.
      </p>

      <form onSubmit={onSubmit}>
        <fieldset>
          <legend>Your brand</legend>
          <div className="grid2">
            <div>
              <label htmlFor="brandName">Brand name *</label>
              <input id="brandName" name="brandName" type="text" required />
            </div>
            <div>
              <label htmlFor="website">Website / link for CTAs</label>
              <input id="website" name="website" type="url" placeholder="https://" />
            </div>
          </div>
          <label htmlFor="oneLiner">What you do, in one sentence *</label>
          <input id="oneLiner" name="oneLiner" type="text" required />
          <div className="grid2">
            <div>
              <label htmlFor="tone">
                Tone <small>— e.g. confident, warm, no-hype</small>
              </label>
              <input id="tone" name="tone" type="text" />
            </div>
            <div>
              <label htmlFor="palette">
                Brand colors <small>— hex codes or names</small>
              </label>
              <input id="palette" name="palette" type="text" placeholder="#F0A83C, #12100E" />
            </div>
          </div>
          <div className="grid2">
            <div>
              <label htmlFor="wordsUse">Words / phrases you love</label>
              <input id="wordsUse" name="wordsUse" type="text" />
            </div>
            <div>
              <label htmlFor="wordsBan">Words we must never use</label>
              <input id="wordsBan" name="wordsBan" type="text" />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Assets & inspiration</legend>
          <p className="hint">
            Images up to {MAX_FILE_MB}MB each. Inspiration images set the visual
            direction — the agents match their style, never copy their content.
          </p>
          <label htmlFor="logo">Logo (PNG/SVG, transparent preferred)</label>
          <input className="file" id="logo" name="logo" type="file" accept="image/*,.svg" />
          <label htmlFor="inspiration">Inspiration images (up to 6)</label>
          <input
            className="file"
            id="inspiration"
            name="inspiration"
            type="file"
            accept="image/*"
            multiple
          />
          <label htmlFor="characters">
            Character / mascot references <small>— optional, recurring faces of the brand</small>
          </label>
          <input
            className="file"
            id="characters"
            name="characters"
            type="file"
            accept="image/*"
            multiple
          />
          <label htmlFor="characterNotes">Character names & notes</label>
          <textarea
            id="characterNotes"
            name="characterNotes"
            placeholder={'e.g. "Ozzy — our bear mascot, always wears the amber cap"'}
          />
        </fieldset>

        <fieldset>
          <legend>What should we make?</legend>
          <label htmlFor="idea">The idea — what do you want to talk about? *</label>
          <textarea
            id="idea"
            name="idea"
            required
            placeholder="e.g. why most small businesses waste money on ads — and the one fix"
          />
          <label>Goal</label>
          <div className="pills">
            <label>
              <input type="radio" name="goal" value="advertising" /> Advertising
            </label>
            <label>
              <input type="radio" name="goal" value="lead-generation" /> Lead generation
            </label>
            <label>
              <input type="radio" name="goal" value="brand-trust" /> Brand trust
            </label>
            <label>
              <input type="radio" name="goal" value="agents-decide" defaultChecked /> Let the agents decide
            </label>
          </div>
          <label>Platforms</label>
          <div className="pills">
            {["TikTok", "Instagram Reels", "YouTube Shorts", "YouTube", "LinkedIn", "Facebook"].map(
              (p) => (
                <label key={p}>
                  <input type="checkbox" name="platforms" value={p} /> {p}
                </label>
              )
            )}
          </div>
          <div className="grid2">
            <div>
              <label htmlFor="length">Length</label>
              <select id="length" name="length" defaultValue="agents-decide">
                <option value="agents-decide">Let the agents decide</option>
                <option value="30">30 seconds</option>
                <option value="40">40 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
              </select>
            </div>
            <div>
              <label htmlFor="cta">Call to action</label>
              <input id="cta" name="cta" type="text" placeholder='e.g. "Book a free demo"' />
            </div>
          </div>
          <label htmlFor="special">Special instructions</label>
          <textarea
            id="special"
            name="special"
            placeholder='Anything the agents must always / never do. e.g. "always end on the logo"'
          />
          <label htmlFor="email">Your email <small>— so we can tag the submission</small></label>
          <input id="email" name="email" type="email" />
        </fieldset>

        <button className="submit" type="submit" disabled={busy}>
          {busy ? "Uploading to the agent team…" : "Send it to the agents →"}
        </button>

        {result && (
          <div className={`status ${result.ok ? "ok" : "err"}`}>
            {result.msg}
            {result.path && (
              <>
                {" "}
                Reference: <code>{result.path}</code>
              </>
            )}
          </div>
        )}
      </form>

      <footer>
        OSO Content Design · an OS Optimization studio · powered by an agentic
        production pipeline
      </footer>
    </main>
  );
}
