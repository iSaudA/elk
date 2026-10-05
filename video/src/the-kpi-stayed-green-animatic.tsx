/* PROTOTYPE: Does one continuous order-token and trace metaphor communicate the value more powerfully than six dashboard scenes? */
import type {CSSProperties, ReactNode} from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const ink = '#f4f4f2';
const dim = '#7c7c78';
const rule = '#353533';
const paper = '#080808';
const panel = '#111110';
const font = 'Ubuntu Sans, DejaVu Sans, sans-serif';
const mono = 'Ubuntu Mono, Noto Sans Mono, monospace';

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

const windowOpacity = (frame: number, start: number, end: number, fade = 12) => {
  const enter = interpolate(frame, [start, start + fade], [0, 1], clamp);
  const exit = interpolate(frame, [end - fade, end], [1, 0], clamp);
  return Math.min(enter, exit);
};

type CopyProps = {
  readonly children: ReactNode;
  readonly from: number;
  readonly to: number;
  readonly align?: 'left' | 'center';
  readonly size?: number;
  readonly top?: number;
};

const Copy = ({children, from, to, align = 'left', size = 108, top = 120}: CopyProps) => {
  const frame = useCurrentFrame();
  const opacity = windowOpacity(frame, from, to, 10);
  const lift = interpolate(frame, [from, from + 18], [22, 0], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: align === 'center' ? 180 : 104,
        right: align === 'center' ? 180 : 820,
        color: ink,
        fontFamily: font,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: -4,
        lineHeight: 0.95,
        opacity,
        textAlign: align,
        transform: 'translateY(' + lift + 'px)',
      }}
    >
      {children}
    </div>
  );
};

const FrameCounter = () => {
  const frame = useCurrentFrame();
  const seconds = (frame / 30).toFixed(1).padStart(4, '0');
  return (
    <div style={{position: 'absolute', left: 44, bottom: 34, fontFamily: mono, fontSize: 17, color: dim}}>
      PROTOTYPE / {seconds}s / FRAME {String(frame).padStart(3, '0')}
    </div>
  );
};

const KpiIndicator = () => {
  const frame = useCurrentFrame();
  const opacity = windowOpacity(frame, 0, 320, 12);
  const rise = interpolate(frame, [15, 80], [0.55, 1], clamp);
  const bars = [0.62, 0.68, 0.66, 0.74, 0.78, 0.82, 0.88, 0.94] as const;

  return (
    <div style={{position: 'absolute', right: 88, top: 72, width: 330, opacity}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 16, color: dim}}>
        <span>PAYMENT KPI</span>
        <span style={{color: ink}}>HEALTHY</span>
      </div>
      <div style={{height: 58, display: 'flex', alignItems: 'flex-end', gap: 7, marginTop: 16}}>
        {bars.map((height, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: String(height * 100) + '%',
              background: index === 7 ? ink : rule,
              transformOrigin: 'bottom',
              transform: 'scaleY(' + rise + ')',
            }}
          />
        ))}
      </div>
    </div>
  );
};

const OrderWorld = () => {
  const frame = useCurrentFrame();
  const opacity = windowOpacity(frame, 0, 320, 16);
  const travelX = interpolate(frame, [0, 105], [180, 984], clamp);
  const fallY = interpolate(frame, [105, 205], [520, 930], clamp);
  const tokenY = frame < 105 ? 520 : fallY;
  const tokenScale = interpolate(frame, [105, 205], [1, 0.58], clamp);
  const cameraScale = interpolate(frame, [0, 110, 220, 300], [1.16, 1.16, 0.92, 0.92], clamp);
  const cameraY = interpolate(frame, [105, 220], [-20, -125], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        transform: 'translateY(' + cameraY + 'px) scale(' + cameraScale + ')',
      }}
    >
      <div style={{position: 'absolute', left: 70, top: 516, width: 920, height: 8, background: ink}} />
      <div style={{position: 'absolute', left: 1128, right: 70, top: 516, height: 8, background: rule}} />
      <div style={{position: 'absolute', left: 976, top: 475, width: 34, height: 92, border: '2px solid ' + ink}} />
      <div style={{position: 'absolute', left: 1110, top: 475, width: 34, height: 92, border: '2px solid ' + rule}} />
      <div
        style={{
          position: 'absolute',
          left: travelX,
          top: tokenY,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: ink,
          boxShadow: '0 0 0 12px ' + paper + ', 0 0 0 14px ' + dim,
          transform: 'translate(-50%, -50%) scale(' + tokenScale + ')',
        }}
      />
      <div style={{position: 'absolute', left: 1030, top: 585, width: 66, textAlign: 'center', fontFamily: mono, fontSize: 15, color: dim}}>
        EVENT GAP
      </div>
    </div>
  );
};

const TraceActivation = () => {
  const frame = useCurrentFrame();
  const opacity = windowOpacity(frame, 285, 610, 15);
  const draw = interpolate(frame, [300, 405], [0, 1], clamp);

  return (
    <svg
      width="1920"
      height="1080"
      viewBox="0 0 1920 1080"
      style={{position: 'absolute', inset: 0, opacity}}
      aria-label="A trace line dives through the missing order gap and connects operational evidence."
    >
      <path
        d="M 1045 80 C 1045 270, 1045 350, 1045 505 C 1045 650, 930 705, 760 720 C 550 740, 500 835, 690 875 C 890 920, 1140 860, 1270 700"
        fill="none"
        stroke={ink}
        strokeWidth="5"
        strokeDasharray="2300"
        strokeDashoffset={2300 * (1 - draw)}
      />
      <circle cx="1045" cy="80" r="13" fill={ink} />
      <circle cx="1270" cy="700" r="13" fill={ink} opacity={draw} />
    </svg>
  );
};

const EvidenceSequence = () => {
  const frame = useCurrentFrame();
  const opacity = windowOpacity(frame, 405, 615, 14);
  const entries = [
    {label: 'PAYMENT_SUCCESS', detail: '14:22:07.114', x: 180, delay: 420},
    {label: 'ORDER_CREATED', detail: 'NO EVENT', x: 710, delay: 465},
    {label: 'DATABASE_TIMEOUT', detail: '14:22:07.283', x: 1240, delay: 510},
  ] as const;

  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <div style={{position: 'absolute', left: 270, right: 270, top: 650, height: 3, background: rule}} />
      {entries.map((entry, index) => {
        const reveal = interpolate(frame, [entry.delay, entry.delay + 20], [0, 1], clamp);
        const missing = index === 1;
        return (
          <div
            key={entry.label}
            style={{
              position: 'absolute',
              left: entry.x,
              top: 570,
              width: 500,
              height: 170,
              border: (missing ? '2px dashed ' : '1px solid ') + (missing ? dim : ink),
              background: missing ? paper : panel,
              opacity: reveal,
              padding: 28,
              transform: 'translateY(' + (1 - reveal) * 24 + 'px)',
            }}
          >
            <div style={{fontFamily: mono, fontSize: 17, color: missing ? dim : ink}}>0{index + 1}</div>
            <div style={{fontFamily: mono, fontSize: 26, marginTop: 25, color: missing ? dim : ink}}>{entry.label}</div>
            <div style={{fontFamily: mono, fontSize: 16, marginTop: 12, color: dim}}>{entry.detail}</div>
          </div>
        );
      })}
    </div>
  );
};

const IncidentProof = () => {
  const frame = useCurrentFrame();
  const opacity = windowOpacity(frame, 585, 735, 14);
  const settle = interpolate(frame, [605, 635], [70, 0], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        right: 130,
        top: 210,
        width: 680,
        padding: 46,
        border: '1px solid ' + ink,
        background: panel,
        opacity,
        transform: 'translateY(' + settle + 'px)',
      }}
    >
      <div style={{fontFamily: mono, fontSize: 16, color: dim}}>INCIDENT / GHOST ORDER</div>
      <div style={{fontFamily: font, fontSize: 54, fontWeight: 700, letterSpacing: -2, marginTop: 28}}>Cause found.</div>
      <div style={proofRowStyle}><span>IMPACT</span><strong>Payment approved, order missing</strong></div>
      <div style={proofRowStyle}><span>CAUSE</span><strong>Database connection timeout</strong></div>
      <div style={proofRowStyle}><span>TRACE</span><strong>trc-8F21-A91D</strong></div>
    </div>
  );
};

const AzureTrust = () => {
  const frame = useCurrentFrame();
  const opacity = windowOpacity(frame, 705, 815, 12);
  const line = interpolate(frame, [720, 780], [0, 1], clamp);

  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden="true">
        <path
          d="M -80 720 C 400 720, 560 610, 900 610 C 1240 610, 1370 720, 2000 720"
          fill="none"
          stroke={ink}
          strokeWidth="5"
          strokeDasharray="2300"
          strokeDashoffset={2300 * (1 - line)}
        />
      </svg>
      <div style={{position: 'absolute', left: 765, top: 480, width: 390, padding: '34px 40px', border: '1px solid ' + ink, background: paper, textAlign: 'center'}}>
        <div style={{fontFamily: font, fontSize: 44, fontWeight: 700, letterSpacing: -1.4}}>AZURE</div>
        <div style={{fontFamily: mono, fontSize: 15, color: dim, marginTop: 12}}>TRUSTED DEPLOYMENT ENVIRONMENT</div>
      </div>
    </div>
  );
};

const FinalFrame = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [805, 825], [0, 1], clamp);
  const ring = interpolate(frame, [810, 850], [0.6, 1], clamp);

  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <div style={{position: 'absolute', left: 120, top: 230, width: 330, height: 220}}>
        <div style={{position: 'absolute', left: 0, top: 40, width: 320, height: 140, border: '5px solid ' + ink, borderRadius: '52% 48% 52% 48%', transform: 'scale(' + ring + ')'}} />
        <div style={{position: 'absolute', left: 118, top: 78, width: 84, height: 84, borderRadius: '50%', background: ink}} />
      </div>
      <div style={{position: 'absolute', left: 540, top: 228, right: 120}}>
        <div style={{fontFamily: mono, fontSize: 20, letterSpacing: 2.8, color: dim}}>AYN AL-SIJILL</div>
        <div style={{fontFamily: font, fontSize: 92, fontWeight: 700, letterSpacing: -4.5, lineHeight: 0.98, marginTop: 28}}>
          See what the KPI misses.
        </div>
        <div style={{fontFamily: mono, fontSize: 20, letterSpacing: 1.4, marginTop: 48, color: ink}}>
          BOOK A LIVE GHOST ORDER WALKTHROUGH
        </div>
      </div>
    </div>
  );
};

const proofRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '115px 1fr',
  gap: 18,
  borderTop: '1px solid ' + rule,
  paddingTop: 19,
  marginTop: 19,
  fontFamily: mono,
  fontSize: 17,
  color: dim,
};

/** Renders the throwaway black-and-white timing animatic for "The KPI Stayed Green." */
export const TheKpiStayedGreenAnimatic = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = frame / (durationInFrames - 1);

  return (
    <AbsoluteFill style={{background: paper, color: ink, overflow: 'hidden'}}>
      <Audio src={staticFile('audio/kpi-stayed-green-audio-sketch.wav')} />
      <KpiIndicator />
      <OrderWorld />
      <TraceActivation />
      <EvidenceSequence />
      <IncidentProof />
      <AzureTrust />
      <FinalFrame />

      <Copy from={0} to={92}>PAID.</Copy>
      <Copy from={90} to={208}>But no order.</Copy>
      <Copy from={205} to={295} align="center" size={118} top={220}>The KPI stayed green.</Copy>
      <Copy from={305} to={405} size={84}>AYN AL-SIJILL sees the gap.</Copy>
      <Copy from={420} to={585} size={88}>Detect.<br />Correlate.<br />Explain.</Copy>
      <Copy from={575} to={705} size={90}>Context to act.</Copy>
      <Copy from={700} to={805} align="center" size={96} top={175}>Deployed on Azure.</Copy>

      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, background: rule}}>
        <div style={{width: '100%', height: '100%', background: ink, transformOrigin: 'left', transform: 'scaleX(' + progress + ')'}} />
      </div>
      <FrameCounter />
    </AbsoluteFill>
  );
};
