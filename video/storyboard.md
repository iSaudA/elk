# AYN AL-SIJILL, final production storyboard

29 seconds, 870 frames, 30 fps. Scene intervals are end-exclusive. The source deck was read directly from `presentation/AYN_AL_SIJILL_Final_Presentation.pptx`; extracted slide text and its SHA-256 fingerprint are in `source-deck-text.md`. No conflict was found between the deck and brief.

| Time | Frames | Picture and motion | Source slides |
|---|---|---|---|
| 0–4s | 0–119 | Rihla Market checkout. Place order click at 0.7s, payment authorization at 0.87s, failed order at 2s. Large copy appears in two beats. Empty outlined confirmation remains failed. Card edge becomes the correlation line. | 1, 3 |
| 4–7s | 120–209 | Three separated event cards converge over a single trace line. Same trace ID appears on checkout, payment, and order. One checkout. One trace. | 4, 9 |
| 7–12s | 210–359 | Azure Functions sends synthetic events through HTTPS/Caddy to one VM. Logstash indexes Elasticsearch; Kibana connects to indexed evidence as its investigation view. The Kibana pane expands into the next investigation frame at the edit. | 5, 6, 13, 14 |
| 12–19s | 360–569 | Selected trace filters six related events in the source order. Focus progresses PAYMENT_SUCCESS, ORDER_CREATE_FAILED, DATABASE_TIMEOUT. `postgresql` is the database source. Cause enters at 14.67s and settles at 15.27s, readable through 19s, then giving way to the output scene through a short spatial reveal. HTTP 500 persists. | 4, 9, 10 |
| 19–24s | 570–719 | Telegram-style critical alert and Azure SQL incident record sit in parallel. Functions is labeled as the Telegram source. SQL path is labeled Logstash → authenticated reporting Function → Azure SQL. Link receives one gentle focus pulse. Record retains failed outcome. | 6, 11, 12 |
| 24–29s | 720–869 | Trace line becomes the brand underline. Brand, proposition, Azure credit, and team settle before 26s. Last three seconds are visually still. Audio fades to silence by 28.8s. End on brand. | 1, 2, 15 |

## Narration script for later recording

The delivered master has an original instrumental bed and synchronized sound design. Narration was not generated. No configured, natural local voice engine was found; this did not block the master.

| Time | Script |
|---|---|
| 00:00–00:04 | Payment approved. No order created. |
| 00:04–00:07 | Our answer: follow the trace. |
| 00:07–00:12 | Ayn Al-Sijill connects the evidence on Azure. |
| 00:12–00:19 | From checkout to database, one trace reveals the timeout behind the failure. |
| 00:19–00:24 | Trace-linked alerts. Structured incident records. |
| 00:24–00:29 | Ayn Al-Sijill. A failed checkout, traced to its cause. |

Confirm the intended Arabic brand pronunciation with the team before recording. No narrated alternate, voice track, or narration SRT is claimed.

## Scope and synthetic data

The UI is explicitly illustrative. All scenes use synthetic trace `8f3c2a917b644e0db125a6c09f72e431`, displayed as `8f3c2a91…9f72e431`, order `ORD-DEMO-1042`, and transaction `TXN-DEMO-2086`. The full fixture is in `public/film/demo-data.json`. No live service, payment, credential, or infrastructure endpoint is used.

The luminous line represents correlation, not a physical network connection. Directed arrows and text in the architecture and output scenes represent only the documented paths. The saved names MAJLIS, NABD, MASAR, and ATHAR are tabs within an illustrative Kibana interface. Azure SQL is a reporting destination, separate from the simulated PostgreSQL timeout. Telegram delivery is best effort. The checkout stays failed after its cause is understood.

Terraform provisioned the documented workload; no successful clean rebuild, production availability, recovery, refund, measured savings, or published Power BI report is asserted. Filebeat, Key Vault, VM schedules, and Terraform state are intentionally outside the short film's visual focus. The deck remains authoritative for their details.
