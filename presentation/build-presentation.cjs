const pptxgen = require('pptxgenjs');
const fs = require('node:fs');
const path = require('node:path');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'AYN AL-SIJILL project team';
pptx.title = 'AYN AL-SIJILL | Azure observability case study';
pptx.subject = 'Client presentation about the Azure observability implementation';
pptx.lang = 'en-US';
pptx.theme = { headFontFace: 'Bahnschrift', bodyFontFace: 'Segoe UI', lang: 'en-US' };

const teamPath = path.join(__dirname, 'team.json');
const team = fs.existsSync(teamPath)
  ? JSON.parse(fs.readFileSync(teamPath, 'utf8'))
  : ['Presenter 1', 'Presenter 2', 'Presenter 3', 'Presenter 4'];
if (!Array.isArray(team) || team.length !== 4 || team.some(n => typeof n !== 'string' || !n.trim())) {
  throw new Error('team.json must contain four presenter names in speaking order.');
}

const W = 13.333, H = 7.5;
const ST = pptx.ShapeType;
const C = {
  paper: 'D4EAD7', white: 'F7FCF4', pale: 'BBDDC2', mint: 'B9DDC1',
  sage: 'B4DCC0', green: '0C6843', deep: '073D2B', deep2: '145438',
  ink: '103624', muted: '315842', line: '76A987', azure: '126DAB',
  coral: 'A94332', coralPale: 'F6DDD3', gold: '806116', softGold: 'F4E7BC'
};
const icon = name => path.join(__dirname, 'assets', 'azure', name + '.png');
const px = n => Number(n.toFixed(3));

function box(s, x, y, w, h, fill=C.white, border=fill, radius=0.12) {
  s.addShape(radius ? ST.roundRect : ST.rect, {
    x,y,w,h,rectRadius:radius,
    line:{color:border,width:border===fill?0:1.1},
    fill:{color:fill}
  });
}
function t(s, text, x, y, w, h, size=18, color=C.ink, bold=false, extra={}) {
  s.addText(text, {
    x,y,w,h,fontFace:'Segoe UI',fontSize:size,color,bold,margin:0,
    valign:'mid',fit:'shrink',breakLine:false,...extra
  });
}
function display(s, text, x, y, w, h, size=36, color=C.ink, extra={}) {
  t(s,text,x,y,w,h,size,color,true,{fontFace:'Bahnschrift',...extra});
}
function ln(s,x1,y1,x2,y2,color=C.line,width=1,dash) {
  s.addShape(ST.line,{x:x1,y:y1,w:x2-x1,h:y2-y1,line:{color,width,dashType:dash}});
}
function circle(s,x,y,d,fill) {
  s.addShape(ST.ellipse,{x,y,w:d,h:d,line:{color:fill,width:0},fill:{color:fill}});
}
function tag(s, text, x, y, w, fill=C.pale, color=C.green) {
  box(s,x,y,w,0.34,fill,fill,0.08);
  t(s,text,x+0.12,y+0.03,w-0.24,0.27,10,color,true,{charSpacing:1.1});
}
function az(s, name, x, y, d=0.58) {
  s.addImage({path:icon(name),x,y,w:d,h:d});
}
function base(section, n, dark=false) {
  const s=pptx.addSlide();
  s.background={color:dark?C.deep:C.paper};
  box(s,0,0,W,0.11,dark?C.sage:C.deep,dark?C.sage:C.deep,0);
  t(s,section.toUpperCase(),0.63,0.30,8,0.25,10,dark?C.sage:C.green,true,{charSpacing:1.55});
  ln(s,0.63,7.08,12.7,7.08,dark?'547565':C.line,0.8);
  t(s,'AYN AL-SIJILL  /  AZURE OBSERVABILITY',0.63,7.14,7.4,0.2,9,dark?C.sage:C.muted);
  t(s,String(n).padStart(2,'0')+' / 15',12.13,7.14,0.57,0.2,9,dark?C.sage:C.muted,false,{align:'right'});
  return s;
}
function note(s, presenter, seconds, lines) {
  if (typeof s.addNotes==='function') {
    s.addNotes(['Presenter: '+team[presenter], 'Suggested time: '+seconds+' seconds', ...lines].join('\n'));
  }
}
function title(s, a, b) {
  display(s,a,0.63,0.83,12.05,0.72,31);
  if (b) t(s,b,0.65,1.54,11.9,0.42,17,C.muted);
}

// 1 / Hook
{
  const s=base('An Azure observability case study',1,true);
  tag(s,'AYN AL-SIJILL',0.67,1.25,1.72,'2D644E','DFF3E3');
  display(s,'Payment approved.\nNo order created.',0.66,1.86,10.8,1.93,42,C.white);
  t(s,'Rihla Market scenario: a searchable Ghost Order on Azure.',0.70,4.28,10.8,0.53,21,'D4E7D8');
  ln(s,0.70,5.30,12.5,5.30,'6C9E7D',1.2);
  az(s,'functions',1.20,5.65,0.55);
  az(s,'virtual-machine',5.40,5.65,0.55);
  az(s,'sql-database',9.60,5.65,0.55);
  t(s,'AZURE FUNCTIONS',1.90,5.78,1.96,0.28,13,C.white,true);
  t(s,'ELK ON AZURE VM',6.10,5.78,2.02,0.28,13,C.white,true);
  t(s,'AZURE SQL',10.30,5.78,1.95,0.28,13,C.white,true);
  t(s,'→',4.25,5.75,0.35,0.3,20,C.sage,true);
  t(s,'→',8.45,5.75,0.35,0.3,20,C.sage,true);
  t(s,team.join('  •  '),0.70,6.53,11.8,0.28,11,'B9D6C3');
  note(s,0,35,[
    'Open with the Ghost Order: simulated payment authorization succeeds, but the order is not created.',
    'The checkout uses synthetic data and does not process real payments.'
  ]);
}

// 2 / Team
{
  const s=base('Group 01',2);
  title(s,'THE TEAM');
  const roles=[
    ['01','THE PROBLEM',team[0],'Project Manager & Integration Lead'],
    ['02','THE PLATFORM',team[1],'Cloud Infrastructure & ELK Platform'],
    ['03','THE INCIDENT',team[2],'ELK Data Pipeline'],
    ['04','THE PROOF',team[3],'Automation, Kibana & Demo']
  ];
  roles.forEach((a,i)=>{
    const x=0.65+i*3.04;
    box(s,x,2.48,2.82,3.18,C.white,C.line);
    t(s,a[0],x+0.21,2.79,2.4,0.47,29,C.green,true);
    t(s,a[1],x+0.21,3.45,2.43,0.29,11,C.green,true,{charSpacing:1.1});
    display(s,a[2],x+0.21,3.97,2.4,0.61,23,C.ink);
    t(s,a[3],x+0.21,4.72,2.38,0.70,12,C.muted);
  });
  note(s,0,35,['Introduce each presenter by name and section. Hand off every two and a half minutes.']);
}

// 3 / Problem
{
  const s=base('01 / The problem',3);
  title(s,'Ghost Order: payment approved, order missing','The proposal used this failure to test whether logs could explain a checkout across services.');
  box(s,0.67,2.28,5.33,3.72,C.white,C.line);
  tag(s,'SIMULATED CHECKOUT',0.99,2.61,2.24);
  t(s,'PAYMENT',1.01,3.32,2.0,0.28,11,C.muted,true,{charSpacing:1.0});
  t(s,'Authorized',3.42,3.29,2.15,0.36,20,C.green,true,{align:'right'});
  ln(s,1.0,3.91,5.58,3.91,C.line,1);
  t(s,'ORDER',1.01,4.19,2.0,0.28,11,C.muted,true,{charSpacing:1.0});
  t(s,'Not created',3.26,4.14,2.31,0.39,20,C.coral,true,{align:'right'});
  box(s,1.0,5.07,4.58,0.57,C.coralPale,C.coralPale);
  t(s,'HTTP 500  /  Ghost Order',1.21,5.20,4.14,0.26,16,C.coral,true);
  box(s,6.43,2.28,6.19,3.72,C.deep,C.deep);
  display(s,'Evidence the operator needs',6.72,2.56,5.53,0.66,27,C.white);
  ['Failing service: order-service','Payment status: authorized','Cause: database connection timeout','Trace and order identifiers'].forEach((q,i)=>{
    circle(s,6.75,3.44+i*0.57,0.12,C.sage);
    t(s,q,7.06,3.35+i*0.57,5.12,0.34,17,C.white);
  });
  t(s,'Rihla Market scenario  /  Ramadan, Eid, National Day, and campaign peaks',0.70,6.42,11.60,0.28,13,C.green,true);
  note(s,0,45,[
    'The Ghost Order scenario returns HTTP 500 after a successful simulated payment authorization.',
    'Order creation fails because the simulator emits a database connection pool timeout.',
    'The operator needs the payment result, the failed service, and the cause in one view.',
    'Source: function-app/src/events.js.'
  ]);
}

// 4 / Promise
{
  const s=base('01 / Investigation flow',4);
  title(s,'How we investigate the failed checkout','The API response returns a trace ID. The same ID appears in each service event.');
  const steps=[
    ['01','Trigger','POST /api/shop/demo/ghost-order'],
    ['02','Read IDs','order_id and trace_id in the response'],
    ['03','Search','Filter Kibana by trace.id'],
    ['04','Review alert','Open the trace-filtered Kibana link']
  ];
  steps.forEach((a,i)=>{
    const y=2.28+i*0.91;
    box(s,0.67,y,11.98,0.73,C.white,C.line);
    t(s,a[0],0.95,y+0.15,0.52,0.34,17,C.green,true);
    t(s,a[1],1.78,y+0.13,2.34,0.38,20,C.ink,true);
    t(s,a[2],4.40,y+0.15,7.79,0.34,17,C.muted);
  });
  box(s,0.67,6.19,11.98,0.48,C.deep,C.deep);
  t(s,'The Kibana filter retrieves the related checkout, payment, order, and database events.',0.92,6.29,11.42,0.28,16,C.white,true,{align:'center'});
  note(s,0,35,[
    'The solution emits ECS-style service events with shared identifiers.',
    'An operator can filter Kibana by trace and see the full checkout sequence.',
    'If the 25-second real-screen clip is ready, play it here. Use the remaining time to name the four steps. The clip replaces narration on this slide.'
  ]);
}

// 5 / Architecture
{
  const s=base('02 / Azure architecture',5);
  title(s,'Azure deployment architecture','Azure Functions sends checkout events to Logstash on the VM. Logstash indexes Elasticsearch.');
  box(s,0.66,2.15,11.98,3.92,C.white,C.line);
  tag(s,'MICROSOFT AZURE',0.95,2.39,2.06,C.pale,C.green);
  const nodes=[
    {x:0.98,ico:'functions',name:'Azure Functions',sub:'checkout + timer'},
    {x:4.78,ico:'virtual-machine',name:'Azure VM',sub:'Caddy + Logstash + ELK'},
    {x:8.58,ico:'sql-database',name:'Azure SQL',sub:'via reporting Function'}
  ];
  nodes.forEach(a=>{
    az(s,a.ico,a.x,3.00,0.80);
    t(s,a.name,a.x+0.94,3.07,2.45,0.37,19,C.ink,true);
    t(s,a.sub,a.x+0.94,3.53,2.54,0.32,13,C.muted);
  });
  t(s,'→',4.42,3.19,0.43,0.37,27,C.green,true);
  t(s,'→',8.22,3.19,0.43,0.37,27,C.green,true);
  ln(s,1.46,4.28,11.78,4.28,C.line,1.2);
  t(s,'Filebeat adds Linux and Docker logs',1.01,4.57,4.56,0.34,16,C.muted);
  t(s,'Kibana contains four saved investigation views',5.65,4.57,6.18,0.34,16,C.muted);
  tag(s,'FAILED CHECKOUT → TELEGRAM',0.99,5.33,3.72,C.coralPale,C.coral);
  t(s,'HTTPS  •  authenticated ingestion  •  private data ports',0.72,6.42,11.84,0.30,14,C.muted);
  note(s,1,50,[
    'The checkout simulator runs in Azure Functions. It sends authenticated event batches over HTTPS to Caddy and Logstash on one Azure VM.',
    'Elasticsearch stores events; Kibana provides search. Filebeat adds Docker and Linux logs.',
    'Logstash copies operational events to a reporting Function and Azure SQL.',
    'Telegram alerts are sent from the checkout Function for failed journeys.',
    'Source: docs/ARCHITECTURE.md.'
  ]);
}

// 6 / Azure services
{
  const s=base('02 / Azure services',6);
  title(s,'Azure services in this deployment','Functions, Virtual Machine, SQL, Key Vault, Logic Apps, and Blob Storage.');
  const services=[
    ['functions','Azure Functions','Synthetic API, timer, alert sender'],
    ['virtual-machine','Azure Virtual Machine','Single host for the ELK stack'],
    ['sql-database','Azure SQL Database','Structured incident records'],
    ['key-vault','Azure Key Vault','Telegram credentials'],
    ['logic-apps','Azure Logic Apps','Daily VM startup'],
    ['storage','Azure Blob Storage','Terraform state']
  ];
  services.forEach((a,i)=>{
    const col=i%3,row=Math.floor(i/3),x=0.67+col*4.06,y=2.22+row*1.86;
    box(s,x,y,3.84,1.61,C.white,C.line);
    az(s,a[0],x+0.25,y+0.28,0.69);
    t(s,a[1],x+1.09,y+0.25,2.47,0.52,17,C.ink,true);
    t(s,a[2],x+1.09,y+0.86,2.48,0.52,13.5,C.muted);
  });
  t(s,'VM: East US    Functions: East US 2    SQL: Central US',0.68,6.38,11.7,0.34,15,C.green,true);
  note(s,1,40,[
    'The VM is in East US, Functions in East US 2, and Azure SQL in Central US because of this subscription’s provisioning limits.',
    'Key Vault holds bot credentials. Logic Apps starts the VM each morning. Azure auto-shutdown deallocates it at night.',
    'Azure Blob Storage holds Terraform state separately from workload resources.',
    'Icon source: Microsoft Azure Architecture Center, https://learn.microsoft.com/azure/architecture/icons/.'
  ]);
}

// 7 / Workload
{
  const s=base('02 / Designed for demonstration',7);
  title(s,'Four checkout outcomes','A timer runs every two minutes by default. The API can force a scenario for a live demo.');
  const parts=[
    {p:75,c:C.green,n:'75% SUCCESS'},
    {p:8,c:C.coral,n:'8%'},
    {p:10,c:C.gold,n:'10%'},
    {p:7,c:C.azure,n:'7%'}
  ];
  let x=0.67;
  parts.forEach(a=>{
    const w=11.98*a.p/100;
    box(s,x,2.30,w,0.79,a.c,a.c,0);
    t(s,a.n,x+0.04,2.53,w-0.08,0.27,a.p>15?18:11,C.white,true,{align:'center'});
    x+=w;
  });
  const rows=[
    ['201','Success','Confirmed order',C.green],
    ['500','Ghost Order','Payment authorized, order missing',C.coral],
    ['402','Payment declined','Authorization stops checkout',C.gold],
    ['409','Inventory shortage','Stock check stops checkout',C.azure]
  ];
  rows.forEach((a,i)=>{
    const y=3.42+i*0.66;
    box(s,0.67,y,11.98,0.54,C.white,C.line);
    t(s,a[0],0.94,y+0.10,0.73,0.31,17,a[3],true);
    t(s,a[1],2.02,y+0.10,3.11,0.31,17,C.ink,true);
    t(s,a[2],5.38,y+0.11,6.85,0.30,15,C.muted);
  });
  t(s,'Proposal: 2 scenarios, 30 requests/min. Delivered: 4 scenarios, timer every 2 min.',0.70,6.47,11.6,0.29,13,C.green,true);
  note(s,1,30,[
    'The weights are configuration: 75% success, 8% Ghost Order, 10% payment decline, and 7% inventory shortage.',
    'The timer runs every two minutes by default. Manual requests make a live demonstration repeatable.',
    'Source: function-app/src/events.js and function-app/src/functions.js.'
  ]);
}

// 8 / Proposal to delivery
{
  const s=base('02 / Scope change',8);
  title(s,'From proposal to delivered system','The ELK investigation stayed central. The Azure workload and response paths expanded.');
  const changes=[
    ['WORKLOAD','Compose dummy app and traffic worker','Azure Functions API and weighted timer'],
    ['WEB EDGE','Nginx included as a log source','Caddy HTTPS; Filebeat collects logs'],
    ['RESPONSE','Search the Ghost Order in Kibana','Telegram incident card with trace link'],
    ['REPORTING','Elasticsearch operational history','Azure SQL view and idempotent backfill']
  ];
  changes.forEach((a,i)=>{
    const y=2.18+i*0.91;
    box(s,0.68,y,11.96,0.74,C.white,C.line);
    t(s,a[0],0.94,y+0.17,1.43,0.29,11,C.green,true,{charSpacing:1.0});
    t(s,a[1],2.42,y+0.12,4.23,0.40,16,C.muted);
    t(s,'→',6.70,y+0.14,0.36,0.36,23,C.green,true);
    t(s,a[2],7.18,y+0.12,5.03,0.40,16,C.ink,true);
  });
  t(s,'Power BI data source verified. The report and clean rebuild rehearsal remain open.',0.70,6.43,11.65,0.31,13,C.muted);
  note(s,1,30,[
    'The proposal expected a Compose dummy app and a worker sending 30 requests each minute, with every twentieth request a Ghost Order.',
    'The deployed simulator runs in Azure Functions. Its default timer interval is two minutes and its scenario mix covers success, Ghost Order, payment decline, and inventory shortage.',
    'Caddy provides HTTPS and authenticated ingestion. Telegram adds an incident response path. Logstash also copies events into Azure SQL, and a stable-ID backfill creates history.',
    'The Power BI report and a full destroy-and-rebuild rehearsal remain open.',
    'Sources: proposal pages 5 to 9, README.md, DEPLOYMENT.md.'
  ]);
}

// 9 / Trace
{
  const s=base('03 / The incident',9);
  title(s,'Ghost Order event sequence','Six events share order.id, trace.id, and transaction.id.');
  const seq=[
    ['CHECKOUT_STARTED','checkout-service',C.green],
    ['INVENTORY_RESERVED','inventory-service',C.green],
    ['PAYMENT_SUCCESS','payment-service',C.green],
    ['ORDER_CREATE_FAILED','order-service',C.coral],
    ['DATABASE_TIMEOUT','postgresql',C.coral],
    ['HTTP_REQUEST_COMPLETED','HTTP 500',C.coral]
  ];
  seq.forEach((a,i)=>{
    const y=2.12+i*0.64;
    if(i<5) ln(s,1.07,y+0.36,1.07,y+0.80,C.line,2);
    circle(s,0.94,y+0.18,0.27,a[2]);
    t(s,a[0],1.47,y+0.13,5.70,0.36,18,a[2]===C.coral?C.coral:C.ink,true);
    t(s,a[1],8.12,y+0.14,3.97,0.32,15,C.muted);
  });
  box(s,0.67,6.27,11.98,0.47,C.deep,C.deep);
  t(s,'The same trace contains DATABASE_TIMEOUT and the final HTTP 500 event.',0.92,6.37,11.43,0.28,16,C.white,true,{align:'center'});
  note(s,2,45,[
    'During the live demo, trigger the dedicated Ghost Order endpoint and read the returned order ID and trace ID. Keep the token off screen.',
    'The simulated database connection pool timeout identifies the cause.',
    'The final checkout event records HTTP 500, and all events share correlation identifiers.',
    'Source: function-app/src/events.js.'
  ]);
}

// 10 / Kibana
{
  const s=base('03 / Investigation',10);
  title(s,'Finding the cause in Kibana','Filter the Operations dashboard by trace ID to inspect the checkout sequence.');
  box(s,0.67,2.17,11.98,3.91,C.white,C.line);
  box(s,1.00,2.48,11.32,0.58,C.pale,C.pale);
  t(s,'trace.id : "selected checkout trace"',1.26,2.61,10.78,0.29,17,C.deep,true,{fontFace:'Consolas'});
  const views=[
    ['MAJLIS','Operations overview'],
    ['NABD','Signals and events'],
    ['MASAR','Trace journey'],
    ['ATHAR','Evidence details']
  ];
  views.forEach((a,i)=>{
    const x=1.02+i*2.85;
    box(s,x,3.41,2.63,1.95,C.paper,C.line);
    t(s,a[0],x+0.18,3.74,2.30,0.38,20,C.green,true);
    t(s,a[1],x+0.18,4.34,2.28,0.56,14,C.muted);
  });
  t(s,'Diagram of the four saved views in the Operations dashboard.',0.70,6.40,11.6,0.29,12,C.muted);
  note(s,2,40,[
    'The Operations dashboard contains four imported searchable views: MAJLIS, NABD, MASAR, and ATHAR.',
    'Paste the returned trace ID into the Operations dashboard. Point to PAYMENT_SUCCESS, ORDER_CREATE_FAILED, and DATABASE_TIMEOUT.',
    'This slide diagrams the four saved views and the trace filter.',
    'Source: README.md and DEPLOYMENT.md.'
  ]);
}

// 11 / Alert
{
  const s=base('03 / Response',11);
  title(s,'Telegram incident card','Failed checkouts generate a summary with severity, cause, and a Kibana link.');
  box(s,0.68,2.13,6.90,4.14,C.white,C.line);
  box(s,1.02,2.47,6.23,0.62,C.coralPale,C.coralPale);
  t(s,'CRITICAL  /  GHOST ORDER',1.27,2.64,5.76,0.28,17,C.coral,true);
  const alert=[
    ['Impact','Payment authorized; order not created'],
    ['Service','order-service'],
    ['Cause','Database connection pool timeout'],
    ['Trace','Links to the exact Kibana investigation']
  ];
  alert.forEach((a,i)=>{
    const y=3.37+i*0.57;
    t(s,a[0].toUpperCase(),1.12,y,1.21,0.29,11,C.muted,true,{charSpacing:1});
    t(s,a[1],2.57,y-0.02,4.36,0.36,15,C.ink);
  });
  box(s,1.12,5.68,5.98,0.39,C.deep,C.deep);
  t(s,'INVESTIGATE IN KIBANA  ↗',1.27,5.75,5.67,0.24,12,C.white,true,{align:'center'});
  az(s,'key-vault',8.35,2.56,1.04);
  display(s,'Bot credentials\nin Azure Key Vault',8.35,3.84,3.93,1.17,24,C.ink);
  t(s,'Alert delivery is best effort and cannot change the checkout response.',8.36,5.31,3.91,0.77,15,C.muted);
  note(s,2,35,[
    'Open the Telegram incident card for this checkout. Point to severity, cause, order ID, and the Kibana button.',
    'Its button opens the Kibana dashboard filtered to the trace and a short time window.',
    'Bot credentials are stored in Azure Key Vault. A delivery failure is logged and does not change the checkout result.',
    'Source: function-app/src/telegram.js and DEPLOYMENT.md.'
  ]);
}

// 12 / Reporting
{
  const s=base('03 / Reporting',12);
  title(s,'Azure SQL reporting path','Logstash copies events to Azure SQL through an authenticated Function.');
  az(s,'virtual-machine',0.91,2.60,0.86);
  az(s,'functions',4.47,2.60,0.86);
  az(s,'sql-database',8.50,2.60,0.86);
  t(s,'LOGSTASH',1.95,2.82,1.52,0.33,18,C.ink,true);
  t(s,'REPORTING FUNCTION',5.48,2.81,2.30,0.35,16,C.ink,true);
  t(s,'AZURE SQL',9.49,2.82,2.01,0.33,18,C.ink,true);
  t(s,'→',3.66,2.77,0.43,0.37,27,C.green,true);
  t(s,'→',7.85,2.77,0.43,0.37,27,C.green,true);
  box(s,0.71,4.07,11.85,1.57,C.white,C.line);
  tag(s,'dbo.PowerBIIncidentEvents',0.98,4.34,3.54,C.pale,C.green);
  t(s,'Timestamp   Order ID   Trace ID   Action   Outcome   Severity   Source',1.01,4.95,11.10,0.34,16,C.muted,false,{fontFace:'Consolas'});
  box(s,0.71,6.10,11.85,0.49,C.pale,C.pale);
  t(s,'Status: SQL path verified  •  Power BI report not yet authored or published',0.95,6.21,11.38,0.27,15,C.ink,true);
  note(s,2,30,[
    'Logstash sends a reporting copy to an authenticated Azure Function, which upserts Azure SQL.',
    'The view dbo.PowerBIIncidentEvents has been validated with live rows.',
    'A PBIX report has not been authored or published. State that boundary clearly.',
    'Source: function-app/src/incidents.js and DEPLOYMENT.md.'
  ]);
}

// 13 / Operations
{
  const s=base('04 / Azure operations',13);
  title(s,'Access and operating schedule','Caddy serves HTTPS. Key Vault holds secrets. Logic Apps starts the VM each morning.');
  const items=[
    ['network-security','Access','HTTPS entry; private Elasticsearch and Logstash ports'],
    ['key-vault','Secrets','Telegram credentials resolved from Key Vault'],
    ['logic-apps','Schedule','Start 09:00; deallocate 23:00 Riyadh time'],
    ['storage','State','Terraform state in a separate Azure storage account']
  ];
  items.forEach((a,i)=>{
    const x=0.68+(i%2)*6.03,y=2.20+Math.floor(i/2)*1.75;
    box(s,x,y,5.78,1.51,C.white,C.line);
    az(s,a[0],x+0.25,y+0.39,0.73);
    t(s,a[1],x+1.20,y+0.24,4.20,0.42,20,C.ink,true);
    t(s,a[2],x+1.20,y+0.76,4.18,0.55,14,C.muted);
  });
  t(s,'Scope: one VM runs the ELK stack. Production availability work remains.',0.70,6.31,11.85,0.41,14,C.muted);
  note(s,3,45,[
    'Caddy provides public HTTPS. Kibana login is required; direct data ports are not public.',
    'SSH access is restricted by configured CIDRs. Function APIs use generated tokens, except health.',
    'Key Vault contains bot secrets. Logic Apps and auto-shutdown govern the VM schedule.',
    'This is a single-VM course demo, not a high-availability production deployment.',
    'Source: docs/ARCHITECTURE.md, README.md, DEPLOYMENT.md.'
  ]);
}

// 14 / Evidence
{
  const s=base('04 / Proof in Azure',14);
  title(s,'Azure deployment checks','The deployment record covers API responses, Elasticsearch, Azure SQL, and public access.');
  const proof=[
    ['TERRAFORM','Azure workload provisioned'],
    ['201 / 500','Normal and Ghost Order responses'],
    ['ELK','Correlated app, Linux, and Docker events'],
    ['4 VIEWS','Operations dashboard imported'],
    ['AZURE SQL','Unique event read back from SQL'],
    ['PENDING','Full destroy-and-rebuild rehearsal']
  ];
  proof.forEach((a,i)=>{
    const x=0.68+(i%3)*4.02,y=2.22+Math.floor(i/3)*1.74;
    box(s,x,y,3.76,1.49,C.white,C.line);
    t(s,a[0],x+0.23,y+0.23,3.26,0.40,24,a[0]==='PENDING'?C.coral:C.green,true);
    t(s,a[1],x+0.23,y+0.80,3.30,0.52,14,C.muted);
  });
  box(s,0.70,6.06,11.85,0.49,C.deep,C.deep);
  t(s,'Proposal gates met in Azure except the clean rebuild rehearsal. Power BI report remains open.',0.97,6.17,11.30,0.27,14,C.white,true,{align:'center'});
  note(s,3,55,[
    'Normal checkout returned 201 and Ghost Order returned 500, with required correlated events in Elasticsearch.',
    'A unique probe passed through Caddy and Logstash into the reporting Function and was read back from Azure SQL.',
    'Linux and Docker logs were indexed. The public HTTPS login had a valid certificate, and unauthenticated dashboard access was rejected.',
    'The four investigation views were imported into Kibana.',
    'The clean destroy-and-rebuild rehearsal remains open. The validation results were recorded during the Azure deployment.',
    'Source: DEPLOYMENT.md, Verification completed.'
  ]);
}

// 15 / Close
{
  const s=base('Result',15,true);
  display(s,'A failed checkout,\ntraced to its cause.',0.68,1.36,11.7,1.63,43,C.white);
  t(s,'The proposed Ghost Order is searchable in Azure. We also delivered trace-linked alerts and an Azure SQL data source.',0.72,3.51,11.52,0.84,21,'D2E9D8');
  const words=[['SEARCH','Trace-filtered events'],['ALERT','Telegram incident card'],['QUERY','Azure SQL records']];
  words.forEach((a,i)=>{
    const x=0.74+i*4.09;
    ln(s,x,5.21,x+3.39,5.21,'6DA483',1);
    t(s,a[0],x,5.45,3.34,0.43,26,C.white,true);
    t(s,a[1],x,5.98,3.33,0.32,14,'C2DFCA');
  });
  t(s,team.join('  •  '),0.74,6.70,11.73,0.24,10,'B9D6C3');
  note(s,3,50,[
    'Summarize the walkthrough: the API returned 500, Kibana showed the database timeout, Telegram linked to the trace, and SQL stored the events.',
    'The current system is a synthetic demonstration. Next work includes authoring the Power BI report, adding KPI views, testing a rebuild, and production hardening.',
    'Invite questions about the deployment and the investigation flow.'
  ]);
}

const output=path.join(__dirname,'AYN_AL_SIJILL_Final_Presentation.pptx');
pptx.writeFile({fileName:output});
