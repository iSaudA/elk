# Final quality report

Master: `ayn-al-sijill-29s.mp4`.

## Measured delivery properties

- Container and video duration: 29.000000 seconds, below 30 seconds.
- Picture: 1920×1080, 16:9, progressive, constant 30/1 fps.
- Decoded video frame count: 870. Frames 0 through 869.
- Video: H.264 High profile, yuv420p.
- Audio: AAC LC, stereo, 48,000 Hz, encoded from the original WAV at a 320 kb/s target.
- Original stereo sound design is present. Final measured integrated loudness: -19.97 LUFS; true peak: -7.95 dBTP; loudness range: 2.20 LU.
- Audio falls below -60 dB at 28.7408 seconds. The final 0.2 seconds of the source WAV are silent. AAC decoder padding can extend decoded audio packets slightly beyond the container timeline; the presented container is exactly 29 seconds.
- MP4 atom inspection confirms `moov` precedes `mdat`, supporting fast-start playback.
- FFmpeg decoded every video frame and audio packet without reporting errors.

`verification.json`, `faststart.json`, `audio-analysis.txt`, and `audio-silence-check.txt` retain the measurements. `checksums.sha256` identifies the delivered files.

## Inspection performed

A complete 960×540 draft was rendered first. Decoded frames at 2.8, 5.5, 10, 16, 22, and 27.5 seconds, plus the frames immediately before and at every scene boundary, were visually inspected.

The first review found dips toward an empty frame during transitions and a camera transform that could push a heading toward the safe margin. The scene transitions were revised, and the global camera transform was replaced by an expanding Kibana pane. Essential event-label text was enlarged to 32 pixels. The soundtrack was reduced by approximately 3 dB.

A second full-resolution review found overlapping headlines during dissolves. Those were replaced with complementary spatial masks, so outgoing and incoming text no longer occupy the same pixels. The final MP4 was rendered again, decoded, and inspected through a 25-frame transition sheet, the six representative scenes, the full-resolution investigation frame, and a two-frames-per-second overview of the complete film. The last three seconds remain settled on the brand. There is no black end frame.

A 56 ms container extension caused by the renderer's audio handling was removed by muxing directly from the exact-length original WAV. The final duration was then verified again.

TypeScript checks passed. The local rendering command completed successfully. The full trace is 32 hexadecimal characters; all six fixture events share the same trace, order, and transaction IDs. Shared scene constants provide the displayed identifiers throughout.

## Source and scope check

The source presentation was read directly. The six event labels retain the deck's order. The cause is a database connection pool timeout, with `order-service` as the failing service and `postgresql` as the database event source. HTTP 500 and the failed order remain visible after the cause is understood.

Azure Functions, HTTPS/Caddy ingestion, Logstash, Elasticsearch, and the Kibana investigation view retain their documented relationships. ELK is shown on one VM. Telegram originates from Functions; SQL reporting is labeled as the separate Logstash → authenticated reporting Function → Azure SQL path. Azure SQL is not portrayed as the failed PostgreSQL source. No recovery, refund, production result, uptime claim, or published Power BI report is shown.

## Limitations

Interfaces are designed reconstructions and are labeled illustrative. All data is synthetic. No live endpoints or secrets were used.

No narration was generated because a suitable configured local natural voice was unavailable. The recording script is included in `storyboard.md`.

Review used decoded frame sequences and objective audio measurements. No uninterrupted real-time audiovisual audition or subjective listening review was performed. The playable MP4 itself passed full decoding and media-format checks.

The sandbox initially failed to start due to an unsupported `/mnt/wslg/distro` mount. Authorized host execution was used for local file work and rendering. No system mount or infrastructure changes were made. No rendering blocker remains.
