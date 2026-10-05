# AYN AL-SIJILL, 29-second film

Finished master: `output/ayn-al-sijill-29s.mp4`. Editable production source: `src/film/`. Original synthesized stereo soundtrack: `public/film/sound-design.wav`. Poster and six-scene contact sheet are in `output/`.

The earlier video projects, compositions, assets, and exports remain available. Their prior README is preserved as `README-previous.md`. This film has its own entry point and does not reuse their picture or audio assets.

## Working local setup

Requirements: Node.js 22 (tested with 22.22.2), Python 3, Pillow (tested with 10.2.0), FFmpeg/ffprobe (system installation), and installed Ubuntu Sans / Ubuntu Mono fonts with DejaVu fallback. No remote images, web fonts, API keys, or live Azure services are needed during rendering. System font files are not redistributed.

From the repository root in WSL:

```bash
. "$HOME/.nvm/nvm.sh"
nvm use default
cd video
npm ci
npm run film:render
```

If Pillow is missing, create a Python virtual environment and install `requirements.lock` with `python3 -m pip install -r requirements.lock`. FFmpeg and the named fonts are system prerequisites.

The existing matching Remotion CLI/core 4.0.528 installation and its bundled Chrome Headless Shell were used. The lockfile pins the installed dependencies. On a new machine, Remotion may download its browser on the first run. Keep the browser cache for offline renders.

`film:render` synthesizes the 29-second audio, typechecks, renders all 870 frames at 1920×1080, H.264 CRF 16, yuv420p, AAC 320 kb/s, then muxes the original WAV with FFmpeg to an exact 29-second timeline and puts the MP4 index before its media data for fast start. It verifies the final media, fully decodes it, and generates the poster, contact sheet, boundary review sheet, and verification JSON from the actual final MP4.

For a smaller draft or an editable preview:

```bash
npm run film:audio
npm run film:draft
python3 scripts/inspect-film.py output/draft.mp4
npm run film:studio
```

The draft command renders a complete 29-second 960×540 MP4. Studio is optional; it is not needed to produce the finished file.

## Edits

- `src/film/config.ts`: palette, shared synthetic identifiers, headlines, event names, frame boundaries, team, and technical delivery settings.
- `src/film/master.tsx`: precise SVG layouts, frame-driven state changes, camera transform, and continuous correlation line. Motion uses Remotion's composition frame exclusively, with no random or wall-clock animations.
- `scripts/synthesize-audio.py`: original chord bed, panned arpeggio, click, authorization cue, interruption, evidence ticks, resolution, and final fade.
- `public/film/demo-data.json`: full synthetic evidence fixture. Keep its identifiers synchronized with the config if changing them.
- `storyboard.md`: exact scene timings, deck mapping, scope notes, and script for a future human voice recording.

For structural timing changes, update the config cuts and the scene-local cues in `master.tsx` together, then update the audio cue times, storyboard, and expected verification values. The delivered sequence remains locked to 870 frames.

## Provenance and tooling

All new interface graphics and animation were authored programmatically for this film. The soundtrack is original local mathematical synthesis, with no samples or downloaded music. No stock footage, official service logos, or generated raster images are used. The presentation supplies project facts, spellings, and the green palette. `source-deck-text.md` records the text read from the deck and its fingerprint.

No paid service or new account was used. Remotion and React remain subject to their own dependency licenses; no third-party code or system fonts have been relicensed by this project. Consult installed dependency license files for redistribution of the tools. The editable source package excludes dependencies, prior assets, and system font files.

Official references consulted for the installed Remotion 4 APIs: [render CLI](https://www.remotion.dev/docs/cli/render), [frame interpolation](https://www.remotion.dev/docs/interpolate), and [audio](https://www.remotion.dev/docs/html5-audio).

## Inspection

See `output/quality-report.md` for the checks actually performed and remaining limitations. `output/verification.json` is the ffprobe output, `output/faststart.json` records MP4 atom ordering, and `output/review/final/` contains decoded evidence frames. `scripts/inspect-film.py` fails if duration, dimensions, frame rate, frame count, video/audio codecs, or pixel format are incorrect.

The original sandbox could not launch because of an unsupported `/mnt/wslg/distro` bind mount. Authorized host execution completed local rendering without changing mounts or accessing live infrastructure.
