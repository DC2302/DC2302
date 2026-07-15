# Lobos Permian Basin Lead Finder

A small tool that finds companies who are **about to need facility
construction work** in the Permian Basin — tank batteries, compressor
stations, saltwater disposal facilities, pipeline trenching and
tie-ins — and turns them into a ranked call list.

## The idea

Before anyone builds a tank battery or an SWD, they file **public
permits** with the state. So instead of cold-calling blindly:

- A company that just pulled **drilling permits** (Form W-1 in Texas,
  C-101 in New Mexico) has new wells coming — each one needs a tank
  battery, flowlines, and hookups within a few months.
- A company that filed a **saltwater-disposal permit application**
  (Form W-14) is literally about to build an SWD facility — pad,
  tanks, pumps, and water-gathering pipeline. That's a whole project.

This tool pulls those permits from the public state systems, groups
them by company, scores them (SWD applications count 4x a drilling
permit), and writes a call sheet with a talking point for each one.

## Quick start

You need Python 3.9+ installed. Then, in this folder:

```bash
pip install -r requirements.txt

# First run: see what the output looks like using bundled sample data
python run.py --demo

# Real run: pull live permit data (takes several minutes — the tool
# is deliberately slow so it doesn't hammer the state websites)
python run.py
```

Results land in the `output/` folder:

| File | What it is |
|---|---|
| `leads.xlsx` | **The main one.** Excel workbook: ranked leads with blank Phone / Contact / Call-notes columns to fill in as you work the list (SWD leads highlighted yellow), plus a raw-permits tab |
| `call_sheet.md` | Who to call, ranked, with a talking point each |
| `leads.csv` | Same list as plain CSV |
| `permits_raw.csv` | Every raw permit record, if you want details |

**To use it in Google Sheets:** go to [sheets.google.com](https://sheets.google.com),
open a blank sheet, then **File → Import → Upload** and drop `leads.xlsx`
in. Formatting and both tabs come across.

Useful options:

```bash
python run.py --days 14                      # only the last 2 weeks of drilling permits
python run.py --counties MIDLAND MARTIN      # focus the Texas search
python run.py --skip nm-ocd                  # Texas only
python run.py --top 50                       # longer call sheet
```

## Email setup (send results to your team automatically)

`python run.py --email` sends `leads.xlsx` + the call sheet to a list
of addresses after every run. One-time setup:

1. Copy `email_config.example.json` to `email_config.json` (same folder).
2. Put your Gmail address in `username` and list everyone who should
   get the leads under `recipients` (as many addresses as you want).
3. Get a Gmail **app password** (your normal password won't work):
   - Google Account → Security → turn on **2-Step Verification** if
     it isn't already
   - then Security → **App passwords** (or go to
     <https://myaccount.google.com/apppasswords>)
   - create one named "lobos leads", and paste the 16-character code
     into `app_password`.
4. Run `python run.py --demo --email` once to test — everyone on the
   list should get the sample spreadsheet.

`email_config.json` stays on your computer and is ignored by git, so
the password never ends up on GitHub. To change who gets the leads,
just edit the `recipients` list.

## Where the data comes from

| Source | What it gives us | Link |
|---|---|---|
| Texas RRC drilling permit (W-1) query | New wells coming in RRC districts 08 / 8A / 7C | <https://webapps.rrc.texas.gov/DP/initializePublicQueryAction.do> |
| Texas RRC injection/disposal (UIC) query | SWD facilities about to be built | <https://webapps2.rrc.texas.gov/EWA/uicQueryAction.do> |
| New Mexico OCD permitting data | Delaware Basin (Lea & Eddy County) drilling permits | <https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Permits.aspx> |

All of it is public record. The tool waits ~3 seconds between page
requests and retries gently — the RRC explicitly warns that aggressive
scraping gets sessions cut off, so keep it that way. Running it once
a day or once a week is plenty; permits don't move faster than that.

## Getting a phone number for a lead

1. **Texas operators** — every active operator registers with the RRC
   (Form P-5), and the registration includes an address and phone
   number. Look them up here:
   <https://webapps2.rrc.texas.gov/EWA/organizationQueryAction.do>
2. **New Mexico operators** — OCD operator lookup:
   <https://wwwapps.emnrd.nm.gov/ocd/ocdpermitting/Data/Operators.aspx>
3. **Who to ask for:** the *facilities engineering* or *construction*
   group — not drilling. On LinkedIn, search the company name plus
   "facilities engineer", "construction superintendent", or
   "production superintendent".

## Beyond the scraper — other ways to catch this work

- **Get on vendor lists.** Most Permian operators require contractors
  to be registered in **ISNetworld** (and sometimes Avetta or Veriforce)
  before they can bid. If Lobos isn't in ISN yet, that's the single
  biggest unlock — many operators won't call you without it.
- **Water midstream companies** (WaterBridge, NGL Water Solutions,
  Goodnight Midstream, Deep Blue, etc.) build SWDs constantly and hire
  facility constructors year-round. They show up at the top of this
  tool's SWD rankings for a reason.
- **Permian Basin Petroleum Association (PBPA)** membership puts you in
  the room with operator facilities teams.
- Watch each top lead's website for a "suppliers/vendors" registration
  page and get registered before you call.

## Troubleshooting

- **"Could not locate the ... fields" or a source FAILED** — the state
  site changed its page layout, or is temporarily down. The tool keeps
  going with the other sources. You can also pull the same list
  manually in a browser (links above — the query pages let you filter
  by county and date, and download results), then continue calling off
  that.
- **Nothing comes back at all** — check your internet connection, and
  try `python run.py --demo` to confirm the tool itself is fine.
- **Blocked / cut off** — you ran it too often. Once a day is plenty.

## Folder map

```
run.py                     the command you run
lobos_leads/counties.py    which counties count as "Permian" (edit to taste)
lobos_leads/sources/       one module per state data source
lobos_leads/leads.py       grouping + scoring logic
lobos_leads/report.py      writes the call sheet and CSVs
sample_data/               demo data for --demo mode
output/                    results (not committed to git)
```
