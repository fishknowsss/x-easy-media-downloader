# X_easyMediaDownloader

Media downloader userscript for X/Twitter.

It adds download entry points for:
- timeline tweets
- single media-view pages
- `/username/media` profile media pages

## Highlights

- Download photos, videos, and GIF media from supported tweet views
- Batch collect visible media from profile media pages
- Preview and select batch items before packaging
- Save batch downloads as ZIP
- Use filename templates for tweet media files
- Use a separate ZIP filename template for profile media-page archives
- Keep local download history and reflect status on buttons

## Supported Views

| View | Behavior |
| --- | --- |
| Timeline / tweet detail | Inline download button on media tweets |
| Single media view | Floating download button |
| Profile media page | Batch floating button with preview and ZIP export |

## Interaction

### Timeline / Tweet Detail

- Left click: download the current tweet media
- Right click: open main download settings

### Single Media View

- Left click: download the current tweet media
- Right click: open main download settings

### Profile Media Page

- Left click: start batch collection
- Automatic scroll collection runs on the media page
- A wide preview dialog opens after collection
- Right click: open ZIP filename settings for media-page batch download

## Filename Templates

### Media Files

Default template:

```text
X_{user-name}(@{user-id})_{post-time}
```

Used for:
- timeline downloads
- single media-view downloads
- files inside profile media-page ZIP archives

Supported placeholders:

| Placeholder | Meaning |
| --- | --- |
| `{user-id}` | account handle / user id |
| `{user-name}` | display name |
| `{post-id}` | tweet id |
| `{post-time}` | formatted tweet time |
| `{media-type}` | photo / video / gif |
| `{index}` | item index |
| `{ext}` | file extension |

### Batch ZIP Archive

Default template:

```text
X_{user-name}(@{user-id})
```

Used only for:
- outer ZIP filename generated from `/username/media`

Supported placeholders:

| Placeholder | Meaning |
| --- | --- |
| `{user-id}` | account handle / user id |
| `{user-name}` | display name |

## Batch Flow

```text
Open /username/media
    ->
Click batch button
    ->
Auto-scroll and collect media
    ->
Open wide preview dialog
    ->
Select wanted items
    ->
Download ZIP
```

## Installation

1. Install a userscript manager such as Tampermonkey.
2. Open `X_easyMediaDownloader.user.js`.
3. Install the script in your userscript manager.
4. Visit `https://x.com/*` or `https://twitter.com/*`.

## Repository Files

- `X_easyMediaDownloader.user.js`: main userscript
- `README.md`: project overview
- `LICENSE`: repository license text
- `RELEASE_NOTES_v1.0.0.md`: first release notes draft for GitHub Releases

## Version

Current release target:

```text
v1.0.0
```

## Notes

- This project targets the current X/Twitter web UI structure.
- Future site changes may require selector or behavior updates.
- Local download history is stored in the browser.
