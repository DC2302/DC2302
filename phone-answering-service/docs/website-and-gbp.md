# Putting it on the website and Google Business Profile

Every company gets a hosted payment page at:

```
https://YOUR-SERVER/p/<companyId>          e.g. /p/cadd-truck-parking
https://YOUR-SERVER/p/<companyId>/terms    that company's terms & conditions
```

The page shows every payment method enabled in the company's `company.json`
— card checkout (Square/Stripe), Zelle, Cash App, and ACH — and **nothing is
payable until the customer checks the Terms and Conditions box**. The
checkbox is enforced in the browser AND on the server, and every acceptance
is recorded (name, contact, method, amount, timestamp, IP address, terms
version) in `data/<companyId>-terms-acceptances.jsonl` and posted to the
company's CRM webhook as a `terms.accepted` event. That record is your proof
of agreement.

## Zelle / Cash App / ACH — how they work here

Zelle and Cash App have no public checkout API, and ACH by bank details is a
manual transfer — so the page reveals the company's payment details (Zelle
address, $Cashtag, bank instructions) **only after** the customer accepts
the terms and submits their name, contact, amount, and reason. You get a
CRM event for every submission, so you can match incoming transfers to who
promised them. Card payments redirect straight to Square/Stripe checkout.

Configure per company in `company.json` → `web`:

```json
"web": {
  "termsVersion": "1.0",
  "payNote": "Monthly parking payments are due on the 1st.",
  "zelle": { "recipientName": "CADD Truck Parking", "address": "payments@..." },
  "cashAppTag": "$CADDTruckParking",
  "achInstructions": "Bank name: ...\nRouting number: ...\nAccount number: ..."
}
```

Leave any entry empty/out to hide that method. Terms live in
`companies/<companyId>/terms.md`; bump `termsVersion` whenever they change.

## Website integration

1. **Phone**: publish the company's Twilio number everywhere — the AI
   answers it 24/7. Add a click-to-call button:
   `<a href="tel:+15551234567">Call us — we answer 24/7</a>`
2. **Payments**: link or button to the payment page:
   `<a href="https://YOUR-SERVER/p/cadd-truck-parking">Make a payment</a>`
   You can also embed it with an iframe if the site builder allows it.
3. **Terms**: link the terms page in the site footer.

## Google Business Profile integration

GBP doesn't run custom code, so the integration is links and the number:

1. **Phone number** → set the profile's primary phone to the company's
   Twilio number. Every "call" click from Google Search/Maps reaches the AI
   agent. (If the business wants to keep its published number, forward that
   number to the Twilio number instead.)
2. **Website / appointment links** → GBP lets you add links; point the
   appointment or booking link at the payment page (or the site's payment
   section). You can also post the payment link in GBP "Updates" posts.
3. **Attributes** → in some categories GBP shows accepted payment types;
   list card, Zelle, Cash App, ACH there for visibility.

## Replicating for a new customer

Nothing here is CADD-specific. For each new customer: fill in the `web`
block and `terms.md` in their company folder, push, and their payment page
exists at `/p/<their-id>` immediately — then drop the link into their site
and GBP. Same checklist as [onboarding-a-new-client.md](onboarding-a-new-client.md).
