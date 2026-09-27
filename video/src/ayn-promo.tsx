/* Hallmark · pre-emit critique: P5 H5 E5 S5 R4 V5 */
/* Hallmark · genre: atmospheric · macrostructure: Narrative Workflow · theme: Midnight · enrichment: Tier A motion craft */
import type {CSSProperties, ReactNode} from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const colors = {
  canvas: 'oklch(13% 0.018 242)',
  canvasDeep: 'oklch(9% 0.016 242)',
  surface: 'oklch(18% 0.022 242)',
  surfaceRaised: 'oklch(22% 0.025 242)',
  rule: 'oklch(36% 0.028 242)',
  ruleSoft: 'oklch(28% 0.024 242)',
  ink: 'oklch(96% 0.008 220)',
  inkSoft: 'oklch(80% 0.018 225)',
  muted: 'oklch(62% 0.025 235)',
  cobalt: 'oklch(68% 0.19 252)',
  cobaltBright: 'oklch(78% 0.16 242)',
  cobaltWash: 'oklch(58% 0.16 252 / 0.16)',
  mint: 'oklch(79% 0.13 158)',
  mintWash: 'oklch(70% 0.12 158 / 0.14)',
  coral: 'oklch(70% 0.18 28)',
  coralWash: 'oklch(63% 0.18 28 / 0.15)',
  transparent: 'oklch(13% 0.018 242 / 0)',
  shadow: 'oklch(5% 0.012 242 / 0.56)',
} as const;

const fonts = {
  display: 'Ubuntu Sans, DejaVu Sans, sans-serif',
  body: 'Ubuntu Sans, DejaVu Sans, sans-serif',
  mono: 'Ubuntu Mono, Noto Sans Mono, monospace',
} as const;

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

const sceneTiming = {
  intro: {from: 0, duration: 120},
  risk: {from: 120, duration: 150},
  detect: {from: 270, duration: 180},
  correlate: {from: 450, duration: 180},
  azure: {from: 630, duration: 150},
  final: {from: 780, duration: 120},
} as const;

const fadeFor = (frame: number, duration: number) => {
  const fadeIn = interpolate(frame, [0, 14], [0, 1], clamp);
  const fadeOut = interpolate(frame, [duration - 14, duration], [1, 0], clamp);
  return Math.min(fadeIn, fadeOut);
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

type FilmFrameProps = {
  readonly children: ReactNode;
  readonly duration: number;
  readonly section?: string;
  readonly progress?: number;
};

const FilmFrame = ({children, duration, section, progress}: FilmFrameProps) => {
  const frame = useCurrentFrame();
  const opacity = fadeFor(frame, duration);
  const scan = interpolate(frame, [0, duration], [-20, 120], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.canvas,
        color: colors.ink,
        fontFamily: fonts.body,
        opacity,
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle at 84% 16%, ${colors.cobaltWash}, ${colors.transparent} 30%), radial-gradient(circle at 18% 96%, ${colors.mintWash}, ${colors.transparent} 25%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${colors.ruleSoft} 1px, ${colors.transparent} 1px), linear-gradient(90deg, ${colors.ruleSoft} 1px, ${colors.transparent} 1px)`,
          backgroundSize: '96px 96px',
          maskImage: `linear-gradient(to bottom, ${colors.transparent}, ${colors.canvas} 18%, ${colors.canvas} 82%, ${colors.transparent})`,
          opacity: 0.32,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: colors.cobaltBright,
          boxShadow: `0 0 42px ${colors.cobalt}`,
          opacity: 0.12,
          transform: `translateX(${scan * 19.2}px)`,
        }}
      />
      <TopRail section={section ?? 'OPERATIONAL SIGNAL ONLINE'} />
      {children}
      <BottomRail progress={progress ?? 0} />
    </AbsoluteFill>
  );
};

const TopRail = ({section}: {readonly section: string}) => (
  <div
    style={{
      position: 'absolute',
      top: 50,
      left: 72,
      right: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
    }}
  >
    <Brand />
    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
      <div style={{width: 7, height: 7, borderRadius: '50%', background: colors.mint, boxShadow: `0 0 16px ${colors.mint}`}} />
      <span style={{fontFamily: fonts.mono, fontSize: 16, letterSpacing: 1.8, color: colors.inkSoft}}>
        {section ?? 'OPERATIONAL SIGNAL ONLINE'}
      </span>
    </div>
  </div>
);

const Brand = ({large = false}: {readonly large?: boolean}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: large ? 22 : 14}}>
    <div style={{position: 'relative', width: large ? 60 : 38, height: large ? 60 : 38}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `${large ? 3 : 2}px solid ${colors.ink}`,
          borderRadius: '52% 48% 52% 48%',
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: large ? 20 : 13,
          borderRadius: '50%',
          background: colors.cobalt,
          boxShadow: `0 0 24px ${colors.cobalt}`,
        }}
      />
    </div>
    <div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: large ? 36 : 23,
          fontWeight: 700,
          letterSpacing: large ? -0.6 : -0.2,
        }}
      >
        AYN AL-SIJILL
      </div>
      {large ? (
        <div style={{fontFamily: fonts.mono, fontSize: 14, letterSpacing: 2.6, color: colors.muted, marginTop: 4}}>
          OPERATIONAL OBSERVABILITY
        </div>
      ) : null}
    </div>
  </div>
);

const BottomRail = ({progress}: {readonly progress: number}) => (
  <div style={{position: 'absolute', left: 72, right: 72, bottom: 44, zIndex: 10}}>
    <div style={{height: 1, background: colors.ruleSoft, position: 'relative', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.cobalt,
          transformOrigin: 'left center',
          transform: `scaleX(${progress})`,
        }}
      />
    </div>
  </div>
);

type RevealProps = {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly distance?: number;
  readonly style?: CSSProperties;
};

const Reveal = ({children, delay = 0, distance = 26, style}: RevealProps) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [delay, delay + 24], [0, 1], {...clamp, easing: easeOut});
  return (
    <div style={{...style, opacity: reveal, transform: `translateY(${(1 - reveal) * distance}px)`}}>
      {children}
    </div>
  );
};

const StageLabel = ({index, label}: {readonly index: string; readonly label: string}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 15, fontFamily: fonts.mono, fontSize: 18, letterSpacing: 2.4, color: colors.cobaltBright}}>
    <span style={{color: colors.muted}}>{index}</span>
    <span style={{width: 34, height: 1, background: colors.cobalt}} />
    <span>{label}</span>
  </div>
);

const IntroScene = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, sceneTiming.intro.duration], [0, 0.15], clamp);
  const cursor = interpolate(frame, [26, 96], [0, 1], clamp);

  return (
    <FilmFrame duration={sceneTiming.intro.duration} progress={progress}>
      <div style={{position: 'absolute', left: 130, top: 254, width: 1500}}>
        <Reveal delay={8}>
          <div style={{fontFamily: fonts.mono, color: colors.cobaltBright, fontSize: 18, letterSpacing: 3}}>
            YOUR BUSINESS, IN REAL TIME
          </div>
        </Reveal>
        <Reveal delay={18} distance={42}>
          <h1
            style={{
              margin: '28px 0 0',
              fontFamily: fonts.display,
              fontSize: 118,
              lineHeight: 0.96,
              fontWeight: 700,
              letterSpacing: -5.8,
              maxWidth: 1500,
            }}
          >
            Every KPI is a promise.
          </h1>
        </Reveal>
        <Reveal delay={44}>
          <div style={{marginTop: 48, display: 'flex', alignItems: 'center', gap: 18}}>
            <div style={{width: 410, height: 3, background: colors.ruleSoft, overflow: 'hidden'}}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: colors.mint,
                  transformOrigin: 'left center',
                  transform: `scaleX(${cursor})`,
                }}
              />
            </div>
            <span style={{fontFamily: fonts.mono, fontSize: 18, color: colors.inkSoft}}>KEEP IT VISIBLE</span>
          </div>
        </Reveal>
      </div>
    </FilmFrame>
  );
};

const RiskScene = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, sceneTiming.risk.duration], [0.15, 0.31], clamp);
  const failure = spring({frame: frame - 62, fps: 30, config: {damping: 18, stiffness: 130, mass: 0.8}});
  const lineTravel = interpolate(frame, [20, 105], [-100, 100], clamp);

  return (
    <FilmFrame duration={sceneTiming.risk.duration} progress={progress} section="LIVE CHECKOUT JOURNEY">
      <div style={{position: 'absolute', left: 110, top: 192, width: 750}}>
        <Reveal delay={4}>
          <StageLabel index="00" label="THE BLIND SPOT" />
        </Reveal>
        <Reveal delay={12}>
          <h2 style={sceneHeadline}>The risk is what your dashboard misses.</h2>
        </Reveal>
        <Reveal delay={32}>
          <p style={sceneBody}>A payment clears. The order never appears. Your client only sees the failure.</p>
        </Reveal>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 102,
          top: 212,
          width: 760,
          height: 620,
          background: colors.surface,
          border: `1px solid ${colors.rule}`,
          borderRadius: 20,
          boxShadow: `0 36px 100px ${colors.shadow}`,
          overflow: 'hidden',
        }}
      >
        <div style={{padding: '34px 38px 26px', borderBottom: `1px solid ${colors.ruleSoft}`}}>
          <div style={{fontFamily: fonts.mono, fontSize: 15, color: colors.muted, letterSpacing: 1.4}}>ORDER JOURNEY / RS-4821</div>
        </div>
        <div style={{padding: '42px 38px'}}>
          <StatusRow label="Checkout received" status="LIVE" tone="success" delay={18} />
          <StatusRow label="Payment approved" status="APPROVED" tone="success" delay={34} />
          <div style={{position: 'relative'}}>
            <StatusRow label="Order created" status="NO EVENT" tone="failure" delay={64} />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.transparent}, ${colors.coralWash}, ${colors.transparent})`,
                opacity: failure,
                transform: `translateX(${lineTravel}%)`,
              }}
            />
          </div>
          <div
            style={{
              marginTop: 32,
              padding: '20px 22px',
              borderLeft: `3px solid ${colors.coral}`,
              background: colors.coralWash,
              opacity: failure,
              transform: `translateX(${(1 - failure) * 28}px)`,
            }}
          >
            <div style={{fontFamily: fonts.mono, color: colors.coral, fontSize: 17, letterSpacing: 1.2}}>GHOST ORDER DETECTED</div>
          </div>
        </div>
      </div>
    </FilmFrame>
  );
};

type StatusRowProps = {
  readonly label: string;
  readonly status: string;
  readonly tone: 'success' | 'failure';
  readonly delay: number;
};

const StatusRow = ({label, status, tone, delay}: StatusRowProps) => {
  const frame = useCurrentFrame();
  const visible = interpolate(frame, [delay, delay + 18], [0, 1], {...clamp, easing: easeOut});
  const signal = tone === 'success' ? colors.mint : colors.coral;
  const wash = tone === 'success' ? colors.mintWash : colors.coralWash;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '22px 0',
        borderBottom: `1px solid ${colors.ruleSoft}`,
        opacity: visible,
        transform: `translateY(${(1 - visible) * 14}px)`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <span style={{width: 10, height: 10, borderRadius: '50%', background: signal, boxShadow: `0 0 14px ${signal}`}} />
        <span style={{fontSize: 24, color: colors.inkSoft}}>{label}</span>
      </div>
      <span style={{fontFamily: fonts.mono, fontSize: 15, letterSpacing: 1.2, color: signal, background: wash, borderRadius: 6, padding: '8px 11px'}}>
        {status}
      </span>
    </div>
  );
};

const DetectScene = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, sceneTiming.detect.duration], [0.31, 0.52], clamp);
  const travel = interpolate(frame, [24, 135], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const services = ['CHECKOUT', 'PAYMENT', 'ORDER', 'DATABASE'];

  return (
    <FilmFrame duration={sceneTiming.detect.duration} progress={progress} section="CORRELATED EVENT STREAM">
      <div style={{position: 'absolute', left: 118, top: 176}}>
        <Reveal delay={2}>
          <StageLabel index="01" label="DETECT" />
        </Reveal>
        <Reveal delay={12}>
          <h2 style={{...sceneHeadline, maxWidth: 980}}>See the full journey.</h2>
        </Reveal>
        <Reveal delay={28}>
          <p style={{...sceneBody, maxWidth: 900}}>Every operational event stays connected across the services that shape your client experience.</p>
        </Reveal>
      </div>

      <div style={{position: 'absolute', left: 116, right: 116, top: 610, height: 220}}>
        <div style={{position: 'absolute', left: 84, right: 84, top: 54, height: 3, background: colors.rule}}>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: colors.cobalt,
              transformOrigin: 'left center',
              transform: `scaleX(${travel})`,
              boxShadow: `0 0 18px ${colors.cobalt}`,
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 42,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: colors.cobaltBright,
            boxShadow: `0 0 34px ${colors.cobalt}`,
            transform: `translateX(${1520 * travel - 14}px)`,
          }}
        />
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 64}}>
          {services.map((service, index) => {
            const active = interpolate(travel, [index / 3 - 0.05, index / 3 + 0.05], [0, 1], clamp);
            return (
              <div key={service} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div
                  style={{
                    width: 108,
                    height: 108,
                    borderRadius: '50%',
                    border: `2px solid ${active > 0.5 ? colors.cobaltBright : colors.rule}`,
                    background: active > 0.5 ? colors.cobaltWash : colors.surface,
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: active > 0.5 ? `0 0 38px ${colors.cobaltWash}` : 'none',
                  }}
                >
                  <span style={{fontFamily: fonts.mono, fontSize: 23, color: active > 0.5 ? colors.ink : colors.muted}}>0{index + 1}</span>
                </div>
                <span style={{fontFamily: fonts.mono, fontSize: 17, letterSpacing: 1.5, color: colors.inkSoft, marginTop: 20}}>{service}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Reveal delay={68} style={{position: 'absolute', right: 120, top: 410}}>
        <div style={{display: 'flex', gap: 12}}>
          {['order.id', 'trace.id', 'transaction.id'].map((field) => (
            <span key={field} style={idChipStyle}>{field}</span>
          ))}
        </div>
      </Reveal>
    </FilmFrame>
  );
};

const CorrelateScene = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, sceneTiming.correlate.duration], [0.52, 0.72], clamp);
  const alert = spring({frame: frame - 58, fps: 30, config: {damping: 20, stiffness: 105, mass: 0.9}});

  return (
    <FilmFrame duration={sceneTiming.correlate.duration} progress={progress} section="ROOT CAUSE / DATABASE TIMEOUT">
      <div style={{position: 'absolute', left: 110, top: 178, width: 700}}>
        <Reveal delay={2}>
          <StageLabel index="02" label="CORRELATE" />
        </Reveal>
        <Reveal delay={12}>
          <h2 style={sceneHeadline}>One trace. One cause.</h2>
        </Reveal>
        <Reveal delay={30}>
          <p style={sceneBody}>The team gets the context to act, not another dashboard to interpret.</p>
        </Reveal>
        <Reveal delay={44} style={{marginTop: 42}}>
          <div style={{fontFamily: fonts.mono, color: colors.muted, fontSize: 16, letterSpacing: 1.3}}>trace.id / trc-8F21-A91D</div>
          <div style={{marginTop: 14, width: 650}}>
            <TraceRow time="14:22:07.114" event="PAYMENT_SUCCESS" tone="success" />
            <TraceRow time="14:22:07.281" event="ORDER_CREATE_FAILED" tone="failure" />
            <TraceRow time="14:22:07.283" event="DATABASE_TIMEOUT" tone="failure" />
          </div>
        </Reveal>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 112,
          top: 186,
          width: 690,
          padding: 42,
          borderRadius: 20,
          background: colors.surfaceRaised,
          border: `1px solid ${colors.rule}`,
          boxShadow: `0 40px 110px ${colors.shadow}`,
          opacity: alert,
          transform: `translateX(${(1 - alert) * 80}px)`,
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{width: 38, height: 38, borderRadius: '50%', background: colors.cobalt, display: 'grid', placeItems: 'center', fontSize: 19}}>↗</div>
            <div>
              <div style={{fontSize: 21, fontWeight: 700}}>AYN Incident Bot</div>
              <div style={{fontFamily: fonts.mono, fontSize: 14, color: colors.muted, marginTop: 3}}>ALERT DELIVERED NOW</div>
            </div>
          </div>
          <span style={{fontFamily: fonts.mono, fontSize: 14, color: colors.coral, background: colors.coralWash, borderRadius: 6, padding: '8px 10px'}}>HIGH</span>
        </div>
        <div style={{height: 1, background: colors.ruleSoft, margin: '30px 0'}} />
        <div style={{fontFamily: fonts.display, fontSize: 40, fontWeight: 700, letterSpacing: -1.2}}>Ghost Order detected</div>
        <AlertDetail label="Impact" value="Payment approved, order missing" />
        <AlertDetail label="Cause" value="Database connection timeout" />
        <AlertDetail label="Service" value="order-service" />
        <div style={{marginTop: 30, border: `1px solid ${colors.cobalt}`, borderRadius: 8, padding: '17px 20px', color: colors.cobaltBright, fontFamily: fonts.mono, fontSize: 16, textAlign: 'center', letterSpacing: 1.2}}>
          OPEN MATCHING TRACE
        </div>
      </div>
    </FilmFrame>
  );
};

const TraceRow = ({time, event, tone}: {readonly time: string; readonly event: string; readonly tone: 'success' | 'failure'}) => {
  const signal = tone === 'success' ? colors.mint : colors.coral;
  return (
    <div style={{display: 'grid', gridTemplateColumns: '145px 1fr', gap: 18, padding: '16px 0', borderBottom: `1px solid ${colors.ruleSoft}`, fontFamily: fonts.mono, fontSize: 17}}>
      <span style={{color: colors.muted}}>{time}</span>
      <span style={{color: signal}}>{event}</span>
    </div>
  );
};

const AlertDetail = ({label, value}: {readonly label: string; readonly value: string}) => (
  <div style={{display: 'grid', gridTemplateColumns: '110px 1fr', gap: 16, marginTop: 22, fontSize: 20}}>
    <span style={{fontFamily: fonts.mono, color: colors.muted, fontSize: 15, letterSpacing: 1.1}}>{label.toUpperCase()}</span>
    <span style={{color: colors.inkSoft}}>{value}</span>
  </div>
);

const AzureScene = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, sceneTiming.azure.duration], [0.72, 0.88], clamp);
  const flow = interpolate(frame, [24, 128], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const nodes = [
    {label: 'AZURE FUNCTIONS', caption: 'workload', x: 170},
    {label: 'LOGSTASH', caption: 'process', x: 525},
    {label: 'ELASTICSEARCH', caption: 'retain', x: 880},
    {label: 'AZURE SQL', caption: 'report', x: 1235},
    {label: 'POWER BI', caption: 'measure', x: 1590},
  ] as const;

  return (
    <FilmFrame duration={sceneTiming.azure.duration} progress={progress} section="AZURE-NATIVE ARCHITECTURE">
      <div style={{position: 'absolute', left: 116, top: 176}}>
        <Reveal delay={2}>
          <StageLabel index="03" label="PROTECT" />
        </Reveal>
        <Reveal delay={10}>
          <h2 style={{...sceneHeadline, maxWidth: 1200}}>Built on Azure. Protected by design.</h2>
        </Reveal>
        <Reveal delay={28}>
          <p style={{...sceneBody, maxWidth: 980}}>Authenticated ingestion, restricted access, managed secrets, and reporting-ready data.</p>
        </Reveal>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: 540, height: 250}}>
        <div style={{position: 'absolute', left: 170, right: 170, top: 72, height: 2, background: colors.rule}}>
          <div style={{width: '100%', height: '100%', background: colors.cobalt, transformOrigin: 'left center', transform: `scaleX(${flow})`, boxShadow: `0 0 16px ${colors.cobalt}`}} />
        </div>
        {nodes.map((node, index) => {
          const visible = interpolate(flow, [index / 4 - 0.04, index / 4 + 0.06], [0.25, 1], clamp);
          return (
            <div key={node.label} style={{position: 'absolute', left: node.x, top: 30, width: 190, transform: 'translateX(-50%)', textAlign: 'center', opacity: visible}}>
              <div style={{width: 82, height: 82, margin: '0 auto', borderRadius: 18, border: `2px solid ${visible > 0.6 ? colors.cobaltBright : colors.rule}`, background: colors.surface, display: 'grid', placeItems: 'center', boxShadow: visible > 0.6 ? `0 0 30px ${colors.cobaltWash}` : 'none'}}>
                <span style={{fontFamily: fonts.mono, color: colors.cobaltBright, fontSize: 22}}>0{index + 1}</span>
              </div>
              <div style={{fontFamily: fonts.mono, color: colors.ink, fontSize: 15, letterSpacing: 1.1, marginTop: 18}}>{node.label}</div>
              <div style={{fontFamily: fonts.mono, color: colors.muted, fontSize: 13, letterSpacing: 1.2, marginTop: 5}}>{node.caption.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      <Reveal delay={70} style={{position: 'absolute', right: 118, bottom: 105}}>
        <div style={{display: 'flex', gap: 12}}>
          {['HTTPS', 'KEY VAULT', 'RESTRICTED ACCESS'].map((field) => (
            <span key={field} style={idChipStyle}>{field}</span>
          ))}
        </div>
      </Reveal>
    </FilmFrame>
  );
};

const FinalScene = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, sceneTiming.final.duration], [0.88, 1], clamp);
  const underline = interpolate(frame, [34, 82], [0, 1], {...clamp, easing: easeOut});

  return (
    <FilmFrame duration={sceneTiming.final.duration} progress={progress} section="CLIENT EXPERIENCE, IN VIEW">
      <div style={{position: 'absolute', left: 126, top: 196, right: 110}}>
        <Reveal delay={4}>
          <Brand large />
        </Reveal>
        <Reveal delay={15} distance={38}>
          <h2
            style={{
              margin: '64px 0 0',
              maxWidth: 1500,
              fontFamily: fonts.display,
              fontSize: 94,
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: -4.4,
            }}
          >
            Protect the KPIs your clients count on.
          </h2>
        </Reveal>
        <Reveal delay={38}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 62}}>
            <div>
              <div style={{fontFamily: fonts.mono, fontSize: 18, color: colors.cobaltBright, letterSpacing: 1.8}}>DETECT / TRACE / ACT</div>
              <div style={{width: 280, height: 2, background: colors.ruleSoft, marginTop: 16, overflow: 'hidden'}}>
                <div style={{width: '100%', height: '100%', background: colors.cobalt, transformOrigin: 'left center', transform: `scaleX(${underline})`}} />
              </div>
            </div>
            <div style={{border: `1px solid ${colors.cobalt}`, borderRadius: 8, padding: '18px 24px', fontFamily: fonts.mono, fontSize: 18, letterSpacing: 1.3, color: colors.cobaltBright}}>
              BOOK A LIVE WALKTHROUGH
            </div>
          </div>
        </Reveal>
      </div>
    </FilmFrame>
  );
};

const sceneHeadline: CSSProperties = {
  margin: '30px 0 0',
  maxWidth: 760,
  fontFamily: fonts.display,
  fontSize: 76,
  lineHeight: 1.02,
  fontWeight: 700,
  letterSpacing: -3.3,
};

const sceneBody: CSSProperties = {
  margin: '30px 0 0',
  maxWidth: 680,
  fontFamily: fonts.body,
  fontSize: 28,
  lineHeight: 1.42,
  fontWeight: 400,
  color: colors.inkSoft,
};

const idChipStyle: CSSProperties = {
  border: `1px solid ${colors.rule}`,
  background: colors.surface,
  borderRadius: 7,
  padding: '10px 14px',
  fontFamily: fonts.mono,
  fontSize: 15,
  letterSpacing: 1.1,
  color: colors.inkSoft,
};

/** Renders the complete 30-second AYN AL-SIJILL client promotional film. */
export const AynPromo = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const volume = interpolate(frame, [0, 20, durationInFrames - 45, durationInFrames], [0, 0.62, 0.62, 0], clamp);

  return (
    <AbsoluteFill style={{background: colors.canvasDeep}}>
      <Audio src={staticFile('audio/promo-bed.m4a')} volume={volume} />
      <Sequence from={sceneTiming.intro.from} durationInFrames={sceneTiming.intro.duration} premountFor={30}>
        <IntroScene />
      </Sequence>
      <Sequence from={sceneTiming.risk.from} durationInFrames={sceneTiming.risk.duration} premountFor={30}>
        <RiskScene />
      </Sequence>
      <Sequence from={sceneTiming.detect.from} durationInFrames={sceneTiming.detect.duration} premountFor={30}>
        <DetectScene />
      </Sequence>
      <Sequence from={sceneTiming.correlate.from} durationInFrames={sceneTiming.correlate.duration} premountFor={30}>
        <CorrelateScene />
      </Sequence>
      <Sequence from={sceneTiming.azure.from} durationInFrames={sceneTiming.azure.duration} premountFor={30}>
        <AzureScene />
      </Sequence>
      <Sequence from={sceneTiming.final.from} durationInFrames={sceneTiming.final.duration} premountFor={30}>
        <FinalScene />
      </Sequence>
    </AbsoluteFill>
  );
};
