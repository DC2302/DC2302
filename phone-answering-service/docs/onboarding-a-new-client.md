# Onboarding a new client (no new repo needed)

**You do NOT create a new repository per client.** One private repo runs the
whole service; each client is a folder under `companies/`. A new repo per
client would mean a new deployment, new hosting bill, and new maintenance
burden for every customer — a folder is a two-minute copy instead, and the
agent for one company can never see another company's materials because it
only ever reads the folder matched to the number that was dialed.

(The only reason to split a client into its own repo later is contractual —
e.g. a client demands their documents live in storage you both control
separately. The code supports that too: you'd deploy a second copy of this
service pointed at their repo. Don't do this until a client forces it.)

## Checklist for each new client

Using CADD Truck Parking as the example:

1. **Copy the folder** — duplicate `companies/example-company` to
   `companies/cadd-truck-parking`.

2. **Buy them a Twilio number** (~$1.15/month) and put it in
   `company.json` → `phoneNumbers`. In the Twilio console, point the
   number's webhooks at your server (`/voice` and `/call-status`).
   If they already have a business number, forward it to the Twilio number.

3. **Fill in `company.json`:**
   - `greeting` — how the agent answers, in the client's voice
   - `voice` — the text-to-speech voice (Twilio's Polly voices)
   - `transferNumber` — where "let me talk to a human" goes (optional)
   - `notify.smsNumbers` — who gets texted when a caller books a callback
     (this is your "notify the responsible party")
   - `crmWebhookUrl` — where call transcripts and leads get posted
   - `payments` — enable Square and/or Stripe (see below)

4. **Drop their training materials into `knowledge/`** as Markdown files.
   This controls *what the agent knows*; the greeting/voice/system rules
   control *how it says it*. The agent refuses to answer anything not in
   these files — so the fastest way to make it smarter is to add more files.

5. **Payments (optional):** get the client's Square access token + location
   ID (Square Developer dashboard) or Stripe secret key. Put them in the
   server's environment variables — NOT in the repo — and reference the
   variable names in `company.json`:

   ```json
   "payments": {
     "providers": ["square", "stripe"],
     "squareAccessTokenEnv": "SQUARE_ACCESS_TOKEN_CADD",
     "squareLocationIdEnv": "SQUARE_LOCATION_ID_CADD",
     "stripeSecretKeyEnv": "STRIPE_SECRET_KEY_CADD",
     "currency": "USD",
     "maxAmountDollars": 2000
   }
   ```

   With this set, the agent can confirm an amount with the caller, ask
   whether they prefer Square or Stripe, and text them a secure checkout
   link. It never takes card numbers over the phone, and it can't exceed
   `maxAmountDollars`.

6. **Push, then test-call the number.** Ask something from the knowledge
   folder, ask for a callback, and (in test mode keys) ask to pay — verify
   the notification text and the payment link arrive.

## What happens on every call, automatically

- Questions → answered strictly from that client's `knowledge/` folder
- "Can someone call me back?" → lead saved to `data/<client>-leads.jsonl`,
  texted to `notify.smsNumbers`, and posted to the CRM webhook — the lead
  is never lost
- "I'm ready to pay" → payment link created (Square or Stripe, caller's
  choice) and texted to the caller
- Call ends → full transcript + every action taken posted to the CRM webhook
