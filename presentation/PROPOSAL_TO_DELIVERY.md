# Proposal to delivery

Source proposal: Ayn_Al_Sijill_Group01_Proposal_v1.pdf, dated 2 September 2026. The project repository and DEPLOYMENT.md record the delivered system.

| Proposal | Delivered state | Evidence |
| --- | --- | --- |
| Terraform provisions Azure network and one Linux VM; Compose runs ELK. | Delivered. ELK runs on one Azure VM, provisioned through Terraform and configured with cloud-init and Compose. | README.md, docs/ARCHITECTURE.md, DEPLOYMENT.md |
| Compose dummy app and traffic worker send 30 requests per minute, with every twentieth request a Ghost Order. | Changed. Azure Functions runs the simulator. Its default timer is every two minutes and uses four weighted scenarios. | function-app/src/events.js, function-app/src/functions.js |
| Normal checkout returns 201; forced Ghost Order returns 500; shared order and trace IDs expose the failure. | Delivered and verified in Elasticsearch. The simulator also shares transaction.id and emits a database timeout event. | docs/EVENTS.md, DEPLOYMENT.md |
| Application, Linux, Docker, Nginx, and business events flow to ELK. | Application, Linux, and Docker ingestion was verified. Caddy replaced the proposed Nginx path and fronts authenticated Logstash ingestion and Kibana over HTTPS. | README.md, docs/ARCHITECTURE.md, DEPLOYMENT.md |
| MAJLIS, NABD, MASAR, and ATHAR answer operating questions in Kibana. | Imported as four searchable event views on the Operations dashboard. KPI-style visualizations remain future work. | README.md, DEPLOYMENT.md |
| Azure access is controlled; secrets stay outside Git. | Kibana uses login and public TLS; data ports are private; SSH is restricted. Telegram secrets are stored in Azure Key Vault. | README.md, docs/ARCHITECTURE.md, DEPLOYMENT.md |
| Clean rebuild and repeatable demo satisfy final acceptance. | Repeatable normal and Ghost Order validation passed on Azure. A full destroy-and-rebuild rehearsal remains open. | DEPLOYMENT.md |
| No SQL reporting or Telegram alert path was proposed. | Added. Logstash copies events to an authenticated Function and Azure SQL; failed checkouts create trace-linked Telegram incident cards. | function-app/src/incidents.js, function-app/src/telegram.js, DEPLOYMENT.md |
| No historical chart baseline was proposed. | Added. Stable event IDs let the seeder populate history from January 2026 without duplicate rows on rerun. | function-app/src/backfill.js, scripts/backfill-history.cjs, README.md |
| No Power BI report was proposed. | The Azure SQL reporting view is deployed and validated. A Power BI report has not been authored or published. | function-app/src/incidents.js, DEPLOYMENT.md |

The proposal names the team as Saud, Retaj, Norah, and Lama, in that order. These first names and the proposal's role descriptions are used on slide 2. The GitHub history available locally identifies only iSaudA, so the proposal is the source for the four-person team list.
