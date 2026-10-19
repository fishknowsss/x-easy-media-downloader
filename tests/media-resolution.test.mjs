import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../X easy Media Downloader.user.js', import.meta.url), 'utf8');

// Execute the production functions in their actual closure, stopping before startup.
// Network access and userscript downloads are never available to this harness.
function harness(gmRequest = () => { throw new Error('Unexpected request'); }) {
    const startup = '    init().catch(error => {';
    assert.equal(source.split(startup).length, 2, 'Expected one bootstrap seam');
    const context = {
        URL, Blob,
        navigator: { userAgent: 'test', language: 'en' },
        location: { hostname: 'x.com', pathname: '/test/status/123', href: 'https://x.com/test/status/123' },
        localStorage: { getItem: () => null },
        document: { cookie: '' },
        console: { warn() {}, error() {} },
        GM_xmlhttpRequest: gmRequest,
    };
    vm.runInNewContext(source.replace(startup,
        `    globalThis.core = { collectDomMedia, collectGraphMedia, pickBestVideoVariant, resolveMedia, state };\n    return;\n${startup}`), context);
    return context.core;
}

const payload = media => ({ data: { tweetResult: { result: { legacy: { extended_entities: { media } } } } } });
const gif = {
    type: 'animated_gif', media_url_https: 'https://pbs.twimg.com/tweet_video_thumb/AbCd.jpg',
    video_info: { variants: [{ content_type: 'video/mp4', url: 'https://video.twimg.com/tweet_video/AbCd.mp4' }] },
};

test('GraphQL retains GIF MP4 variants that do not declare bitrate', () => {
    const core = harness();
    const items = core.collectGraphMedia(payload([gif]));
    assert.equal(items.length, 1);
    assert.equal(items[0].url, gif.video_info.variants[0].url);
    assert.equal(items[0].typeLabel, 'gif');
});

test('GraphQL still selects the highest-bitrate MP4 and ignores HLS', () => {
    const core = harness();
    const best = core.pickBestVideoVariant({ video_info: { variants: [
        { content_type: 'application/x-mpegURL', url: 'playlist.m3u8', bitrate: 9000000 },
        { content_type: 'video/mp4', url: 'low.mp4', bitrate: 256000 },
        { content_type: 'video/mp4', url: 'high.mp4', bitrate: 2176000 },
    ] } });
    assert.equal(best.url, 'high.mp4');
    assert.equal(core.pickBestVideoVariant({ video_info: { variants: [] } }), null);
});

test('DOM GIF thumbnail extensions are replaced when deriving the MP4 address', () => {
    const core = harness();
    for (const src of [
        'https://pbs.twimg.com/tweet_video_thumb/AbCd.jpg',
        'https://pbs.twimg.com/tweet_video_thumb/AbCd.jpg?name=small',
        'https://pbs.twimg.com/tweet_video_thumb/AbCd?format=jpg&name=small',
    ]) {
        const article = { querySelectorAll: selector => selector === 'img[src]' ? [{ src }] : [] };
        const items = core.collectDomMedia(article).gifs;
        assert.equal(items.length, 1);
        assert.equal(items[0].url, 'https://video.twimg.com/tweet_video/AbCd.mp4', src);
    }
});

test('a transient GraphQL failure can be retried instead of caching an empty result', async () => {
    let requests = 0;
    const core = harness(options => {
        requests++;
        if (requests === 1) options.onerror(new Error('offline'));
        else options.onload({ status: 200, response: payload([gif]) });
    });
    const article = { querySelectorAll: () => [] };
    const context = { postId: '123' };
    assert.equal((await core.resolveMedia(context, article)).length, 0);
    const retried = await core.resolveMedia(context, article);
    assert.equal(requests, 2, 'User retry must make another GraphQL attempt');
    assert.equal(retried.length, 1);
    await core.resolveMedia(context, article);
    assert.equal(requests, 2, 'Successful results should still be cached');
});
