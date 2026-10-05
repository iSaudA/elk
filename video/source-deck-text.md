# Source deck text

Source: `presentation/AYN_AL_SIJILL_Final_Presentation.pptx`
SHA-256: `d1c63fec32e5a2ea5e1283b2e76df746eb0ce516b00fb8baf4352a78d5e57329`

## ppt/slides/slide1.xml

AN AZURE OBSERVABILITY CASE STUDY
AYN AL-SIJILL  /  AZURE OBSERVABILITY
01 / 15
AYN AL-SIJILL
Payment approved.
No order created.
Rihla Market scenario: a searchable Ghost Order on Azure.
AZURE FUNCTIONS
ELK ON AZURE VM
AZURE SQL
→
→
Saud  •  Retaj  •  Norah  •  Lama

## ppt/slides/slide2.xml

GROUP 01
AYN AL-SIJILL  /  AZURE OBSERVABILITY
02 / 15
THE TEAM
01
THE PROBLEM
Saud
Project Manager & Integration Lead
02
THE PLATFORM
Retaj
Cloud Infrastructure & ELK Platform
03
THE INCIDENT
Norah
ELK Data Pipeline
04
THE PROOF
Lama
Automation, Kibana & Demo

## ppt/slides/slide3.xml

01 / THE PROBLEM
AYN AL-SIJILL  /  AZURE OBSERVABILITY
03 / 15
Ghost Order: payment approved, order missing
The proposal used this failure to test whether logs could explain a checkout across services.
SIMULATED CHECKOUT
PAYMENT
Authorized
ORDER
Not created
HTTP 500  /  Ghost Order
Evidence the operator needs
Failing service: order-service
Payment status: authorized
Cause: database connection timeout
Trace and order identifiers
Rihla Market scenario  /  Ramadan, Eid, National Day, and campaign peaks

## ppt/slides/slide4.xml

01 / INVESTIGATION FLOW
AYN AL-SIJILL  /  AZURE OBSERVABILITY
04 / 15
How we investigate the failed checkout
The API response returns a trace ID. The same ID appears in each service event.
01
Trigger
POST /api/shop/demo/ghost-order
02
Read IDs
order_id and trace_id in the response
03
Search
Filter Kibana by trace.id
04
Review alert
Open the trace-filtered Kibana link
The Kibana filter retrieves the related checkout, payment, order, and database events.

## ppt/slides/slide5.xml

02 / AZURE ARCHITECTURE
AYN AL-SIJILL  /  AZURE OBSERVABILITY
05 / 15
Azure deployment architecture
Azure Functions sends checkout events to Logstash on the VM. Logstash indexes Elasticsearch.
MICROSOFT AZURE
Azure Functions
checkout + timer
Azure VM
Caddy + Logstash + ELK
Azure SQL
via reporting Function
→
→
Filebeat adds Linux and Docker logs
Kibana contains four saved investigation views
FAILED CHECKOUT → TELEGRAM
HTTPS  •  authenticated ingestion  •  private data ports

## ppt/slides/slide6.xml

02 / AZURE SERVICES
AYN AL-SIJILL  /  AZURE OBSERVABILITY
06 / 15
Azure services in this deployment
Functions, Virtual Machine, SQL, Key Vault, Logic Apps, and Blob Storage.
Azure Functions
Synthetic API, timer, alert sender
Azure Virtual Machine
Single host for the ELK stack
Azure SQL Database
Structured incident records
Azure Key Vault
Telegram credentials
Azure Logic Apps
Daily VM startup
Azure Blob Storage
Terraform state
VM: East US    Functions: East US 2    SQL: Central US

## ppt/slides/slide7.xml

02 / DESIGNED FOR DEMONSTRATION
AYN AL-SIJILL  /  AZURE OBSERVABILITY
07 / 15
Four checkout outcomes
A timer runs every two minutes by default. The API can force a scenario for a live demo.
75% SUCCESS
8%
10%
7%
201
Success
Confirmed order
500
Ghost Order
Payment authorized, order missing
402
Payment declined
Authorization stops checkout
409
Inventory shortage
Stock check stops checkout
Proposal: 2 scenarios, 30 requests/min. Delivered: 4 scenarios, timer every 2 min.

## ppt/slides/slide8.xml

02 / SCOPE CHANGE
AYN AL-SIJILL  /  AZURE OBSERVABILITY
08 / 15
From proposal to delivered system
The ELK investigation stayed central. The Azure workload and response paths expanded.
WORKLOAD
Compose dummy app and traffic worker
→
Azure Functions API and weighted timer
WEB EDGE
Nginx included as a log source
→
Caddy HTTPS; Filebeat collects logs
RESPONSE
Search the Ghost Order in Kibana
→
Telegram incident card with trace link
REPORTING
Elasticsearch operational history
→
Azure SQL view and idempotent backfill
Power BI data source verified. The report and clean rebuild rehearsal remain open.

## ppt/slides/slide9.xml

03 / THE INCIDENT
AYN AL-SIJILL  /  AZURE OBSERVABILITY
09 / 15
Ghost Order event sequence
Six events share order.id, trace.id, and transaction.id.
CHECKOUT_STARTED
checkout-service
INVENTORY_RESERVED
inventory-service
PAYMENT_SUCCESS
payment-service
ORDER_CREATE_FAILED
order-service
DATABASE_TIMEOUT
postgresql
HTTP_REQUEST_COMPLETED
HTTP 500
The same trace contains DATABASE_TIMEOUT and the final HTTP 500 event.

## ppt/slides/slide10.xml

03 / INVESTIGATION
AYN AL-SIJILL  /  AZURE OBSERVABILITY
10 / 15
Finding the cause in Kibana
Filter the Operations dashboard by trace ID to inspect the checkout sequence.
trace.id : "selected checkout trace"
MAJLIS
Operations overview
NABD
Signals and events
MASAR
Trace journey
ATHAR
Evidence details
Diagram of the four saved views in the Operations dashboard.

## ppt/slides/slide11.xml

03 / RESPONSE
AYN AL-SIJILL  /  AZURE OBSERVABILITY
11 / 15
Telegram incident card
Failed checkouts generate a summary with severity, cause, and a Kibana link.
CRITICAL  /  GHOST ORDER
IMPACT
Payment authorized; order not created
SERVICE
order-service
CAUSE
Database connection pool timeout
TRACE
Links to the exact Kibana investigation
INVESTIGATE IN KIBANA  ↗
Bot credentials
in Azure Key Vault
Alert delivery is best effort and cannot change the checkout response.

## ppt/slides/slide12.xml

03 / REPORTING
AYN AL-SIJILL  /  AZURE OBSERVABILITY
12 / 15
Azure SQL reporting path
Logstash copies events to Azure SQL through an authenticated Function.
LOGSTASH
REPORTING FUNCTION
AZURE SQL
→
→
dbo.PowerBIIncidentEvents
Timestamp   Order ID   Trace ID   Action   Outcome   Severity   Source
Status: SQL path verified  •  Power BI report not yet authored or published

## ppt/slides/slide13.xml

04 / AZURE OPERATIONS
AYN AL-SIJILL  /  AZURE OBSERVABILITY
13 / 15
Access and operating schedule
Caddy serves HTTPS. Key Vault holds secrets. Logic Apps starts the VM each morning.
Access
HTTPS entry; private Elasticsearch and Logstash ports
Secrets
Telegram credentials resolved from Key Vault
Schedule
Start 09:00; deallocate 23:00 Riyadh time
State
Terraform state in a separate Azure storage account
Scope: one VM runs the ELK stack. Production availability work remains.

## ppt/slides/slide14.xml

04 / PROOF IN AZURE
AYN AL-SIJILL  /  AZURE OBSERVABILITY
14 / 15
Azure deployment checks
The deployment record covers API responses, Elasticsearch, Azure SQL, and public access.
TERRAFORM
Azure workload provisioned
201 / 500
Normal and Ghost Order responses
ELK
Correlated app, Linux, and Docker events
4 VIEWS
Operations dashboard imported
AZURE SQL
Unique event read back from SQL
PENDING
Full destroy-and-rebuild rehearsal
Proposal gates met in Azure except the clean rebuild rehearsal. Power BI report remains open.

## ppt/slides/slide15.xml

RESULT
AYN AL-SIJILL  /  AZURE OBSERVABILITY
15 / 15
A failed checkout,
traced to its cause.
The proposed Ghost Order is searchable in Azure. We also delivered trace-linked alerts and an Azure SQL data source.
SEARCH
Trace-filtered events
ALERT
Telegram incident card
QUERY
Azure SQL records
Saud  •  Retaj  •  Norah  •  Lama
