import {Composition} from 'remotion';
import {AynPromo} from './ayn-promo';
import {TheKpiStayedGreenAnimatic} from './the-kpi-stayed-green-animatic';

/** Registers the 30-second AYN AL-SIJILL promotional composition. */
export const VideoRoot = () => (
  <>
    <Composition
      id="AYNPromo"
      component={AynPromo}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="TheKpiStayedGreenAnimatic"
      component={TheKpiStayedGreenAnimatic}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
