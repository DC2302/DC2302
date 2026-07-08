# Where should the training materials live: GitHub or Google Drive?

**Recommendation: GitHub as the source of truth, with an optional Google
Drive sync for clients who aren't comfortable with GitHub.** That hybrid is
exactly how this project is set up.

## Why GitHub wins as the source of truth

1. **The agent reads files directly.** The knowledge folders live in the
   same repository as the code, so the deployed server just reads them from
   disk — no API calls, no auth tokens, no rate limits, no extra latency on
   a live phone call. Drive would require an API round-trip or a cache layer.

2. **Version control = accountability.** Every change to what the agent is
   allowed to tell callers is a commit: you can see who changed what and
   when, review it before it goes live, and instantly roll back a bad edit.
   With Drive, a client can silently change a price or policy and you find
   out when the agent says it on a call.

3. **Plain text (Markdown) is the ideal format for an LLM.** Google Docs
   need to be exported/converted; Markdown goes straight into the prompt.

4. **Deployment is automatic.** Push to GitHub → your hosting platform
   (Render, Railway, Fly.io) redeploys → the agent immediately answers from
   the updated materials. No sync jobs to babysit.

5. **Free and simple.** No Google Cloud project, service accounts, or API
   quotas needed for the core service.

## Where Google Drive is genuinely better

- **Non-technical clients.** Most small-business owners can edit a Google
  Doc; very few will edit a Markdown file on GitHub.
- **Existing materials.** Clients often already have their FAQ/pricing docs
  in Drive.

## The hybrid setup (what this project does)

- GitHub holds `companies/<client>/knowledge/` — the only thing the agent
  ever reads.
- Clients who want Drive get a shared Drive folder. When they update it,
  run `npm run sync:gdrive -- <driveFolderId> <companyId>` (or schedule it),
  review the diff, commit, and push.
- You keep the review/rollback safety of git; clients keep the editing
  experience of Drive.

## One caveat about a shared repository

Knowledge folders in a GitHub repo are visible to anyone with repo access.
Client materials are usually not secret (hours, prices, FAQs), but if a
client ever needs confidential material, use a **private repo** (this is a
must anyway) and consider one private repo per client if strict isolation
between clients matters.
