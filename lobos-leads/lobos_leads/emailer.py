"""Email the results to a list of recipients.

Configured by email_config.json in the project folder (copy
email_config.example.json and fill it in). Uses plain SMTP so it
works with a regular Gmail account -- you just need an "app
password" (see the README's Email setup section; your normal Gmail
password will NOT work and should never go in this file).
"""

import json
import mimetypes
import smtplib
from email.message import EmailMessage
from pathlib import Path

CONFIG_NAME = "email_config.json"

EXAMPLE_CONFIG = {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "username": "you@gmail.com",
    "app_password": "PASTE-16-CHARACTER-APP-PASSWORD-HERE",
    "from_name": "Lobos Lead Finder",
    "recipients": [
        "you@gmail.com",
        "someone-else@example.com"
    ],
    "subject": "Permian Basin facility-construction leads"
}


def load_config(project_dir: Path) -> dict:
    path = project_dir / CONFIG_NAME
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found. Copy email_config.example.json to "
            f"{CONFIG_NAME}, fill in your Gmail address, app password, "
            "and the recipient list, then re-run. Setup steps are in the "
            "README under 'Email setup'."
        )
    config = json.loads(path.read_text(encoding="utf-8"))
    missing = [
        k for k in ("username", "app_password", "recipients")
        if not config.get(k)
    ]
    if missing or "PASTE-16-CHARACTER" in config.get("app_password", ""):
        raise ValueError(
            f"{CONFIG_NAME} is not filled in yet "
            f"(missing/placeholder: {', '.join(missing) or 'app_password'})."
        )
    if isinstance(config["recipients"], str):
        config["recipients"] = [config["recipients"]]
    return config


def build_message(config: dict, subject_date: str, body: str,
                  attachments: list) -> EmailMessage:
    msg = EmailMessage()
    from_name = config.get("from_name", "Lobos Lead Finder")
    msg["From"] = f"{from_name} <{config['username']}>"
    msg["To"] = ", ".join(config["recipients"])
    msg["Subject"] = (
        f"{config.get('subject', 'Permian Basin leads')} -- {subject_date}"
    )
    msg.set_content(body)

    for path in attachments:
        path = Path(path)
        if not path.exists():
            continue
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        maintype, subtype = ctype.split("/", 1)
        msg.add_attachment(
            path.read_bytes(), maintype=maintype, subtype=subtype,
            filename=path.name,
        )
    return msg


def send(config: dict, msg: EmailMessage):
    with smtplib.SMTP(
        config.get("smtp_host", "smtp.gmail.com"),
        int(config.get("smtp_port", 587)),
        timeout=60,
    ) as smtp:
        smtp.starttls()
        smtp.login(config["username"], config["app_password"])
        smtp.send_message(msg)


def email_results(project_dir: Path, out_dir: Path, leads: list,
                  demo: bool = False) -> list:
    """Send leads.xlsx + call_sheet.md to everyone in the config.
    Returns the recipient list."""
    from datetime import date

    config = load_config(project_dir)

    top = "\n".join(
        f"  {i}. {lead['operator']}  "
        f"({lead['drilling_permits']} drilling / {lead['swd_permits']} SWD "
        f"permits -- {', '.join(lead['counties'][:3])})"
        for i, lead in enumerate(leads[:10], 1)
    )
    body = (
        ("*** DEMO DATA -- sample run, not live permits ***\n\n" if demo else "")
        + "Fresh Permian Basin facility-construction leads are attached.\n\n"
        + "Top 10 this run:\n" + top + "\n\n"
        + "Open leads.xlsx for the full ranked list with talking points\n"
        + "(SWD leads highlighted), or import it into Google Sheets via\n"
        + "File > Import > Upload.\n\n"
        + "-- Lobos lead finder\n"
    )

    msg = build_message(
        config,
        subject_date=date.today().strftime("%B %d, %Y"),
        body=body,
        attachments=[out_dir / "leads.xlsx", out_dir / "call_sheet.md"],
    )
    send(config, msg)
    return config["recipients"]
