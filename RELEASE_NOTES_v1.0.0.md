# X easy Media Downloader v1.0.0

First public release of `X easy Media Downloader`.

## Included

- Timeline tweet media download button
- Single media-view floating download button
- Profile media-page batch collection and ZIP download
- Preview picker for multi-item downloads
- Separate filename template systems:
  - media file template
  - batch ZIP archive template
- Local download history with button-state feedback

## Main Interactions

- Timeline button:
  - Left click downloads current tweet media
  - Right click opens main download settings

- Single media-view button:
  - Left click downloads current tweet media
  - Right click opens main download settings

- Profile media-page batch button:
  - Left click starts batch collection and opens preview
  - Right click opens ZIP filename settings

## Template Defaults

Media files:

```text
X_{user-name}(@{user-id})_{post-time}
```

Batch ZIP archive:

```text
X_{user-name}(@{user-id})
```

## Supported Sites

- `https://x.com/*`
- `https://twitter.com/*`

## Notes

- Batch collection currently targets profile media pages and is best suited to media-page browsing workflows.
- Future X/Twitter UI changes may require maintenance updates.
