# Trap Patterns — Scoring Pitfalls Discovered Through Feedback

> This file grows with each RLHF cycle. New traps are added when scoring errors are detected.

---

## CTO Trap (Aerospace/Manufacturing)
- **Example**: Cornelius Waidelich — "Transformation Leader Airbus CTO"
- **What it looks like**: Senior tech title at major company
- **What it actually is**: Physical product technology (wings, airframes)
- **Rule**: At aerospace/manufacturing companies, always check descriptions for hardware keywords before scoring CTO/CXO titles
- **Discovered**: Initial calibration

## "Digital Fraud" Trap
- **Example**: Daryouche Khodai — "Cybersecurity & Digital Fraud" at BNP Paribas
- **What it looks like**: "Digital" in title suggests digital transformation
- **What it actually is**: Security operations (fraud detection, cyber defense)
- **Rule**: If title has "digital" + any of (fraud, cyber, security, sécurité), skip digital transformation scoring entirely
- **Discovered**: Initial calibration

## Content Quality Trap
- **Example**: Marion Mélin-Weiss — "Head of Group Content – Quality, Responsibility & AI Enablement" at Veepee
- **What it looks like**: Senior "Quality" title with AI mentions
- **What it actually is**: Content/editorial quality (product catalogs, media descriptions), not software QA
- **Rule**: "Quality" in content/catalog/editorial context = C tier max. Content quality ≠ software testing.
- **Discovered**: Veepee batch

## Revenue Product Owner Trap
- **Example**: Christine LU AYEL — "Product Owner (Revenue Management & Billing)" at Veepee
- **What it looks like**: Product Owner title (normally relevant)
- **What it actually is**: Revenue management/billing function (commercial, not engineering)
- **Rule**: PO + 2+ revenue/billing/pricing keywords = D tier. Title doesn't override commercial domain.
- **Discovered**: Veepee batch

## "Innovation de l'Offre" Trap (Retail)
- **Example**: Benoit MAZEREEUW — "Directeur de l'Offre... innovation de l'Offre" at Boulanger
- **What it looks like**: Innovation director
- **What it actually is**: Product assortment/category innovation, not tech/IT innovation
- **Rule**: At retail companies, "innovation" alone is too common. Require STRONG tech signals: startup scouting, POC, partnerships with tech, veille technologique
- **Discovered**: Boulanger batch

## "Commerce Digital" Trap
- **Example**: Karim Menni — "Directeur Commerce Digital" at Boulanger
- **What it looks like**: "Digital" director
- **What it actually is**: E-commerce revenue strategy (business role)
- **Rule**: "Commerce Digital" = commercial role managing online sales. Not software engineering. D tier.
- **Discovered**: Boulanger batch

## Former Employee Trap
- **Example**: Jerome Blache — "Lead QA" formerly at Veepee
- **What it looks like**: Perfect QA title
- **What it actually is**: Person no longer works at the searched company
- **Rule**: ALWAYS verify current employer matches searched company. Former employee = D tier regardless of title quality.
- **Discovered**: Veepee batch

## Empty Profile Trap
- **Example**: Farida MERZOUGUI at Veepee
- **What it looks like**: Employee at target company
- **What it actually is**: No title, no description, no experience data
- **Rule**: Never invent a persona from company context alone. Empty profile = D tier.
- **Discovered**: Veepee batch

## Past ESN Employer Trap
- **Example**: Guillaume Tronche — past employer Acial/Vision IT Group (ESN)
- **What it looks like**: ESN firm in work history triggers consultant penalty
- **What it actually is**: Past employer, not current. Person has been at end-client for 11 years.
- **Rule**: Only check CURRENT employer against ESN list. Past ESN is fine if person now works at end-client with long tenure.
- **Discovered**: Initial calibration

## VP vs C-Level Substring Trap
- **Example**: Jeremy Signoret — "Vice-President Technical PO/PM"
- **What it looks like**: "President" in title triggers C-Level detection
- **What it actually is**: VP-level role (Vice-President), not President/C-Level
- **Rule**: Check VP FIRST, then C-Level. Use word boundaries for "president" to avoid matching "vice-president".
- **Discovered**: Initial calibration

## Headline vs Current Role Mismatch Trap
- **Example**: Jules Viron — Headline says "Responsable marketing digital" but current role is "Product Owner Squad Tunnels de transformation" with a dev squad (developers, analysts) in agile/scrum
- **What it looks like**: Marketing role (anti-persona)
- **What it actually is**: Technical PO managing a cross-functional squad with developers, working on web transformation tunnels
- **Rule**: NEVER score based on LinkedIn headline alone. Always check the most recent job title and description from enrichment data. Headlines can be outdated or misleading — the actual current role description is what matters.
- **Discovered**: CA Personal Finance & Mobility batch

## "Conversion Tunnel" Product Manager Trap
- **Example**: Tony ALLAIRE — "Product Manager Digital" focused on "tunnels de conversion" and optimizing digital customer journeys
- **What it looks like**: Digital PM owning web applications (Primary Buyer)
- **What it actually is**: Growth/conversion optimization role — cares about A/B testing, analytics, UX funnels, not about whether the login flow has a regression bug
- **Rule**: "Tunnels de conversion" + "optimiser les parcours" = growth/marketing signal, NOT QA signal. B-tier Sponsor max (~76) unless profile explicitly mentions software delivery keywords (recette, homologation, mise en production, backlog technique).
- **Discovered**: CA Personal Finance & Mobility batch

## Past QA Experience Inflation Trap
- **Example**: Laurine Causse — Current title "Product Manager - Data" but scored 88 (A-tier Primary Buyer) because a PAST role mentioned managing testers and UAT
- **What it looks like**: Primary Buyer with QA ownership
- **What it actually is**: Someone who USED to be adjacent to QA but now works in a different domain (data)
- **Rule**: If current title has NO QA/testing keywords, past QA experience can add at most +10 to the score and CANNOT promote someone to Primary Buyer category. They remain scored based on their current role. "Current role trumps past history" must be enforced strictly — not just stated.
- **Discovered**: CA Personal Finance & Mobility batch
