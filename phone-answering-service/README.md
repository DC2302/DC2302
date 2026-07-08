# AI Phone Answering Service

A multi-tenant phone answering service: one server answers calls for **all of
your clients**. Twilio receives the call, the dialed number decides which
company is being called, and a Claude-powered agent answers the caller using
**only that company's training materials** — the files in
`companies/<company>/knowledge/`.

```
Caller dials client's number
        │
        ▼
     Twilio  ──(speech-to-text)──►  this server  ──►  Claude (reads the
        ▲                                │             company's knowledge
        └──────(text-to-speech)──────────┘             folder and replies)
                                          │
                                          └──► CRM webhook (call transcript
                                               logged when the call ends)
```

## How each client is set up

Every client is just a folder:

```
companies/
  example-company/
    company.json        ← name, phone number(s), greeting, CRM webhook
    knowledge/          ← training materials the agent answers from
      faq.md
      services-and-pricing.md
      hours-and-location.md
```

To onboard a new client: copy `example-company`, edit `company.json`, drop
their materials into `knowledge/`, push, done. The agent only ever answers
from the folder belonging to the number that was dialed — clients never
bleed into each other.

Training materials can be updated on GitHub directly, or synced from a
client's Google Drive folder — see
[docs/github-vs-google-drive.md](docs/github-vs-google-drive.md) for the
trade-offs and the recommended hybrid approach.

## Setup

### 1. Accounts you need

- **Anthropic** — https://console.anthropic.com → create an API key.
- **Twilio** — https://console.twilio.com → buy one phone number per client
  (about $1.15/month each).
- **A host for this server** — Render, Railway, or Fly.io all work; you need
  a public HTTPS URL. (For testing, [ngrok](https://ngrok.com) works too.)

### 2. Configure and run

```bash
cd phone-answering-service
npm install
cp .env.example .env    # then fill in your keys
npm start
```

### 3. Point Twilio at the server

For each Twilio phone number, in the Twilio console under
**Phone Numbers → Manage → Active numbers → (the number) → Voice
Configuration**:

- **A call comes in** → Webhook → `https://YOUR-SERVER/voice` (HTTP POST)
- **Call status changes** → `https://YOUR-SERVER/call-status` (HTTP POST)

Then add that number to the matching company's `company.json`
(`"phoneNumbers": ["+1555..."]`) and restart or `POST /admin/reload`.

### 4. Test it

Call the number. You should hear the company greeting; ask something that's
in the knowledge folder.

## CRM integration

When a call ends, the server POSTs a JSON payload (caller number, timestamps,
full transcript) to the company's `crmWebhookUrl`. Point that at:

- **GoHighLevel** — an Inbound Webhook trigger in a workflow
- **HubSpot / Zoho** — a webhook-triggered workflow
- **Anything else** — a Zapier or Make webhook, then map fields to your CRM

Leave `crmWebhookUrl` empty to disable.

## Costs (rough, per client)

- Twilio number: ~$1.15/month + ~$0.017/min for inbound calls
- Twilio speech recognition: ~$0.02/15s of caller speech
- Claude (Haiku): typically well under a cent per exchange
- A hobby-tier host: $0–7/month total (shared across all clients)

## Roadmap ideas

- Message-taking that creates a structured lead (name/number/reason) in the CRM
- Appointment booking against a calendar
- Real-time voice (Twilio Media Streams + a streaming voice model) for
  lower-latency, more natural conversations
- A simple web dashboard for clients to view their call transcripts
