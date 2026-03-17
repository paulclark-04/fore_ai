# Anti-Personas, Red Flags & Reference Lists

## ESN Firms (French IT Consulting Companies)

Consultants at these firms have ZERO budget authority at client sites. Only check CURRENT employer — past ESN employment is OK if person now works at an end-client with long tenure.

```
capgemini, sopra steria, sopra, steria, atos, cgi, altran, alten, accenture,
devoteam, aubay, tcs, tata consultancy, infosys, wipro, cognizant, smile,
sqli, groupe open, sword, inetum, logica, assystem, akka, sogeti,
bearingpoint, bearing point, wavestone, sia partners, mckinsey, bain,
boston consulting, bcg, deloitte, kpmg, ey, ernst & young, pwc,
pricewaterhouse, roland berger, oliver wyman, onepoint, octo technology,
octo, xebia, publicis sapient, zenika, theodo, davidson, bemore, vision it,
acial, modis, adecco, hays, michael page, randstad, manpower, niji,
thales services, econocom, open groupe, gfi
```

---

## Elite French Engineering Schools (+5 education bonus)

```
polytechnique, x -, l'x, telecom paris, télécom paris, centrale, mines,
enseeiht, ensimag, ensae, ensta, insa, utbm, utc, utt, epitech, epita,
supelec, isep, edhec, essec, hec, cesi
```

---

## Red Flag Keywords

### Non-Software QA (check title + descriptions) → -30 penalty
```
manufacturing quality, qualité industrielle, supply chain quality,
call center quality, document control, contrôle documentaire,
qualité produit, product quality, qualité fournisseur, supplier quality,
lean manufacturing, six sigma manufacturing, qualité process,
qualité production, production quality, quality inspector
```

### Cybersecurity/Fraud (check headline + current title ONLY, NOT descriptions) → -30 penalty
```
cybersecurity, cybersécurité, csirt, soc analyst, incident response,
fraud, fraude, threat intelligence, penetration test, ethical hacking,
siem, intrusion detection, malware, digital forensics,
vulnerability assessment, security operations
```

### Compliance/Audit → -25 penalty
```
aml analyst, kyc quality, audit manager, risk controls,
conformité réglementaire, regulatory compliance,
anti-money laundering, internal audit, audit interne, contrôle interne,
risque et conformité, risk management, gestion des risques,
responsable conformité, compliance manager, risk & compliance
```

### Hardware/Physical Engineering (check title AND descriptions) → -20 to -30 penalty
```
airframe, wing equip, aile, fuselage, engine design, moteur,
manufacturing engineer, ingénierie de production, plant management,
assembly line, ligne d'assemblage, mécanique, mechanical engineer,
hydraulique, tolerancing, outillage, aérodynamique, aerodynamics,
structural engineer, metallurg, tooling engineer, wing manufacturing
```

### Obviously Irrelevant Titles (auto-skip, use rules score only)
```
human resources, talent acquisition, brand manager, content manager,
copywriter, community manager, social media manager, graphic designer,
art director, creative director, general counsel, legal director,
chief financial officer, financial controller, accountant, treasurer,
public relations, facilities manager, purchasing manager, procurement manager,
médecin, infirmier, pharmacien, hse manager
```

### Commercial/CX "Digital" Roles (NOT software engineering)
```
commerce digital, directeur commerce, responsable commerce,
expérience client, satisfaction client, expérience et exploitation,
expérience digitale, directeur offre, directrice offre, responsable offre,
business owner satisfaction, business unit director
```

### Revenue-Focused Roles (NOT software QA)
```
revenue growth, croissance du chiffre, conversion rate, taux de conversion,
monetis, monétis, p&l (in commercial context), ltv, arpu,
acquisition funnel, upsell, cross-sell, churn reduction,
subscription revenue, revenu abonnement
```

---

## Positive Signal Keywords

### Direct QA/Test Titles (strongest match → 35-40 persona points)
```
qa, quality assurance, quality engineering, qualité logicielle,
software quality, test automation, test manager, testing manager,
recette, homologation, validation logicielle, release manager,
release management, assurance qualité
```

### DevOps/Pipeline (→ 24-36 persona points)
```
devops, ci/cd, ci cd, continuous integration, continuous delivery,
continuous deployment, platform engineering, site reliability, sre
```

### Software Context (validates ambiguous titles)
```
software, logiciel, web, mobile, application, saas, platform, api,
frontend, backend, full stack, cloud, development, it, informatique,
digital, numérique, microservice, agile, scrum, ci/cd, devops,
e-commerce, e-banking, release, pipeline, testing, automation,
data engineering, data science, machine learning, mlops
```

### QA Automation Tools (buying signal → +5 points)
```
selenium, cypress, playwright, hp qtp, loadrunner, junit, pytest,
cucumber, robot framework, appium, katalon, testcomplete, tosca,
testrail, xray, zephyr, sonarqube, mabl, testrigor, browserstack
```

### Buying Signals in Descriptions
```
test automation, test strategy, release management, ci/cd, regression,
bottleneck, legacy, migration, modernization, transformation digitale,
user journey, e2e, end-to-end, agile testing, shift left,
test coverage, startup, poc, proof of concept, pilot, innovation
```

### Innovation/Startup Scout (can override vertical mismatch)
```
startup, scouting, partnerships with tech, innovation, poc,
proof of concept, pilot, veille technologique, incubat, accelerat
```

---

## Scoring Output Format

For each lead, produce:
```json
{
  "name": "First Last",
  "score": 0-100,
  "tier": "A|B|C|D",
  "category": "Primary Buyer|Sponsor|Connector|Procurement Gate|Not Relevant",
  "persona_label": "3-5 word label (e.g., QA Leadership, IT Platform Sponsor, Cloud Connector, Manufacturing Engineer)",
  "reasoning": "2-3 sentences. State what the person does, why they fit or don't fit, and what specific signals drove the score."
}
```

Tier boundaries: A=80-100, B=60-79, C=40-59, D=0-39. Score and tier MUST be consistent.
