import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { findCompanyById } from "./companies.js";
import { availableProviders, createPaymentLink } from "./payments.js";
import { postToCrm } from "./crm.js";

/**
 * Hosted payment page, one per company:
 *
 *   GET  /p/<companyId>            the payment page (link it from the
 *                                  website and Google Business Profile)
 *   GET  /p/<companyId>/terms      the company's terms and conditions
 *                                  (companies/<companyId>/terms.md)
 *   POST /p/<companyId>/checkout   records the terms acceptance, then either
 *                                  redirects to Square/Stripe checkout or
 *                                  reveals Zelle / Cash App / ACH details
 *
 * The terms checkbox is enforced BOTH in the browser (button stays disabled)
 * and on the server (checkout without acceptance is rejected), and every
 * acceptance is recorded with name, contact, timestamp, and IP address in
 * data/<companyId>-terms-acceptances.jsonl plus the company's CRM webhook.
 * Zelle / Cash App / ACH details are only shown AFTER the terms are accepted.
 *
 * Which methods appear is pure per-company config in company.json:
 *   payments             -> card checkout (Square and/or Stripe)
 *   web.zelle            -> Zelle details
 *   web.cashAppTag       -> Cash App details
 *   web.achInstructions  -> ACH / bank transfer details
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..", "data");

export const webpay = express.Router();

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paymentMethods(company) {
  const web = company.web || {};
  const methods = [];
  const providers = availableProviders(company);
  if (providers.length) {
    methods.push({
      key: "card",
      label: `Card / online payment (${providers.map((p) => (p === "stripe" ? "Stripe" : "Square")).join(" or ")})`,
    });
  }
  if (web.zelle) methods.push({ key: "zelle", label: "Zelle" });
  if (web.cashAppTag) methods.push({ key: "cashapp", label: "Cash App" });
  if (web.achInstructions) methods.push({ key: "ach", label: "ACH / bank transfer" });
  return methods;
}

function recordAcceptance(company, req, details) {
  const record = {
    event: "terms.accepted",
    company: company.id,
    companyName: company.name,
    acceptedAt: new Date().toISOString(),
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"] || "",
    termsVersion: company.web?.termsVersion || "1",
    ...details,
  };
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(
      path.join(dataDir, `${company.id}-terms-acceptances.jsonl`),
      JSON.stringify(record) + "\n"
    );
  } catch (err) {
    console.error(`Failed to record terms acceptance for ${company.id}: ${err.message}`);
  }
  postToCrm(company, record).catch(() => {});
  return record;
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #f5f6f8; color: #1c1e21; }
  @media (prefers-color-scheme: dark) { body { background: #17191c; color: #e8e9eb; } .card { background: #222529 !important; } input, select { background:#17191c; color:#e8e9eb; border-color:#444 !important; } }
  .wrap { max-width: 560px; margin: 0 auto; padding: 24px 16px 48px; }
  .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 16px; }
  h1 { font-size: 1.4rem; margin: 0 0 4px; }
  h2 { font-size: 1.05rem; }
  .muted { opacity: .75; font-size: .95rem; }
  label { display: block; margin: 14px 0 4px; font-weight: 600; font-size: .95rem; }
  input, select { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; }
  .terms { display: flex; gap: 10px; align-items: flex-start; margin: 18px 0 6px; }
  .terms input { width: auto; margin-top: 3px; }
  button { width: 100%; margin-top: 14px; padding: 12px; border: 0; border-radius: 8px; background: #1a7f37; color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
  button:disabled { background: #9aa0a6; cursor: not-allowed; }
  .call { display: inline-block; margin-top: 8px; font-weight: 600; }
  .detail { background: rgba(26,127,55,.09); border: 1px solid rgba(26,127,55,.35); border-radius: 8px; padding: 14px 16px; margin-top: 12px; }
  .detail div { margin: 4px 0; }
  a { color: inherit; }
  pre { white-space: pre-wrap; font-family: inherit; }
</style>
</head>
<body><div class="wrap">${body}</div></body>
</html>`;
}

function renderPayPage(company, { error } = {}) {
  const methods = paymentMethods(company);
  const phone = company.phoneNumbers[0] || "";
  const note = company.web?.payNote || "";

  const body = `
  <div class="card">
    <h1>${esc(company.name)}</h1>
    <div class="muted">Secure payment page</div>
    ${phone ? `<a class="call" href="tel:${esc(phone)}">📞 Questions? Call us — our assistant answers 24/7</a>` : ""}
    ${note ? `<p class="muted">${esc(note)}</p>` : ""}
  </div>
  <div class="card">
    <h2>Make a payment</h2>
    ${error ? `<p style="color:#c0392b;font-weight:600">${esc(error)}</p>` : ""}
    ${
      methods.length === 0
        ? `<p class="muted">Online payments are not set up yet. Please call us to pay.</p>`
        : `
    <form method="POST" action="/p/${esc(company.id)}/checkout">
      <label for="name">Your full name</label>
      <input id="name" name="name" required autocomplete="name">
      <label for="contact">Phone or email</label>
      <input id="contact" name="contact" required autocomplete="tel">
      <label for="amount">Amount (USD)</label>
      <input id="amount" name="amount" type="number" min="1" step="0.01" placeholder="e.g. 250.00" required>
      <label for="description">What is this payment for?</label>
      <input id="description" name="description" placeholder="e.g. Monthly parking — lot 12" required>
      <label for="method">Payment method</label>
      <select id="method" name="method" required>
        ${methods.map((m) => `<option value="${m.key}">${esc(m.label)}</option>`).join("")}
      </select>
      <div class="terms">
        <input type="checkbox" id="agree" name="agree" value="yes" required>
        <span>I have read and agree to the <a href="/p/${esc(company.id)}/terms" target="_blank">Terms and Conditions</a> of ${esc(company.name)}.</span>
      </div>
      <button id="paybtn" type="submit" disabled>Continue</button>
    </form>
    <script>
      var box = document.getElementById('agree');
      var btn = document.getElementById('paybtn');
      box.addEventListener('change', function () { btn.disabled = !box.checked; });
    </script>`
    }
  </div>`;
  return page(`${company.name} — Pay`, body);
}

function renderManualMethod(company, method, info) {
  const web = company.web || {};
  let title = "";
  let rows = [];

  if (method === "zelle") {
    title = "Pay with Zelle";
    rows = [
      ["Send to", web.zelle.address],
      ["Recipient name", web.zelle.recipientName || company.name],
      ["Amount", `$${info.amount}`],
      ["Memo", info.description],
    ];
  } else if (method === "cashapp") {
    title = "Pay with Cash App";
    rows = [
      ["Cashtag", web.cashAppTag],
      ["Amount", `$${info.amount}`],
      ["Note", info.description],
    ];
  } else if (method === "ach") {
    title = "Pay by ACH / bank transfer";
  }

  const body = `
  <div class="card">
    <h1>${esc(company.name)}</h1>
    <div class="muted">Thank you, ${esc(info.name)} — your terms acceptance has been recorded.</div>
  </div>
  <div class="card">
    <h2>${esc(title)}</h2>
    <div class="detail">
      ${rows.map(([k, v]) => `<div><strong>${esc(k)}:</strong> ${esc(v)}</div>`).join("")}
      ${method === "ach" ? `<pre>${esc(web.achInstructions)}</pre><div><strong>Amount:</strong> $${esc(info.amount)}</div><div><strong>Reference:</strong> ${esc(info.description)}</div>` : ""}
    </div>
    <p class="muted">Please include the memo/reference shown above so we can match your payment. Once sent, your payment will be confirmed by our team.</p>
    <a href="/p/${esc(company.id)}">&larr; Back to payment page</a>
  </div>`;
  return page(`${company.name} — ${title}`, body);
}

function loadTerms(company) {
  const termsPath = path.join(company.dir, "terms.md");
  if (!fs.existsSync(termsPath)) return null;
  return fs.readFileSync(termsPath, "utf8");
}

// Minimal markdown-to-HTML for the terms page (headings, lists, bold, paragraphs).
function markdownToHtml(md) {
  const esc2 = esc;
  return md
    .split(/\n\n+/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (b.startsWith("### ")) return `<h3>${esc2(b.slice(4))}</h3>`;
      if (b.startsWith("## ")) return `<h2>${esc2(b.slice(3))}</h2>`;
      if (b.startsWith("# ")) return `<h1>${esc2(b.slice(2))}</h1>`;
      if (b.split("\n").every((l) => l.trim().startsWith("- "))) {
        const items = b.split("\n").map((l) => `<li>${esc2(l.trim().slice(2))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${esc2(b).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("\n");
}

webpay.get("/p/:companyId", (req, res) => {
  const company = findCompanyById(req.params.companyId);
  if (!company) return res.status(404).send(page("Not found", "<div class='card'><h1>Page not found</h1></div>"));
  res.send(renderPayPage(company));
});

webpay.get("/p/:companyId/terms", (req, res) => {
  const company = findCompanyById(req.params.companyId);
  if (!company) return res.status(404).send(page("Not found", "<div class='card'><h1>Page not found</h1></div>"));
  const terms = loadTerms(company);
  const body = `<div class="card"><h1>${esc(company.name)} — Terms and Conditions</h1>${
    terms ? markdownToHtml(terms) : "<p>Terms and conditions have not been published yet. Please contact us.</p>"
  }</div>`;
  res.send(page(`${company.name} — Terms`, body));
});

webpay.post("/p/:companyId/checkout", async (req, res) => {
  const company = findCompanyById(req.params.companyId);
  if (!company) return res.status(404).send(page("Not found", "<div class='card'><h1>Page not found</h1></div>"));

  const { name, contact, method, description } = req.body;
  const amount = Number(req.body.amount);
  const methods = paymentMethods(company).map((m) => m.key);

  // Server-side enforcement: no terms acceptance, no payment details.
  if (req.body.agree !== "yes") {
    return res.status(400).send(renderPayPage(company, { error: "You must accept the Terms and Conditions to continue." }));
  }
  if (!name || !contact || !description || !Number.isFinite(amount) || amount <= 0 || !methods.includes(method)) {
    return res.status(400).send(renderPayPage(company, { error: "Please fill in all fields with a valid amount." }));
  }
  const maxAmount = company.payments?.maxAmountDollars || 10000;
  if (amount > maxAmount) {
    return res.status(400).send(renderPayPage(company, { error: `Online payments are limited to $${maxAmount}. Please call us for larger payments.` }));
  }

  const info = { name, contact, method, amount: amount.toFixed(2), description };
  recordAcceptance(company, req, {
    payerName: name,
    payerContact: contact,
    method,
    amount: info.amount,
    description,
  });

  if (method === "card") {
    try {
      const provider = availableProviders(company)[0];
      const url = await createPaymentLink(company, provider, amount, `${description} — ${name}`);
      return res.redirect(303, url);
    } catch (err) {
      console.error(`Web checkout failed for ${company.id}: ${err.message}`);
      return res.status(502).send(renderPayPage(company, { error: "Card checkout is temporarily unavailable. Please try another method or call us." }));
    }
  }

  res.send(renderManualMethod(company, method, info));
});
