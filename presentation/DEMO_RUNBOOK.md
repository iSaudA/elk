# AYN AL-SIJILL demo plan

## Recommendation

Use a 20 to 25 second silent screen recording after slide 3. Show the real Azure demo rather than stock footage or a generic animation. Then use slides 9 to 11 for a live Ghost Order walkthrough. The recording gives the audience a quick view of the result; the live sequence proves that it runs.

The 15-slide deck already allocates ten minutes across four presenters. The clip fits inside slide 4's 35 seconds. The live walkthrough fits inside the 120 seconds assigned to slides 9 to 11.

| Time | Material | Presenter action |
| --- | --- | --- |
| 0:00 to 1:55 | Slides 1 to 3 | Saud introduces the project and the Ghost Order failure. |
| 1:55 to 2:30 | Slide 4 | Play the 20 to 25 second clip, then state the four investigation steps. |
| 2:30 to 5:00 | Slides 5 to 8 | Retaj explains the Azure deployment and scope changes. |
| 5:00 to 7:00 | Slides 9 to 11 | Norah narrates the trace while Lama operates the Ghost Order request, Kibana filter, and Telegram card. |
| 7:00 to 7:30 | Slide 12 | Explain the verified Azure SQL reporting path. |
| 7:30 to 10:00 | Slides 13 to 15 | Lama covers access, deployment checks, and the result. |

## Opening clip: 25 seconds

Record the actual desktop at 1080p. Keep the clip silent and add only short captions. Rehearse with the same projector or presentation laptop.

| Seconds | Shot | On-screen caption |
| --- | --- | --- |
| 0 to 5 | Trigger the dedicated Ghost Order endpoint. Show the response status. | HTTP 500: Ghost Order |
| 5 to 10 | Highlight the returned trace ID and order ID. | One checkout, one trace |
| 10 to 18 | Filter Kibana by the trace ID. Show PAYMENT_SUCCESS, ORDER_CREATE_FAILED, and DATABASE_TIMEOUT. | The failed step is visible |
| 18 to 25 | Show the Telegram incident card and its Kibana button. | The alert opens the same trace |

Use real output from the synthetic system. Keep secrets, bot tokens, admin passwords, and unrelated notifications outside the recording. A clear cursor movement and readable zoom matter more than transitions.

## Live walkthrough: 2 minutes

1. Before the presentation, make sure the Azure VM is running and Kibana is ready. The normal schedule starts it at 09:00 and deallocates it at 23:00 Riyadh time.
2. Keep the terminal ready with the shop token in an environment variable. Do not display the token or the Azure app settings page.
3. Run the dedicated Ghost Order request. The expected result is HTTP 500 with an order ID and trace ID.
4. Paste the trace ID into the Operations dashboard filter. Wait for indexing if necessary, then point to PAYMENT_SUCCESS, ORDER_CREATE_FAILED, and DATABASE_TIMEOUT.
5. Open the Telegram alert. Show the severity, cause, order ID, and button that opens the trace.
6. Return to slide 12. Explain that the same operational events were also validated in Azure SQL through the reporting Function. Do not present a Power BI report as complete.

The checkout endpoint is POST /api/shop/demo/ghost-order with the x-ayn-shop-token header. The repository's scripts/validate.sh already checks the normal and Ghost Order paths and the required correlated events. Run it before the audience arrives, from the Azure VM, as a preflight. It may take longer than a live-demo slot.

## If the live system is slow

Keep a separate 70 to 90 second recording of the complete walkthrough. Label it "Recorded Azure demo" when you play it. Use the same real trace in the HTTP response, Kibana, and Telegram shots so the audience can verify the connection. Return to the deck at slide 12.

## Video file

Export the clip as an MP4 with H.264 video. If it has audio, use AAC. Embed it in PowerPoint rather than linking to an external file, then test playback on the presentation computer. Microsoft recommends this format and documents how to insert an embedded video: https://support.microsoft.com/en-us/powerpoint/insert-and-play-a-video-file-from-your-computer.
