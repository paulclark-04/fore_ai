from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

SCORING_MODEL = "gemini-2.5-flash"
SCORING_PROVIDER = "google"

MAX_LEADS_PER_SEARCH = 100
