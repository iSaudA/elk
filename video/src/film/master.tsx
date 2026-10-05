import type {ReactNode} from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate, Easing} from 'remotion';
import {film} from './config';

const c = film.colors;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const p = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {...clamp, easing: ease});
const linear = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);
const mono = 'Ubuntu Mono, Noto Sans Mono, monospace';

type TextProps = {readonly x: number; readonly y: number; readonly children: ReactNode; readonly size?: number; readonly color?: string; readonly weight?: number; readonly family?: string; readonly spacing?: number; readonly opacity?: number; readonly anchor?: 'start' | 'middle' | 'end'};
function T({x, y, children, size = 32, color = c.ivory, weight = 400, family, spacing = 0, opacity = 1, anchor = 'start'}: TextProps) {
  return <text x={x} y={y} fontSize={size} fill={color} fontWeight={weight} fontFamily={family} letterSpacing={spacing} opacity={opacity} textAnchor={anchor}>{children}</text>;
}
function Card({x, y, w, h, fill = c.surface, stroke = c.line, children}: {readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly fill?: string; readonly stroke?: string; readonly children?: ReactNode}) {
  return <g><rect x={x} y={y + 14} width={w} height={h} rx={24} fill="#00160F" opacity={0.25}/><rect x={x} y={y} width={w} height={h} rx={24} fill={fill} stroke={stroke} strokeWidth={1.5}/>{children}</g>;
}
function Badge({x, y, text, color = c.mint, w = 184}: {readonly x: number; readonly y: number; readonly text: string; readonly color?: string; readonly w?: number}) {
  return <g><rect x={x} y={y} width={w} height={46} rx={23} fill={color} fillOpacity={0.1} stroke={color} strokeOpacity={0.45}/><T x={x + w / 2} y={y + 32} size={25} color={color} anchor="middle" weight={500}>{text}</T></g>;
}
function Appear({f, at = 0, children, dy = 20}: {readonly f: number; readonly at?: number; readonly children: ReactNode; readonly dy?: number}) {
  const v = p(f, at, at + 15);
  return <g opacity={v} transform={`translate(0 ${dy * (1-v)})`}>{children}</g>;
}
function Arrow({x1, x2, y, progress = 1, color = c.mint}: {readonly x1: number; readonly x2: number; readonly y: number; readonly progress?: number; readonly color?: string}) {
  return <g opacity={progress}><path d={`M${x1} ${y}H${x2}`} stroke={color} strokeWidth={3}/><path d={`M${x2-10} ${y-7}L${x2} ${y}L${x2-10} ${y+7}`} stroke={color} strokeWidth={3} fill="none"/></g>;
}
function TraceTag({x, y, dark = false}: {readonly x: number; readonly y: number; readonly dark?: boolean}) {
  return <T x={x} y={y} size={26} family={mono} color={dark ? c.ink : c.mint}>trace.id  {film.traceDisplay}</T>;
}
function Heading({f, text}: {readonly f: number; readonly text: string}) {
  return <Appear f={f} at={1}><T x={112} y={254} size={text.length > 33 ? 76 : 88} weight={500} spacing={-2.3}>{text}</T></Appear>;
}
function Checkout({f}: {readonly f: number}) {
  const paid = f >= 26, failed = f >= 60;
  return <g>
    <T x={112} y={135} size={28} spacing={3} color={c.mint}>RIHLA MARKET</T>
    <Badge x={1460} y={102} text="Simulated checkout" w={348}/>
    <Appear f={f} at={26}><T x={112} y={372} size={90} weight={500} spacing={-2}>Payment</T><T x={112} y={474} size={90} weight={500} spacing={-2}>approved.</T></Appear>
    <Appear f={f} at={60}><T x={112} y={622} size={90} weight={500} spacing={-2} color={c.coral}>No order</T><T x={112} y={724} size={90} weight={500} spacing={-2} color={c.coral}>created.</T></Appear>
    <Card x={1040} y={225} w={768} h={648} fill={c.pale} stroke={c.pale}>
      <T x={1080} y={287} size={32} weight={500} color={c.ink}>Your checkout</T>
      <T x={1080} y={335} size={25} color={c.ink} family={mono}>{film.order}</T>
      <path d="M1080 370H1768" stroke={c.line} opacity={0.28}/>
      <rect x={1080} y={398} width={688} height={94} rx={16} fill={paid ? '#B4DCC0' : '#C5DFC9'}/>
      <circle cx={1126} cy={445} r={20} fill={paid ? '#0C6843' : c.line}/>
      {paid ? <path d="M1116 445l7 7 13-16" stroke={c.ivory} strokeWidth={3} fill="none"/> : null}
      <T x={1168} y={456} size={34} color={c.ink} weight={500}>{paid ? 'Payment authorized' : 'Payment ready'}</T>
      <rect x={1080} y={521} width={688} height={196} rx={16} fill="none" stroke={failed ? '#A94332' : c.line} strokeWidth={2} strokeDasharray={failed ? '9 8' : '0'} opacity={0.7}/>
      <T x={1110} y={577} size={25} color={c.ink}>ORDER CONFIRMATION</T>
      <T x={1110} y={633} size={38} weight={500} color={failed ? '#913E2E' : c.line}>{failed ? 'Order not created' : paid ? 'Awaiting order…' : 'Ready to place order'}</T>
      {failed ? <T x={1110} y={684} size={27} color="#913E2E" family={mono}>HTTP 500  /  GHOST ORDER</T> : null}
      {f < 60 ? <g transform={`translate(0 ${f > 18 && f < 25 ? 3 : 0})`}><rect x={1080} y={746} width={688} height={74} rx={14} fill={c.ink}/><T x={1424} y={794} size={32} color={c.ivory} anchor="middle">{paid ? 'Payment approved' : 'Place order'}</T></g> : <TraceTag x={1080} y={792} dark/>}
      {f >= 10 && f < 27 ? <g transform={`translate(${1530-60*p(f,10,22)} ${837-38*p(f,10,22)})`}><path d="M0 0L3 40L14 28L28 28Z" fill={c.ivory} stroke={c.ink} strokeWidth={2}/><circle r={28*p(f,20,26)} fill="none" stroke={c.ink} opacity={1-p(f,20,26)}/></g> : null}
    </Card>
    <T x={112} y={975} size={24} color={c.muted}>Illustrative demo UI • Synthetic data</T>
  </g>;
}
function Correlation({f}: {readonly f: number}) {
  const join = p(f, 5, 44);
  return <g>
    <Heading f={f} text={film.headlines[1]}/>
    <Appear f={f} at={8}><T x={114} y={320} size={32} color={c.muted}>Related events. A shared identity.</T></Appear>
    {[{x:112,y:466,label:'Checkout',sub:'CHECKOUT_STARTED',color:c.ivory},{x:700,y:466,label:'Payment',sub:'PAYMENT_SUCCESS',color:c.mint},{x:1288,y:466,label:'Order',sub:'ORDER_CREATE_FAILED',color:c.coral}].map((e,i) => <g key={e.label} transform={`translate(${(i-1)*48*(1-join)} ${((i%2)*2-1)*36*(1-join)})`}>
      <Card x={e.x} y={e.y} w={520} h={242}><T x={e.x+32} y={e.y+64} size={42} weight={500} color={e.color}>{e.label}</T><T x={e.x+32} y={e.y+116} size={28} family={mono} color={e.color}>{e.sub}</T><T x={e.x+32} y={e.y+191} size={25} family={mono} color={c.muted}>{film.traceDisplay}</T></Card>
      <path d={`M${e.x+260} 709V850`} stroke={c.mint} strokeWidth={2} opacity={join}/><circle cx={e.x+260} cy={850} r={7} fill={c.mint} opacity={join}/>
    </g>)}
    <Appear f={f} at={32}><TraceTag x={112} y={934}/><T x={1808} y={934} size={25} color={c.muted} anchor="end">Correlation across services</T></Appear>
  </g>;
}
function Azure({f}: {readonly f: number}) {
  const zoom = p(f, 134, 150);
  return <g>
    <Heading f={f} text={film.headlines[2]}/>
    <Appear f={f} at={7}>
      <rect x={112} y={350} width={1696} height={542} rx={28} fill={c.deep} stroke={c.line}/>
      <T x={148} y={405} size={27} color={c.blue} spacing={3}>MICROSOFT AZURE</T>
      <Card x={156} y={492} w={402} h={236}><T x={190} y={551} size={28} color={c.blue}>EVENT SOURCE</T><T x={190} y={612} size={41} weight={500}>Azure Functions</T><T x={190} y={675} size={28} color={c.muted}>Synthetic checkout events</T></Card>
      <T x={682} y={509} size={25} anchor="middle" color={c.muted}>HTTPS ingestion</T><T x={682} y={548} size={24} anchor="middle" color={c.blue}>Caddy edge</T>
      <Arrow x1={580} x2={794} y={612} progress={p(f,25,45)}/>
      <rect x={824} y={437} width={936} height={393} rx={23} stroke={c.blue} strokeOpacity={0.55} fill={c.surface}/>
      <T x={857} y={490} size={33} weight={500}>ELK on Azure VM</T><T x={1728} y={490} size={24} anchor="end" color={c.muted}>Single host</T>
      <Card x={858} y={553} w={287} h={122} fill={c.raised}><T x={1001} y={626} size={36} weight={500} anchor="middle">Logstash</T></Card>
      <Arrow x1={1159} x2={1214} y={614} progress={p(f,48,66)}/>
      <Card x={1230} y={553} w={491} h={122} fill={c.raised}><T x={1475} y={626} size={37} weight={500} anchor="middle">Elasticsearch</T></Card>
      <path d="M1475 677V705" stroke={c.mint} strokeWidth={2}/>
      <rect x={1230} y={708} width={491} height={87} rx={14} fill={c.pale}/><T x={1256} y={765} size={36} color={c.ink} weight={500}>Kibana</T><T x={1696} y={761} size={24} color={c.ink} anchor="end">Investigation view</T>
      <T x={858} y={769} size={25} color={c.muted}>Indexed evidence</T>
      {[0,1,2].map(i=><circle key={i} cx={580+1140*linear((f-28-i*12)%84,0,84)} cy={612} r={5} fill={c.blue} opacity={f>28+i*12 && f<128 ? 0.8 : 0}/>)}
    </Appear>
    {f >= 134 ? <g opacity={zoom}>
      <rect x={1230+(112-1230)*zoom} y={708+(313-708)*zoom} width={491+(1696-491)*zoom} height={87+(615-87)*zoom} rx={24} fill={c.deep} stroke={c.line}/>
      <T x={1256+(148-1256)*zoom} y={765+(365-765)*zoom} size={36-5*zoom} weight={500}>Kibana</T>
      <g opacity={zoom}><TraceTag x={166} y={444}/></g>
    </g> : null}
    <Appear f={f} at={38}><T x={112} y={953} size={26} color={c.muted}>Provisioned with Terraform</T><T x={1808} y={953} size={25} color={c.muted} anchor="end">Illustrative architecture • Synthetic events</T></Appear>
  </g>;
}
function Investigation({f}: {readonly f: number}) {
  const selected = f < 48 ? 2 : f < 76 ? 3 : 4;
  const reveal = p(f, 80, 98);
  return <g>
    <Heading f={f} text={film.headlines[3]}/>
    <Appear f={f} at={0} dy={10}>
      <Card x={112} y={313} w={1696} h={615} fill={c.deep}>
        <T x={148} y={365} size={31} weight={500}>Kibana</T><T x={293} y={365} size={24} color={c.muted}>/ Saved investigation views</T>
        {['MAJLIS','NABD','MASAR','ATHAR'].map((name,i)=><g key={name}><rect x={1008+i*190} y={327} width={176} height={54} rx={11} fill={i===2 ? c.pale : 'transparent'}/><T x={1096+i*190} y={363} size={25} color={i===2 ? c.ink : c.muted} anchor="middle">{name}</T></g>)}
        <rect x={144} y={399} width={1632} height={69} rx={12} fill={c.raised} stroke={c.mint} strokeOpacity={0.55}/>
        <T x={166} y={444} size={29} family={mono} color={c.mint}>trace.id : "{film.traceDisplay}"</T><Badge x={1520} y={410} text="6 events" w={230}/>
        <path d="M958 498V891" stroke={c.line}/>
        {film.events.map((e,i)=>{
          const active = i===selected; const y = 500+i*60;
          return <g key={e.label}>
            <rect x={144} y={y} width={782} height={54} rx={10} fill={active ? (i===2 ? c.raised : '#4A392D') : 'transparent'} stroke={active ? (i===2 ? c.mint : c.coral) : 'none'}/>
            <circle cx={164} cy={y+27} r={5} fill={i>=3 ? c.coral : c.mint}/>
            <T x={184} y={y+37} size={32} family={mono} color={active ? (i===2 ? c.mint : c.coral) : c.muted}>{e.label}</T>
            {i===4 && f>=76 ? <T x={901} y={y+37} size={24} color={c.coral} anchor="end">←</T> : null}
          </g>;
        })}
        <T x={1000} y={534} size={25} color={c.muted} spacing={2}>SELECTED EVIDENCE</T>
        {f<80 ? <g><T x={1000} y={606} size={37} color={selected===2 ? c.mint : c.coral} weight={500}>{selected===2 ? 'Payment authorized' : 'Order creation failed'}</T><T x={1000} y={668} size={31} color={c.muted}>{selected===2 ? 'Follow the related order event.' : 'Inspect the database event.'}</T></g> : null}
        <g opacity={reveal}>
          <T x={1000} y={586} size={26} color={c.muted}>Failing service:</T><T x={1000} y={635} size={43} weight={500}>order-service</T>
          <T x={1000} y={686} size={26} color={c.muted}>Cause:</T><T x={1000} y={735} size={42} color={c.coral} weight={500}>Database connection</T><T x={1000} y={785} size={42} color={c.coral} weight={500}>pool timeout</T>
          <T x={1000} y={850} size={26} family={mono} color={c.muted}>source: postgresql</T><Badge x={1535} y={816} text="HTTP 500" w={208} color={c.coral}/>
        </g>
        <T x={153} y={899} size={24} color={c.muted} family={mono}>{film.order}  /  {film.transaction}</T>
      </Card>
    </Appear>
    <T x={112} y={976} size={24} color={c.muted}>Illustrative demo UI • Synthetic data</T>
    <Appear f={f} at={100}><T x={1808} y={976} size={27} color={c.coral} anchor="end">Cause identified. Order remains failed.</T></Appear>
  </g>;
}
function Outputs({f}: {readonly f: number}) {
  const pulse = Math.sin(Math.PI*linear(f,53,88))**2;
  return <g>
    <Heading f={f} text={film.headlines[4]}/>
    <Appear f={f} at={4}>
      <T x={114} y={335} size={25} color={c.blue}>Azure Functions → Telegram</T>
      <Card x={112} y={366} w={858} h={544} fill={c.pale} stroke={c.pale}>
        <T x={148} y={418} size={26} color={c.ink}>TELEGRAM INCIDENT SUMMARY</T>
        <T x={148} y={478} size={37} color="#913E2E" weight={600}>CRITICAL / GHOST ORDER</T>
        <T x={148} y={541} size={37} weight={500} color={c.ink}>order-service</T>
        <T x={148} y={591} size={33} color={c.ink}>Database connection pool timeout</T>
        <T x={148} y={647} size={27} color={c.ink}>Payment authorized; order not created</T>
        <TraceTag x={148} y={706} dark/>
        <T x={148} y={748} size={25} family={mono} color={c.ink}>{film.order}</T>
        <rect x={148} y={790} width={786} height={76} rx={13} fill={c.ink} stroke={c.ink} strokeWidth={2+8*pulse}/><T x={181} y={840} size={33} color={c.ivory}>Investigate in Kibana</T><T x={892} y={840} size={38} color={c.mint} anchor="end">↗</T>
      </Card>
    </Appear>
    <Appear f={f} at={15}>
      <T x={1032} y={335} size={24} color={c.blue}>Logstash → authenticated reporting Function → Azure SQL</T>
      <Card x={1030} y={366} w={778} h={544}>
        <T x={1066} y={424} size={35} weight={500}>Azure SQL</T>
        <T x={1066} y={476} size={27} family={mono} color={c.mint}>dbo.PowerBIIncidentEvents</T>
        <path d="M1066 506H1772" stroke={c.line}/>
        <T x={1066} y={552} size={25} color={c.muted}>SYNTHETIC INCIDENT RECORD</T>
        <T x={1066} y={612} size={27} color={c.muted}>order.id</T><T x={1253} y={612} size={29} family={mono}>{film.order}</T>
        <T x={1066} y={667} size={27} color={c.muted}>trace.id</T><T x={1253} y={667} size={27} family={mono}>{film.traceDisplay}</T>
        <T x={1066} y={722} size={27} color={c.muted}>outcome</T><T x={1253} y={722} size={29} color={c.coral}>GHOST_ORDER</T>
        <Appear f={f} at={38}><rect x={1066} y={790} width={706} height={76} rx={13} fill={c.raised}/><circle cx={1105} cy={828} r={14} fill={c.mint}/><path d="M1098 827l5 6 9-11" fill="none" stroke={c.ink} strokeWidth={2}/><T x={1140} y={840} size={33} color={c.mint}>Incident record stored</T></Appear>
      </Card>
    </Appear>
    <T x={112} y={970} size={24} color={c.muted}>Illustrative demo UI • Alert delivery is best effort</T><T x={1808} y={970} size={24} color={c.muted} anchor="end">Azure SQL is the reporting destination</T>
  </g>;
}
function End({f}: {readonly f: number}) {
  return <g>
    <Appear f={f} at={1} dy={16}>
      <T x={960} y={335} anchor="middle" size={26} spacing={5} color={c.mint}>AZURE OBSERVABILITY DEMONSTRATION</T>
      <T x={960} y={490} anchor="middle" size={120} spacing={-2.5} weight={500}>{film.brand}</T>
    </Appear>
    <Appear f={f} at={15}><T x={960} y={649} anchor="middle" size={49} weight={400}>A failed checkout. Traced to its cause.</T><T x={960} y={723} anchor="middle" size={35} color={c.muted}>Engineered on Microsoft Azure.</T></Appear>
    <Appear f={f} at={25}><T x={960} y={886} anchor="middle" size={32} color={c.mint}>{film.team}</T></Appear>
  </g>;
}

// One correlation line changes shape at each edit. It is not an architecture route.
const traces = [
  [[1808,853],[1620,853],[1420,853],[1280,853],[1130,853],[1080,853]],
  [[112,850],[370,850],[680,850],[960,850],[1250,850],[1808,850]],
  [[156,860],[557,860],[794,860],[1001,860],[1475,860],[1760,860]],
  [[164,500],[164,570],[164,640],[164,710],[164,780],[164,860]],
  [[112,918],[400,918],[730,918],[1090,918],[1475,918],[1808,918]],
  [[451,550],[630,550],[810,550],[1110,550],[1290,550],[1469,550]],
] as const;
function Trace({frame, scene, local}: {readonly frame: number; readonly scene: number; readonly local: number}) {
  const target = traces[scene] ?? traces[0]; const prior = traces[Math.max(0,scene-1)] ?? traces[0];
  const blend = p(local,0,18);
  const d = target.map(([x,y],i)=>{const old=prior[i] ?? [x,y]; return `${i===0?'M':'L'}${old[0]+(x-old[0])*blend} ${old[1]+(y-old[1])*blend}`;}).join(' ');
  const visible = scene===0 ? p(frame,95,118) : scene===3 ? 0.36 : 0.85;
  const tip = scene===5 ? p(local,0,36) : 1;
  return <g opacity={visible}><path d={d} fill="none" stroke={c.mint} strokeWidth={12} opacity={0.07} strokeLinecap="round"/><path d={d} fill="none" stroke={c.mint} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1-tip}/>{scene!==5 ? <path d={d} fill="none" stroke={c.ivory} strokeWidth={4} pathLength={1} strokeDasharray="0.023 0.977" strokeDashoffset={-((frame%96)/96)} opacity={0.9}/> : null}</g>;
}
/** Deterministic, local-only film. All visible IDs reference the same synthetic checkout. */
export function Ayn29Master() {
  const frame = useCurrentFrame();
  const scene = Math.max(0, film.cuts.findIndex(cut => cut > frame) - 1);
  const start = film.cuts[scene] ?? 0; const local=frame-start;
  const priorStart = film.cuts[Math.max(0, scene-1)] ?? 0;
  const priorFrame = start-priorStart-1;
  const wipe = scene===0 ? 1920 : 1920*p(local,0,18);
  return <AbsoluteFill style={{backgroundColor:c.bg}}>
    <Audio src={staticFile('film/sound-design.wav')}/>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{fontFamily:'Ubuntu Sans, DejaVu Sans, sans-serif'}}>
      <defs><clipPath id="incoming"><rect x={0} y={0} width={wipe} height={1080}/></clipPath><clipPath id="outgoing"><rect x={wipe} y={0} width={1920-wipe} height={1080}/></clipPath><radialGradient id="light" cx="70%" cy="40%" r="75%"><stop offset="0" stopColor="#315842" stopOpacity="0.33"/><stop offset="1" stopColor={c.bg} stopOpacity="0"/></radialGradient><pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" stroke={c.mint} strokeOpacity="0.025" fill="none"/></pattern></defs>
      <rect width="1920" height="1080" fill="url(#light)"/><rect width="1920" height="1080" fill="url(#grid)"/>
      {scene>0 && scene<5 && (scene!==1 || local>=18) ? <g><T x={112} y={132} size={27} spacing={3} color={c.mint}>{film.brand}</T><T x={1808} y={132} size={24} color={c.muted} anchor="end">{['','CORRELATE','CONNECT','INVESTIGATE','ACT'][scene]}</T></g> : null}
      {scene>0 && local<18 ? <g clipPath="url(#outgoing)">{scene===1?<Checkout f={priorFrame}/>:scene===2?<Correlation f={priorFrame}/>:scene===3?<Azure f={priorFrame}/>:scene===4?<Investigation f={priorFrame}/>:<Outputs f={priorFrame}/>}</g> : null}
      <g clipPath="url(#incoming)">{scene===0?<Checkout f={local}/>:scene===1?<Correlation f={local}/>:scene===2?<Azure f={local}/>:scene===3?<Investigation f={local}/>:scene===4?<Outputs f={local}/>:<End f={local}/>}</g>
      <Trace frame={frame} scene={scene} local={local}/>
    </svg>
  </AbsoluteFill>;
}
