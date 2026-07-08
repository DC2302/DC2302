import crypto from "node:crypto";

/**
 * Creates a payment link with Stripe or Square and returns its URL, which
 * the agent then texts to the caller. The agent never takes card numbers
 * over the phone — the caller pays securely on the provider's page.
 *
 * Per-client keys live in environment variables, NOT in company.json (which
 * is committed to git). Each company's company.json says which env var
 * holds its key, e.g.:
 *
 *   "payments": {
 *     "providers": ["square", "stripe"],
 *     "stripeSecretKeyEnv": "STRIPE_SECRET_KEY_CADD",
 *     "squareAccessTokenEnv": "SQUARE_ACCESS_TOKEN_CADD",
 *     "squareLocationIdEnv": "SQUARE_LOCATION_ID_CADD",
 *     "currency": "USD",
 *     "maxAmountDollars": 2000
 *   }
 */

const SQUARE_API_VERSION = "2024-06-04";

function env(name) {
  return (name && process.env[name]) || "";
}

/** Which providers this company can actually use right now (configured AND key present). */
export function availableProviders(company) {
  const p = company.payments || {};
  const providers = [];
  for (const provider of p.providers || []) {
    if (provider === "stripe" && env(p.stripeSecretKeyEnv)) providers.push("stripe");
    if (provider === "square" && env(p.squareAccessTokenEnv) && env(p.squareLocationIdEnv)) {
      providers.push("square");
    }
  }
  return providers;
}

export async function createPaymentLink(company, provider, amountDollars, description) {
  const p = company.payments || {};
  const currency = (p.currency || "USD").toLowerCase();
  const amountCents = Math.round(amountDollars * 100);

  if (provider === "stripe") {
    return createStripeLink(env(p.stripeSecretKeyEnv), amountCents, currency, description);
  }
  if (provider === "square") {
    return createSquareLink(
      env(p.squareAccessTokenEnv),
      env(p.squareLocationIdEnv),
      amountCents,
      currency,
      description
    );
  }
  throw new Error(`Unknown payment provider: ${provider}`);
}

async function createStripeLink(secretKey, amountCents, currency, description) {
  const headers = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Stripe payment links need a price object, so create an ad-hoc one first.
  const priceRes = await fetch("https://api.stripe.com/v1/prices", {
    method: "POST",
    headers,
    body: new URLSearchParams({
      currency,
      unit_amount: String(amountCents),
      "product_data[name]": description,
    }),
  });
  const price = await priceRes.json();
  if (!priceRes.ok) throw new Error(`Stripe price error: ${price.error?.message}`);

  const linkRes = await fetch("https://api.stripe.com/v1/payment_links", {
    method: "POST",
    headers,
    body: new URLSearchParams({
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
    }),
  });
  const link = await linkRes.json();
  if (!linkRes.ok) throw new Error(`Stripe link error: ${link.error?.message}`);
  return link.url;
}

async function createSquareLink(accessToken, locationId, amountCents, currency, description) {
  const res = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_API_VERSION,
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      quick_pay: {
        name: description,
        price_money: { amount: amountCents, currency: currency.toUpperCase() },
        location_id: locationId,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Square link error: ${data.errors?.[0]?.detail || res.status}`);
  }
  return data.payment_link.url;
}
