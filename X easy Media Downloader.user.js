// ==UserScript==
// @name         X easy Media Downloader
// @name:en      X easy Media Downloader
// @name:zh-CN   X easy Media Downloader
// @name:zh-TW   X easy Media Downloader
// @description  Stable media downloader for X/Twitter with filename templates, local history, and media-view support.
// @description:en Stable media downloader for X/Twitter with filename templates, local history, and media-view support.
// @description:zh-CN 为 X/Twitter 推文提供稳定的图片、视频、GIF 下载按钮，支持文件名模板、本地下载历史和媒体页入口。
// @description:zh-TW 為 X/Twitter 推文提供穩定的圖片、影片、GIF 下載按鈕，支援檔名模板、本地下載歷史和媒體頁入口。
// @version      1.0.0
// @author       Fishknowsss
// @namespace    https://greasyfork.org/users/1441951
// @license      MIT
// @match        https://twitter.com/*
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @require      https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.min.js
// @require      https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js
// @connect      twitter.com
// @connect      x.com
// @connect      pbs.twimg.com
// @connect      video.twimg.com
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @downloadURL https://update.greasyfork.org/scripts/572221/X%20easy%20Media%20Downloader.user.js
// @updateURL https://update.greasyfork.org/scripts/572221/X%20easy%20Media%20Downloader.meta.js
// ==/UserScript==

/* jshint esversion: 11 */

(function () {
    'use strict';

    const SCRIPT_ID = 'x-easy-download';
    const STYLE_ID = `${SCRIPT_ID}-style`;
    const MODAL_ID = `${SCRIPT_ID}-modal`;
    const FLOATING_BUTTON_ID = `${SCRIPT_ID}-floating-button`;
    const BATCH_FLOATING_BUTTON_ID = `${SCRIPT_ID}-batch-floating-button`;
    const TOAST_CONTAINER_ID = `${SCRIPT_ID}-toasts`;
    const CONFIG_STORAGE_KEY = `${SCRIPT_ID}:config`;
    const DB_NAME = 'XEasyDownloadHistoryDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'history';
    const BATCH_SCROLL_IDLE_LIMIT = 5;
    const BATCH_SCROLL_DELAY = 2000;

    const GRAPHQL = {
        queryId: 'zAz9764BcLZOJ0JU2wrd1A',
        operationName: 'TweetResultByRestId',
        authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        features: {
            creator_subscriptions_tweet_preview_api_enabled: true,
            premium_content_api_read_enabled: false,
            communities_web_enable_tweet_community_results_fetch: true,
            c9s_tweet_anatomy_moderator_badge_enabled: true,
            responsive_web_grok_analyze_button_fetch_trends_enabled: false,
            responsive_web_grok_analyze_post_followups_enabled: false,
            responsive_web_jetfuel_frame: false,
            responsive_web_grok_share_attachment_enabled: true,
            articles_preview_enabled: true,
            responsive_web_edit_tweet_api_enabled: true,
            graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
            view_counts_everywhere_api_enabled: true,
            longform_notetweets_consumption_enabled: true,
            responsive_web_twitter_article_tweet_consumption_enabled: true,
            tweet_awards_web_tipping_enabled: false,
            responsive_web_grok_show_grok_translated_post: false,
            responsive_web_grok_analysis_button_from_backend: false,
            creator_subscriptions_quote_tweet_preview_enabled: false,
            freedom_of_speech_not_reach_fetch_enabled: true,
            standardized_nudges_misinfo: true,
            tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
            longform_notetweets_rich_text_read_enabled: true,
            longform_notetweets_inline_media_enabled: true,
            profile_label_improvements_pcf_label_in_post_enabled: true,
            rweb_tipjar_consumption_enabled: true,
            verified_phone_label_enabled: false,
            responsive_web_grok_image_annotation_enabled: true,
            responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
            responsive_web_graphql_timeline_navigation_enabled: true,
            responsive_web_enhance_cards_enabled: false
        },
        fieldToggles: {
            withArticleRichContentState: true,
            withArticlePlainText: false,
            withGrokAnalyze: false,
            withDisallowedReplyControls: false
        }
    };

    const LEGACY_DEFAULT_FILENAME_TEMPLATE = 'twitter_{user-name}(@{user-id})_{post-time}_{post-id}_{media-type}';
    const DEFAULT_FILENAME_TEMPLATE = 'X_{user-name}(@{user-id})_{post-time}';
    const DEFAULT_BATCH_ZIP_TEMPLATE = 'X_{user-name}(@{user-id})';

    const DEFAULT_CONFIG = Object.freeze({
        filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
        batchZipTemplate: DEFAULT_BATCH_ZIP_TEMPLATE,
        rememberHistory: true,
        zipOnMobile: true
    });

    const LANG = {
        'zh-CN': {
            button: { idle: '下载媒体', loading: '下载中', done: '已下载', failed: '下载失败' },
            menu: {
                openSettings: 'X_easyDownload: 打开设置',
                clearHistory: 'X_easyDownload: 清空下载历史'
            },
            modal: {
                title: 'X_easyDownload 设置',
                template: '文件名模板',
                templateHint: '支持占位符：{user-id} {user-name} {post-id} {post-time} {media-type} {index} {ext}',
                rememberHistory: '记录本地下载历史',
                zipOnMobile: '移动端多媒体打包为 ZIP',
                preview: '文件名预览',
                restore: '恢复默认',
                clearHistory: '清空历史',
                cancel: '取消',
                save: '保存'
            },
            picker: {
                title: '选择下载内容',
                mediaTitle: '媒体列表',
                cancel: '取消',
                confirm: '开始下载',
                selectNone: '至少选择一个媒体文件',
                singleVideo: '视频',
                singleGif: 'GIF',
                singlePhoto: '图片'
            },
            toast: {
                noMedia: '当前推文没有可下载媒体',
                resolving: '正在解析媒体资源…',
                downloading: '开始下载',
                downloadDone: '下载完成',
                downloadFailed: '下载失败，请稍后重试',
                downloadFailedReason: '下载失败：',
                settingsSaved: '设置已保存',
                historyCleared: '下载历史已清空',
                historyDisabled: '本地历史已关闭',
                graphFailed: '视频解析失败，稍后可重试',
                missingTweet: '当前页面未找到可识别的推文',
                pickerNeedSelection: '请先选择要下载的媒体'
            }
        },
        en: {
            button: { idle: 'Download media', loading: 'Downloading', done: 'Downloaded', failed: 'Download failed' },
            menu: {
                openSettings: 'X_easyDownload: Open settings',
                clearHistory: 'X_easyDownload: Clear download history'
            },
            modal: {
                title: 'X_easyDownload Settings',
                template: 'File name template',
                templateHint: 'Placeholders: {user-id} {user-name} {post-id} {post-time} {media-type} {index} {ext}',
                rememberHistory: 'Remember local download history',
                zipOnMobile: 'Package multi-media downloads as ZIP on mobile',
                preview: 'Preview',
                restore: 'Restore defaults',
                clearHistory: 'Clear history',
                cancel: 'Cancel',
                save: 'Save'
            },
            picker: {
                title: 'Choose media to download',
                mediaTitle: 'Media',
                cancel: 'Cancel',
                confirm: 'Download',
                selectNone: 'Select at least one media item',
                singleVideo: 'Video',
                singleGif: 'GIF',
                singlePhoto: 'Photo'
            },
            toast: {
                noMedia: 'No downloadable media found for this tweet',
                resolving: 'Resolving media…',
                downloading: 'Starting download',
                downloadDone: 'Download complete',
                downloadFailed: 'Download failed. Try again later.',
                downloadFailedReason: 'Download failed:',
                settingsSaved: 'Settings saved',
                historyCleared: 'Download history cleared',
                historyDisabled: 'Local history disabled',
                graphFailed: 'Video resolution failed. Please retry later.',
                missingTweet: 'No recognizable tweet found on this page',
                pickerNeedSelection: 'Select at least one media item before downloading'
            }
        }
    };

    const state = {
        config: loadConfig(),
        dbPromise: null,
        historyCache: new Map(),
        graphCache: new Map(),
        resolvedMediaCache: new Map(),
        processingScheduled: false,
        processingTimer: null,
        isApplyingUiMutations: false
    };

    const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
    const host = location.hostname;

    function getLangCode() {
        return document.documentElement.lang?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
    }

    function t(path) {
        const langCode = getLangCode();
        const source = LANG[langCode] || LANG.en;
        const fallback = LANG.en;
        const fromSource = path.split('.').reduce((value, key) => value && value[key], source);
        const value = fromSource || path.split('.').reduce((value, key) => value && value[key], fallback) || path;
        return typeof value === 'string' ? value.replace(/X_easyDownload/g, 'X_easyMediaDownloader') : value;
    }

    function getBatchButtonText(stateName) {
        if (getLangCode() === 'zh-CN') {
            return {
                idle: '批量下载',
                loading: '批量处理中',
                done: '批量已完成',
                failed: '批量失败'
            }[stateName] || '批量下载';
        }
        return {
            idle: 'Batch download',
            loading: 'Batch downloading',
            done: 'Batch ready',
            failed: 'Batch failed'
        }[stateName] || 'Batch download';
    }

    function getPickerText(namespace, key) {
        if (namespace !== 'batchPicker') return t(`picker.${key}`);
        if (getLangCode() === 'zh-CN') {
            return {
                title: '选择批量下载内容',
                mediaTitle: '已采集媒体',
                cancel: '取消',
                confirm: '下载 ZIP',
                selectAll: '全选',
                clearAll: '清空选择'
            }[key] || '';
        }
        return {
            title: 'Choose media to archive',
            mediaTitle: 'Collected media',
            cancel: 'Cancel',
            confirm: 'Download ZIP',
            selectAll: 'Select all',
            clearAll: 'Clear selection'
        }[key] || '';
    }

    function getBatchCollectMessage(tweetCount) {
        return getLangCode() === 'zh-CN'
            ? `正在采集推文：${tweetCount}`
            : `Collecting tweets: ${tweetCount}`;
    }

    function getBatchResolveMessage(current, total, mediaCount) {
        return getLangCode() === 'zh-CN'
            ? `正在解析媒体：${current}/${total} 条推文，${mediaCount} 个媒体`
            : `Resolving media: ${current}/${total} tweets, ${mediaCount} media items`;
    }

    function getBatchPackingMessage(fileCount) {
        return getLangCode() === 'zh-CN'
            ? `正在打包 ZIP（${fileCount} 个文件）`
            : `Packing ZIP (${fileCount} files)`;
    }

    function getBatchPickerStatsText(tweetCount, mediaCount) {
        return getLangCode() === 'zh-CN'
            ? `已采集 ${tweetCount} 条推文，共 ${mediaCount} 个媒体`
            : `Collected ${tweetCount} tweets, ${mediaCount} media items`;
    }

    function getBatchEmptyMessage() {
        return getLangCode() === 'zh-CN'
            ? '当前媒体页没有可下载媒体'
            : 'No downloadable media found on this media page';
    }

    function getBatchPreparingMessage() {
        return getLangCode() === 'zh-CN'
            ? '正在准备批量下载'
            : 'Preparing batch download';
    }

    function getBatchDoneMessage() {
        return getLangCode() === 'zh-CN'
            ? '批量 ZIP 下载完成'
            : 'Batch ZIP download complete';
    }

    function getBatchPartialFailedMessage(successCount, failedCount) {
        return getLangCode() === 'zh-CN'
            ? `已下载 ${successCount} 个媒体，失败 ${failedCount} 个`
            : `Downloaded ${successCount} media items, ${failedCount} failed`;
    }

    function getBatchZipModalText(key) {
        if (getLangCode() === 'zh-CN') {
            return {
                title: '媒体页 ZIP 文件名',
                template: 'ZIP 文件名模板',
                templateHint: '支持占位符：{user-id} {user-name}',
                preview: '预览',
                restore: '恢复默认',
                cancel: '取消',
                save: '保存',
                saved: 'ZIP 模板已保存'
            }[key] || '';
        }
        return {
            title: 'Media page ZIP filename',
            template: 'ZIP filename template',
            templateHint: 'Placeholders: {user-id} {user-name}',
            preview: 'Preview',
            restore: 'Restore defaults',
            cancel: 'Cancel',
            save: 'Save',
            saved: 'ZIP template saved'
        }[key] || '';
    }

    function renderBatchZipTemplate(template, sample) {
        const tokens = {
            'user-id': sanitizeFilenamePart(sample.userId || ''),
            'user-name': sanitizeFilenamePart(sample.userName || '')
        };

        let body = String(template || DEFAULT_BATCH_ZIP_TEMPLATE).replace(/\{([^}]+)\}/g, (match, token) => {
            const value = tokens[token];
            return value === undefined ? '' : value;
        });

        body = sanitizeFilenamePart(body)
            .replace(/_+/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[._\-\s]+$/g, '');

        if (!body) {
            body = `X_${sanitizeFilenamePart(sample.userId || 'profile')}`;
        }

        return `${body}.zip`;
    }

    function loadConfig() {
        try {
            const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
            if (!raw) return { ...DEFAULT_CONFIG };
            const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
            if (!parsed.filenameTemplate || parsed.filenameTemplate === LEGACY_DEFAULT_FILENAME_TEMPLATE) {
                parsed.filenameTemplate = DEFAULT_FILENAME_TEMPLATE;
            }
            if (!parsed.batchZipTemplate) {
                parsed.batchZipTemplate = DEFAULT_BATCH_ZIP_TEMPLATE;
            }
            return parsed;
        } catch (error) {
            console.warn(`${SCRIPT_ID}: failed to load config`, error);
            return { ...DEFAULT_CONFIG };
        }
    }

    function saveConfig(nextConfig) {
        state.config = { ...DEFAULT_CONFIG, ...nextConfig };
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.config));
    }

    function sanitizeFilenamePart(value) {
        return String(value ?? '')
            .replace(/[\\/:*?"<>|]+/g, '_')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getCookie(name) {
        const cookies = document.cookie
            .split(';')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
                const index = part.indexOf('=');
                return [part.slice(0, index), part.slice(index + 1)];
            });
        const map = Object.fromEntries(cookies);
        return name ? map[name] : map;
    }

    function gmFetch(url, options = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url,
                method: options.method || 'GET',
                headers: options.headers || {},
                data: options.body,
                responseType: options.responseType,
                timeout: options.timeout || 30000,
                onload: response => {
                    resolve({
                        ok: response.status >= 200 && response.status < 300,
                        status: response.status,
                        response,
                        async json() {
                            return response.response;
                        },
                        async blob() {
                            return response.response instanceof Blob ? response.response : new Blob([response.response]);
                        },
                        async text() {
                            if (typeof response.response === 'string') return response.response;
                            return response.responseText || '';
                        }
                    });
                },
                onerror: reject,
                ontimeout: reject,
                onabort: reject
            });
        });
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .xedl-action-item { display: inline-flex; align-items: center; justify-content: center; min-width: 34px; margin-inline-start: 4px; flex: 0 0 auto; overflow-anchor: none; contain: layout style paint; }
            .xedl-button, .xedl-floating-button { font: inherit; border: 0; cursor: pointer; color: rgb(83, 100, 113); background: transparent; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: color 0.18s ease, background-color 0.18s ease, transform 0.18s ease; }
            .xedl-button { width: 34px; height: 34px; border-radius: 999px; padding: 0; }
            .xedl-button:hover, .xedl-floating-button:hover { color: rgb(29, 155, 240); background: rgba(29, 155, 240, 0.1); }
            .xedl-button:active, .xedl-floating-button:active { transform: scale(0.97); }
            .xedl-button.xedl-state-loading, .xedl-floating-button.xedl-state-loading, .xedl-button.xedl-state-done, .xedl-floating-button.xedl-state-done { color: rgb(29, 155, 240); }
            .xedl-button.xedl-state-failed, .xedl-floating-button.xedl-state-failed { color: rgb(244, 33, 46); }
            .xedl-button svg, .xedl-floating-button svg { width: 20px; height: 20px; display: block; }
            .xedl-icon, .xedl-icon *, .xedl-label { pointer-events: none; user-select: none; }
            .xedl-floating-wrap { position: fixed; z-index: 2147483640; left: 16px; top: 50%; transform: translateY(-50%); overflow-anchor: none; }
            .xedl-batch-floating-wrap { position: fixed; z-index: 2147483640; left: 66.666vw; bottom: 24px; transform: translateX(-50%); overflow-anchor: none; }
            .xedl-floating-button { min-width: 44px; height: 44px; padding: 0 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.96); border: 1px solid rgba(207, 217, 222, 0.8); box-shadow: 0 4px 14px rgba(15, 20, 25, 0.12); backdrop-filter: blur(14px); }
            html[style*="color-scheme: dark"] .xedl-floating-button, html[data-color-mode="dark"] .xedl-floating-button { background: rgba(21, 32, 43, 0.92); }
            .xedl-floating-button span { font-size: 13px; font-weight: 600; }
            #${TOAST_CONTAINER_ID} { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 2147483646; pointer-events: none; }
            .xedl-toast { min-width: 220px; max-width: 360px; background: rgba(15, 20, 25, 0.92); color: #fff; border-radius: 14px; padding: 12px 14px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24); font-size: 13px; line-height: 1.45; opacity: 0; transform: translateY(8px); transition: opacity 0.18s ease, transform 0.18s ease; }
            .xedl-toast.xedl-visible { opacity: 1; transform: translateY(0); }
            #${MODAL_ID} { position: fixed; inset: 0; z-index: 2147483645; display: flex; align-items: flex-start; justify-content: center; background: rgba(15, 20, 25, 0.56); padding: 20px; overflow-y: auto; }
            .xedl-modal-card { width: min(560px, 100%); max-height: calc(100vh - 40px); overflow: auto; background: rgb(255, 255, 255); color: rgb(15, 20, 25); border-radius: 24px; box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28); padding: 22px; margin: auto 0; }
            .xedl-modal-card.xedl-modal-card-wide { width: min(1280px, calc(100vw - 40px)); display: flex; flex-direction: column; overflow: hidden; }
            html[style*="color-scheme: dark"] .xedl-modal-card, html[data-color-mode="dark"] .xedl-modal-card { background: rgb(21, 32, 43); color: rgb(231, 233, 234); }
            .xedl-modal-card h2 { font-size: 20px; font-weight: 700; margin: 0 0 18px; }
            .xedl-field { display: grid; gap: 8px; margin-bottom: 16px; }
            .xedl-field label, .xedl-check { font-size: 14px; font-weight: 600; }
            .xedl-field textarea { width: 100%; min-height: 86px; resize: vertical; border-radius: 14px; border: 1px solid rgba(83, 100, 113, 0.34); padding: 12px 14px; font: inherit; color: inherit; background: rgba(0, 0, 0, 0.02); }
            .xedl-hint, .xedl-preview { font-size: 12px; line-height: 1.45; color: rgb(83, 100, 113); }
            .xedl-check-row { display: grid; gap: 12px; margin-bottom: 18px; }
            .xedl-check { display: inline-flex; align-items: center; gap: 10px; }
            .xedl-check input { width: 16px; height: 16px; margin: 0; }
            .xedl-media-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
            .xedl-modal-card.xedl-modal-card-wide .xedl-field { flex: 1 1 auto; min-height: 0; margin-bottom: 0; }
            .xedl-modal-card.xedl-modal-card-wide .xedl-media-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); overflow-y: auto; padding-right: 6px; min-height: 0; max-height: calc(100vh - 260px); }
            .xedl-media-card { position: relative; border: 1px solid rgba(83, 100, 113, 0.24); border-radius: 18px; overflow: hidden; background: rgba(0, 0, 0, 0.03); min-height: 160px; }
            .xedl-media-card label { display: block; cursor: pointer; height: 100%; }
            .xedl-media-card input { position: absolute; top: 12px; left: 12px; width: 18px; height: 18px; margin: 0; z-index: 2; }
            .xedl-media-thumb { position: absolute; inset: 0; background-size: cover; background-position: center; background-repeat: no-repeat; }
            .xedl-media-thumb::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,20,25,0.06) 0%, rgba(15,20,25,0.55) 100%); }
            .xedl-media-meta { position: absolute; left: 0; right: 0; bottom: 0; display: grid; gap: 4px; padding: 14px 14px 12px; color: #fff; z-index: 1; }
            .xedl-media-title { font-size: 13px; font-weight: 700; }
            .xedl-media-desc { font-size: 11px; line-height: 1.4; opacity: 0.92; }
            .xedl-media-chip { position: absolute; top: 10px; right: 10px; z-index: 2; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 5px 8px; background: rgba(15, 20, 25, 0.75); color: #fff; }
            .xedl-media-card.xedl-no-preview { min-height: 120px; }
            .xedl-media-card.xedl-no-preview .xedl-media-thumb { background: linear-gradient(135deg, rgba(29,155,240,0.16), rgba(15,20,25,0.14)); }
            .xedl-media-card.xedl-no-preview .xedl-media-thumb::after { background: linear-gradient(180deg, rgba(15,20,25,0.08) 0%, rgba(15,20,25,0.38) 100%); }
            .xedl-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 20px; }
            .xedl-modal-card.xedl-modal-card-wide .xedl-actions { margin-top: 16px; flex: 0 0 auto; }
            .xedl-actions-group { display: flex; gap: 10px; flex-wrap: wrap; }
            .xedl-btn { border: 0; border-radius: 999px; font: inherit; cursor: pointer; padding: 10px 16px; transition: transform 0.18s ease, opacity 0.18s ease; }
            .xedl-btn:hover { transform: translateY(-1px); }
            .xedl-btn-primary { background: rgb(29, 155, 240); color: #fff; }
            .xedl-btn-secondary { background: rgba(29, 155, 240, 0.12); color: rgb(29, 155, 240); }
            .xedl-btn-ghost { background: rgba(15, 20, 25, 0.06); color: inherit; }
        `;
        document.documentElement.appendChild(style);
    }

    function ensureToastContainer() {
        let container = document.getElementById(TOAST_CONTAINER_ID);
        if (container) return container;
        container = document.createElement('div');
        container.id = TOAST_CONTAINER_ID;
        document.body.appendChild(container);
        return container;
    }

    function showToast(message, duration = 2400) {
        ensureStyles();
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = 'xedl-toast';
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('xedl-visible'));
        let timer = null;

        const api = {
            update(nextMessage, nextDuration = duration) {
                toast.textContent = nextMessage;
                if (timer) {
                    window.clearTimeout(timer);
                    timer = null;
                }
                if (nextDuration > 0) {
                    timer = window.setTimeout(() => api.close(), nextDuration);
                }
            },
            close() {
                if (timer) {
                    window.clearTimeout(timer);
                    timer = null;
                }
                toast.classList.remove('xedl-visible');
                window.setTimeout(() => toast.remove(), 180);
            }
        };

        if (duration > 0) {
            timer = window.setTimeout(() => api.close(), duration);
        }

        return api;
    }

    function openDB() {
        if (state.dbPromise) return state.dbPromise;
        state.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'postId' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return state.dbPromise;
    }

    async function loadHistoryCache() {
        if (!state.config.rememberHistory) {
            state.historyCache.clear();
            return;
        }
        const db = await openDB();
        const entries = await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
        state.historyCache = new Map(entries.map(entry => [entry.postId, entry]));
    }

    async function markHistory(context, mediaCount) {
        if (!state.config.rememberHistory || !context?.postId) return;
        const entry = {
            postId: context.postId,
            downloadedAt: new Date().toISOString(),
            mediaCount,
            userId: context.userId || '',
            userName: context.userName || '',
            postTime: context.postTime || ''
        };
        state.historyCache.set(context.postId, entry);
        const db = await openDB();
        await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    function hasHistory(postId) {
        return state.config.rememberHistory && state.historyCache.has(postId);
    }

    async function clearHistory() {
        state.historyCache.clear();
        const db = await openDB();
        await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    function createApiHeaders() {
        const headers = {
            authorization: GRAPHQL.authorization,
            'x-csrf-token': getCookie('ct0') || '',
            'x-twitter-client-language': 'en',
            'x-twitter-active-user': 'yes',
            'content-type': 'application/json'
        };
        const guestToken = getCookie('gt');
        if (guestToken) {
            headers['x-guest-token'] = guestToken;
        } else {
            headers['x-twitter-auth-type'] = 'OAuth2Session';
        }
        return headers;
    }

    function parseTweetIdentifiers(url) {
        if (!url) return null;
        const match = url.match(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([^/?#]+)\/status\/(\d+)/i);
        if (!match) return null;
        return { userId: match[1], postId: match[2] };
    }

    function isMediaViewRoute() {
        return /\/status\/\d+\/(photo|video)\//.test(location.pathname);
    }

    function isProfileMediaRoute() {
        return /^\/[^/]+\/media\/?$/.test(location.pathname) && !/^\/i\//.test(location.pathname);
    }

    function getProfileMediaRouteUserId() {
        const match = location.pathname.match(/^\/([^/]+)\/media\/?$/);
        return match?.[1] || '';
    }

    function resolveBestStatusFromArticle(article) {
        const weighted = new Map();
        const anchors = Array.from(article.querySelectorAll('a[href*="/status/"]'));

        anchors.forEach(anchor => {
            const parsed = parseTweetIdentifiers(anchor.href);
            if (!parsed) return;

            let score = 1;
            if (anchor.querySelector('time')) score += 6;
            if (anchor.href.includes('/analytics')) score += 4;
            if (anchor.href.includes('/photo/') || anchor.href.includes('/video/')) score += 2;
            if (anchor.closest('[data-testid="User-Name"]')) score += 3;
            if (location.pathname.includes(`/status/${parsed.postId}`)) score += 5;

            const key = `${parsed.userId}:${parsed.postId}`;
            weighted.set(key, (weighted.get(key) || 0) + score);
        });

        const best = Array.from(weighted.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        if (!best) return null;
        const [userId, postId] = best.split(':');
        return { userId, postId };
    }

    function getMainTweetUrl(article) {
        const timeLink = article.querySelector('a[href*="/status/"] time')?.parentElement;
        if (timeLink?.href) return timeLink.href;
        const weighted = resolveBestStatusFromArticle(article);
        if (weighted) return `https://${host}/${weighted.userId}/status/${weighted.postId}`;
        const directLink = article.querySelector('a[href*="/status/"]');
        return directLink?.href || '';
    }

    function extractDisplayName(userNameRoot, fallbackUserId) {
        if (!userNameRoot) return fallbackUserId;

        const primaryRow = userNameRoot.querySelector(':scope > div:first-child');
        const primaryText = primaryRow?.textContent?.replace(/\s+/g, ' ').trim();
        if (primaryText) {
            return primaryText;
        }

        const fallbackText = Array.from(userNameRoot.querySelectorAll('span'))
            .map(node => node.textContent?.replace(/\s+/g, ' ').trim() || '')
            .filter(Boolean)
            .filter(text => !text.startsWith('@'))
            .filter(text => text !== '·' && text !== '•')
            .find(Boolean);

        return fallbackText || fallbackUserId;
    }

    function getTweetContext(article) {
        const mainTweetUrl = getMainTweetUrl(article) || location.href;
        const parsed = parseTweetIdentifiers(mainTweetUrl) || resolveBestStatusFromArticle(article);
        if (!parsed) return null;

        const userNameRoot = article.querySelector('[data-testid="User-Name"]');
        const timeElement = article.querySelector('a[href*="/status/"] time');
        return {
            ...parsed,
            userName: extractDisplayName(userNameRoot, parsed.userId),
            postTime: timeElement?.getAttribute('datetime') || ''
        };
    }

    function normalizeImageUrl(url) {
        try {
            const target = new URL(url);
            if (target.hostname !== 'pbs.twimg.com') return url;
            if (target.searchParams.has('name')) target.searchParams.set('name', 'orig');
            return target.toString();
        } catch (error) {
            return url;
        }
    }

    function getUrlExt(url) {
        try {
            const target = new URL(url);
            if (target.searchParams.has('format')) return target.searchParams.get('format') || 'jpg';
            const pathname = target.pathname.toLowerCase();
            const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
            return match?.[1] || 'jpg';
        } catch (error) {
            return 'jpg';
        }
    }

    function dedupeMedia(items) {
        const byUrl = new Map();
        items.forEach(item => {
            if (!item?.url) return;
            const existing = byUrl.get(item.url);
            if (!existing) {
                byUrl.set(item.url, item);
                return;
            }

            const merged = {
                ...existing,
                ...item
            };

            if (!existing.bitrate && item.bitrate) merged.bitrate = item.bitrate;
            if (!existing.width && item.width) merged.width = item.width;
            if (!existing.height && item.height) merged.height = item.height;
            byUrl.set(item.url, merged);
        });
        return Array.from(byUrl.values());
    }

    function hasQuoteCandidate(article, mainPostId) {
        return Array.from(article.querySelectorAll('a[href*="/status/"]')).some(anchor => {
            const parsed = parseTweetIdentifiers(anchor.href);
            return parsed && parsed.postId !== mainPostId;
        });
    }

    function quickHasMedia(article) {
        return Boolean(
            article.querySelector('img[src*="pbs.twimg.com/media/"]') ||
            article.querySelector('div[data-testid="videoPlayer"] video') ||
            article.querySelector('img[src*="tweet_video_thumb"]') ||
            article.querySelector('img[src*="ext_tw_video_thumb"]') ||
            article.querySelector('img[src*="amplify_video_thumb"]')
        );
    }

    function collectDomMedia(article) {
        const images = Array.from(article.querySelectorAll('img[src*="pbs.twimg.com/media/"]'))
            .filter(img => {
                if (!img.src) return false;
                if (img.closest('a[href*="/photo/"]')) return true;
                if (img.closest('div[data-testid="videoPlayer"]')) return false;
                if (img.closest('[data-testid="tweetPhoto"]')) return true;
                if (img.closest('[data-testid="card.wrapper"]')) return false;
                if (img.closest('aside')) return false;
                if (img.closest('[aria-label*="Avatar"]')) return false;
                return !img.closest('a[href*="/status/"][role="link"]');
            })
            .map(img => ({
                url: normalizeImageUrl(img.src),
                typeLabel: 'photo',
                ext: getUrlExt(img.src),
                previewUrl: img.src
            }));

        const videos = [];
        const gifs = [];

        const videoElements = Array.from(article.querySelectorAll('div[data-testid="videoPlayer"] video'));
        videoElements.forEach(video => {
            if (video.src?.includes('tweet_video')) {
                gifs.push({
                    url: video.src,
                    typeLabel: 'gif',
                    ext: getUrlExt(video.src) || 'mp4',
                    previewUrl: video.poster || ''
                });
            }
        });

        const thumbImages = Array.from(article.querySelectorAll('img[src]'));
        thumbImages.forEach(img => {
            const src = img.src;
            if (!src) return;
            if (src.includes('tweet_video_thumb')) {
                const gifId = src.split('?')[0].split('/').pop();
                gifs.push({
                    url: `https://video.twimg.com/tweet_video/${gifId}.mp4`,
                    typeLabel: 'gif',
                    ext: 'mp4',
                    previewUrl: src
                });
            } else if (
                src.includes('ext_tw_video_thumb') ||
                src.includes('amplify_video_thumb') ||
                src.includes('amplify_tw_video_thumb')
            ) {
                videos.push({
                    url: src,
                    typeLabel: 'video-placeholder',
                    ext: 'jpg',
                    previewUrl: src
                });
            }
        });

        return {
            images: dedupeMedia(images),
            gifs: dedupeMedia(gifs),
            videoPlaceholders: dedupeMedia(videos)
        };
    }

    async function fetchTweetDetail(postId) {
        if (state.graphCache.has(postId)) return state.graphCache.get(postId);

        const variables = {
            tweetId: postId,
            withCommunity: false,
            includePromotedContent: false,
            withVoice: false
        };

        const url = encodeURI(
            `https://${host}/i/api/graphql/${GRAPHQL.queryId}/${GRAPHQL.operationName}?variables=${JSON.stringify(variables)}&features=${JSON.stringify(GRAPHQL.features)}&fieldToggles=${JSON.stringify(GRAPHQL.fieldToggles)}`
        );

        const request = gmFetch(url, {
            method: 'GET',
            headers: createApiHeaders(),
            responseType: 'json'
        }).then(async res => {
            if (!res.ok) throw new Error(`GraphQL request failed with status ${res.status}`);
            return res.json();
        });

        state.graphCache.set(postId, request);
        try {
            return await request;
        } catch (error) {
            state.graphCache.delete(postId);
            throw error;
        }
    }

    function getTweetResultObject(payload) {
        const raw = payload?.data?.tweetResult?.result;
        return extractTweetResult(raw);
    }

    function extractTweetResult(raw) {
        if (!raw) return null;
        return raw.tweet || raw;
    }

    function pickBestVideoVariant(media) {
        const variants = media?.video_info?.variants?.filter(variant => variant.content_type === 'video/mp4') || [];
        if (!variants.length) return null;
        return variants.reduce((best, current) => ((current.bitrate || 0) > (best?.bitrate || 0) ? current : best), null);
    }

    function createMediaItem(url, typeLabel, ext, extra = {}) {
        return {
            url,
            typeLabel,
            ext,
            ...extra
        };
    }

    function collectGraphMediaFromTweet(tweet) {
        if (!tweet) return [];

        const mediaItems = [];
        const extEntities = tweet.extended_entities || tweet.legacy?.extended_entities;

        if (Array.isArray(extEntities?.media)) {
            extEntities.media.forEach(media => {
                if (media.type === 'photo' && media.media_url_https) {
                    mediaItems.push(createMediaItem(
                        normalizeImageUrl(media.media_url_https),
                        'photo',
                        getUrlExt(media.media_url_https),
                        { width: media.original_info?.width, height: media.original_info?.height, previewUrl: media.media_url_https }
                    ));
                    return;
                }
                if (media.type === 'animated_gif' || media.type === 'video') {
                    const best = pickBestVideoVariant(media);
                    if (best?.url) {
                        mediaItems.push(createMediaItem(
                            best.url,
                            media.type === 'animated_gif' ? 'gif' : 'video',
                            getUrlExt(best.url) || 'mp4',
                            { bitrate: best.bitrate || 0, width: media.original_info?.width, height: media.original_info?.height, previewUrl: media.media_url_https || media.media_url || '' }
                        ));
                    }
                }
            });
        }

        if (mediaItems.length > 0) return dedupeMedia(mediaItems);

        const unifiedCard = tweet.card?.legacy?.binding_values?.find(entry => entry.key === 'unified_card')?.value?.string_value;
        if (!unifiedCard) return [];

        try {
            const parsed = JSON.parse(unifiedCard);
            Object.values(parsed.media_entities || {}).forEach(media => {
                if (media.type === 'photo' && media.media_url_https) {
                    mediaItems.push(createMediaItem(
                        normalizeImageUrl(media.media_url_https),
                        'photo',
                        getUrlExt(media.media_url_https),
                        { width: media.original_info?.width, height: media.original_info?.height, previewUrl: media.media_url_https }
                    ));
                    return;
                }
                if (media.type === 'animated_gif' || media.type === 'video') {
                    const best = pickBestVideoVariant(media);
                    if (best?.url) {
                        mediaItems.push(createMediaItem(
                            best.url,
                            media.type === 'animated_gif' ? 'gif' : 'video',
                            getUrlExt(best.url) || 'mp4',
                            { bitrate: best.bitrate || 0, width: media.original_info?.width, height: media.original_info?.height, previewUrl: media.media_url_https || media.media_url || '' }
                        ));
                    }
                }
            });
        } catch (error) {
            console.warn(`${SCRIPT_ID}: unified_card parse failed`, error);
        }

        return dedupeMedia(mediaItems);
    }

    function collectGraphMedia(payload) {
        return collectGraphMediaFromTweet(getTweetResultObject(payload));
    }

    async function resolveMedia(context, article) {
        if (context?.postId && state.resolvedMediaCache.has(context.postId)) {
            return state.resolvedMediaCache.get(context.postId);
        }

        const domMedia = collectDomMedia(article);
        const media = [...domMedia.images, ...domMedia.gifs];
        const needsGraph = domMedia.videoPlaceholders.length > 0 || media.length === 0;

        if (!needsGraph || !context?.postId) {
            const resolved = dedupeMedia(media);
            if (context?.postId) state.resolvedMediaCache.set(context.postId, resolved);
            return resolved;
        }

        try {
            const payload = await fetchTweetDetail(context.postId);
            const resolved = dedupeMedia([...media, ...collectGraphMedia(payload)]);
            state.resolvedMediaCache.set(context.postId, resolved);
            return resolved;
        } catch (error) {
            console.warn(`${SCRIPT_ID}: GraphQL resolution failed`, error);
            if (domMedia.videoPlaceholders.length > 0) showToast(t('toast.graphFailed'));
            const resolved = dedupeMedia(media);
            if (context?.postId) state.resolvedMediaCache.set(context.postId, resolved);
            return resolved;
        }
    }

    function getVisibleMediaContexts() {
        return Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
            .filter(article => quickHasMedia(article))
            .map(article => getTweetContext(article))
            .filter(context => context?.postId);
    }

    function getBestSrc(img) {
        if (img?.srcset) {
            const parts = img.srcset
                .split(',')
                .map(item => item.trim().split(' ')[0])
                .filter(Boolean);
            if (parts.length > 0) return parts[parts.length - 1];
        }
        return img?.src || '';
    }

    function collectVisibleBatchMediaItems() {
        const profileUserId = getProfileMediaRouteUserId();
        const seen = new Map();

        document.querySelectorAll('img[src*="pbs.twimg.com"]').forEach(img => {
            let url = getBestSrc(img);
            if (!url || !url.includes('/media/')) return;
            url = normalizeImageUrl(url);

            const anchor = img.closest('a[href*="/status/"]');
            const parsed = parseTweetIdentifiers(anchor?.href || '') || null;
            const sourceUserId = parsed?.userId || profileUserId || '';
            const sourcePostId = parsed?.postId || '';

            if (!seen.has(url)) {
                seen.set(url, {
                    url,
                    typeLabel: 'photo',
                    ext: getUrlExt(url),
                    previewUrl: img.currentSrc || img.src || url,
                    sourcePostId,
                    sourceUserId,
                    sourceUserName: sourceUserId,
                    sourcePostTime: ''
                });
            }
        });

        return Array.from(seen.values());
    }

    function getBatchButtonVisualState() {
        const items = collectVisibleBatchMediaItems();
        if (!items.length) return 'idle';
        return items.some(item => item.sourcePostId && hasHistory(item.sourcePostId)) ? 'done' : 'idle';
    }

    async function collectBatchMediaItemsDuringScroll(progressToast) {
        const targets = new Map();
        let stableRounds = 0;
        let previousCount = 0;

        while (stableRounds < BATCH_SCROLL_IDLE_LIMIT) {
            collectVisibleBatchMediaItems().forEach(item => {
                if (!targets.has(item.url)) {
                    targets.set(item.url, item);
                }
            });

            const currentCount = targets.size;
            progressToast.update(getBatchCollectMessage(currentCount), 0);

            if (currentCount > previousCount) {
                previousCount = currentCount;
                stableRounds = 0;
            } else {
                stableRounds += 1;
            }

            if (stableRounds >= BATCH_SCROLL_IDLE_LIMIT) break;

            window.scrollBy(0, window.innerHeight);
            await sleep(BATCH_SCROLL_DELAY);
        }

        return Array.from(targets.values());
    }

    function buildBatchArchiveName(mediaItems) {
        const profileUserId = sanitizeFilenamePart(getProfileMediaRouteUserId() || mediaItems[0]?.sourceUserId || 'profile');
        return renderBatchZipTemplate(state.config.batchZipTemplate, {
            userId: mediaItems[0]?.sourceUserId || profileUserId,
            userName: mediaItems[0]?.sourceUserName || mediaItems[0]?.sourceUserId || profileUserId
        });
    }

    function formatPostTime(postTime) {
        if (!postTime) return '';
        const parsed = dayjs(postTime);
        return parsed.isValid() ? parsed.format('YYYYMMDD_HHmmss') : '';
    }

    function buildFilename(context, media, index, totalCount) {
        const tokens = {
            'user-id': sanitizeFilenamePart(context.userId || ''),
            'user-name': sanitizeFilenamePart(context.userName || ''),
            'post-id': sanitizeFilenamePart(context.postId || ''),
            'post-time': sanitizeFilenamePart(formatPostTime(context.postTime || '')),
            'media-type': sanitizeFilenamePart(media.typeLabel || 'media'),
            index: String(index + 1),
            ext: sanitizeFilenamePart(media.ext || 'bin')
        };

        let body = state.config.filenameTemplate.replace(/\{([^}]+)\}/g, (match, token) => {
            const value = tokens[token];
            return value === undefined ? '' : value;
        });

        body = sanitizeFilenamePart(body)
            .replace(/_+/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[._\-\s]+$/g, '');

        if (!body) body = `x_media_${context.postId || 'unknown'}`;
        if (totalCount > 1 && !/\{index\}/.test(state.config.filenameTemplate)) {
            body += `-${index + 1}`;
        }
        return `${body}.${media.ext || 'bin'}`;
    }

    async function blobToUint8Array(blob) {
        const buffer = await blob.arrayBuffer();
        return new Uint8Array(buffer);
    }

    async function fetchMediaBlob(url) {
        const response = await gmFetch(url, {
            method: 'GET',
            responseType: 'blob',
            headers: {
                Referer: `${location.origin}/`,
                Origin: location.origin
            }
        });
        if (!response.ok) throw new Error(`Media request failed with status ${response.status}`);
        return response.blob();
    }

    function triggerDownload(blob, filename) {
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(blob);
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1200);
    }

    async function downloadAsZip(files, archiveName) {
        const zipEntries = {};
        for (const file of files) {
            zipEntries[file.filename] = await blobToUint8Array(file.blob);
        }

        const zipBuffer = await new Promise((resolve, reject) => {
            fflate.zip(zipEntries, { level: 0 }, (error, data) => {
                if (error) reject(error);
                else resolve(data);
            });
        });

        triggerDownload(new Blob([zipBuffer], { type: 'application/zip' }), archiveName);
    }

    function getErrorMessage(error) {
        const message = String(error?.message || error || '').trim();
        if (!message) return getLangCode() === 'zh-CN' ? '未知错误' : 'Unknown error';
        if (/GraphQL request failed/i.test(message)) return getLangCode() === 'zh-CN' ? '推文接口解析失败' : 'Tweet API resolution failed';
        if (/Media request failed with status 401/i.test(message)) return getLangCode() === 'zh-CN' ? '媒体请求被拒绝（401）' : 'Media request denied (401)';
        if (/Media request failed with status 403/i.test(message)) return getLangCode() === 'zh-CN' ? '媒体请求被拒绝（403）' : 'Media request denied (403)';
        if (/Media request failed with status 404/i.test(message)) return getLangCode() === 'zh-CN' ? '媒体资源不存在（404）' : 'Media not found (404)';
        if (/timeout/i.test(message)) return getLangCode() === 'zh-CN' ? '请求超时' : 'Request timed out';
        return message;
    }

    function getMediaPreviewUrl(item) {
        if (item.previewUrl) return item.previewUrl;
        if (item.typeLabel === 'photo') return item.url;
        return '';
    }

    function describeMediaItem(item, index) {
        const typeText = item.typeLabel === 'video'
            ? t('picker.singleVideo')
            : item.typeLabel === 'gif'
                ? t('picker.singleGif')
                : t('picker.singlePhoto');
        const details = [typeText];
        if (item.width && item.height) details.push(`${item.width}×${item.height}`);
        return {
            title: `${index + 1}. ${typeText}`,
            detail: details.join(' · ')
        };
    }

    function togglePickerSelection(mediaContainer, checked) {
        mediaContainer.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = checked;
        });
    }

    function openMediaPicker(context, items, options = {}) {
        return new Promise(resolve => {
            closeSettings();

            const namespace = options.namespace || 'picker';
            const cancelText = getPickerText(namespace, 'cancel');
            const confirmText = getPickerText(namespace, 'confirm');
            const titleText = getPickerText(namespace, 'title');
            const mediaTitleText = getPickerText(namespace, 'mediaTitle');

            const modal = document.createElement('div');
            modal.id = MODAL_ID;

            modal.innerHTML = `
                <div class="xedl-modal-card${options.wide ? ' xedl-modal-card-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${MODAL_ID}-title">
                    <h2 id="${MODAL_ID}-title">${titleText}</h2>
                    <div class="xedl-field">
                        <label>${mediaTitleText}</label>
                        ${options.statsText ? `<div class="xedl-hint">${options.statsText}</div>` : ''}
                        <div class="xedl-media-grid" id="${MODAL_ID}-media"></div>
                    </div>
                    <div class="xedl-actions">
                        <div class="xedl-actions-group" id="${MODAL_ID}-actions-left"></div>
                        <div class="xedl-actions-group">
                            <button type="button" class="xedl-btn xedl-btn-secondary" id="${MODAL_ID}-cancel">${cancelText}</button>
                            <button type="button" class="xedl-btn xedl-btn-primary" id="${MODAL_ID}-confirm">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const mediaContainer = modal.querySelector(`#${MODAL_ID}-media`);
            const leftActions = modal.querySelector(`#${MODAL_ID}-actions-left`);
            mediaContainer.innerHTML = items.map((item, index) => {
                const meta = describeMediaItem(item, index);
                const previewUrl = getMediaPreviewUrl(item);
                const noPreviewClass = previewUrl ? '' : ' xedl-no-preview';
                const chip = meta.title.split('. ').slice(1).join('. ');
                return `
                    <div class="xedl-media-card${noPreviewClass}">
                        <label>
                            <input type="checkbox" data-media-index="${index}" checked />
                            <div class="xedl-media-thumb" style="${previewUrl ? `background-image:url('${previewUrl.replace(/'/g, "\\'")}');` : ''}"></div>
                            <div class="xedl-media-chip">${chip}</div>
                            <div class="xedl-media-meta">
                                <div class="xedl-media-title">${meta.title}</div>
                                <div class="xedl-media-desc">${meta.detail}</div>
                            </div>
                        </label>
                    </div>
                `;
            }).join('');

            if (options.enableBulkActions) {
                const selectAllButton = document.createElement('button');
                selectAllButton.type = 'button';
                selectAllButton.className = 'xedl-btn xedl-btn-ghost';
                selectAllButton.textContent = getPickerText(namespace, 'selectAll');
                selectAllButton.addEventListener('click', () => togglePickerSelection(mediaContainer, true));

                const clearAllButton = document.createElement('button');
                clearAllButton.type = 'button';
                clearAllButton.className = 'xedl-btn xedl-btn-ghost';
                clearAllButton.textContent = getPickerText(namespace, 'clearAll');
                clearAllButton.addEventListener('click', () => togglePickerSelection(mediaContainer, false));

                leftActions.appendChild(selectAllButton);
                leftActions.appendChild(clearAllButton);
            }

            function closePicker(result) {
                modal.remove();
                resolve(result);
            }

            modal.addEventListener('click', event => {
                if (event.target === modal) closePicker(null);
            });

            modal.querySelector(`#${MODAL_ID}-cancel`).addEventListener('click', () => closePicker(null));
            modal.querySelector(`#${MODAL_ID}-confirm`).addEventListener('click', () => {
                const selectedIndexes = Array.from(mediaContainer.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(node => Number(node.getAttribute('data-media-index')))
                    .filter(Number.isFinite);

                if (selectedIndexes.length === 0) {
                    showToast(t('toast.pickerNeedSelection'));
                    return;
                }

                closePicker(selectedIndexes.map(index => items[index]).filter(Boolean));
            });
        });
    }

    function getProgressMessage(done, total) {
        return getLangCode() === 'zh-CN' ? `正在下载 ${done}/${total}` : `Downloading ${done}/${total}`;
    }

    function getPackingMessage(total) {
        return getLangCode() === 'zh-CN' ? `正在打包 ZIP（${total} 个文件）` : `Packing ZIP (${total} files)`;
    }

    function getButtonStateText(namespace, stateName) {
        if (namespace === 'batchButton') return getBatchButtonText(stateName);
        return t(`button.${stateName}`);
    }

    function setButtonState(button, stateName, namespace = button.dataset.labelNamespace || 'button') {
        button.classList.remove('xedl-state-idle', 'xedl-state-loading', 'xedl-state-done', 'xedl-state-failed');
        button.classList.add(`xedl-state-${stateName}`);

        const iconWrap = button.querySelector('.xedl-icon');
        const label = button.querySelector('.xedl-label');
        if (!iconWrap) return;

        const key = stateName === 'idle' ? 'idle' : stateName === 'done' ? 'done' : stateName;
        const icons = {
            idle: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M6.75 19.25H17.25" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 4.25V14.75" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8.9 11.65L12 14.75L15.1 11.65" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
            loading: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M6.75 19.25H17.25" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 4.25V14.75" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8.9 11.65L12 14.75L15.1 11.65" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
            done: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M6.75 19.25H17.25" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8.1 12.75L10.75 15.35L15.9 10.15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
            failed: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.9"></circle><path d="M12 8.2V12.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path><circle cx="12" cy="15.9" r="1.1" fill="currentColor" stroke="none"></circle></svg>'
        };

        iconWrap.innerHTML = icons[stateName];
        const text = getButtonStateText(namespace, key);
        if (label) label.textContent = text;
        button.setAttribute('aria-label', text);
        button.title = text;
    }

    function createButton(options = {}) {
        const namespace = options.namespace || 'button';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = options.floating ? 'xedl-floating-button xedl-state-idle' : 'xedl-button xedl-state-idle';
        button.dataset.labelNamespace = namespace;
        button.innerHTML = `<span class="xedl-icon"></span>${options.floating ? `<span class="xedl-label">${getButtonStateText(namespace, 'idle')}</span>` : ''}`;
        setButtonState(button, 'idle', namespace);
        return button;
    }

    async function downloadTweetMedia(context, article, triggerButton) {
        if (!context?.postId) {
            showToast(t('toast.missingTweet'));
            return;
        }

        setButtonState(triggerButton, 'loading');
        let progressToast = showToast(t('toast.resolving'), 0);

        try {
            const media = await resolveMedia(context, article);
            if (!media.length) {
                setButtonState(triggerButton, hasHistory(context.postId) ? 'done' : 'idle');
                progressToast.close();
                showToast(t('toast.noMedia'));
                return;
            }

            let selectedItems = media;

            if (media.length > 1) {
                progressToast.close();
                const picked = await openMediaPicker(context, media);
                if (!picked) {
                    setButtonState(triggerButton, hasHistory(context.postId) ? 'done' : 'idle');
                    return;
                }
                selectedItems = picked;
                progressToast = showToast(t('toast.downloading'), 0);
            }

            if (selectedItems.length > 1 && isMobile && state.config.zipOnMobile) {
                const files = [];
                progressToast.update(getProgressMessage(0, selectedItems.length), 0);
                for (let index = 0; index < selectedItems.length; index += 1) {
                    files.push({
                        blob: await fetchMediaBlob(selectedItems[index].url),
                        filename: buildFilename(context, selectedItems[index], index, selectedItems.length)
                    });
                    progressToast.update(getProgressMessage(index + 1, selectedItems.length), 0);
                }
                progressToast.update(getPackingMessage(selectedItems.length), 0);
                const archiveName = `${sanitizeFilenamePart(context.userId || 'twitter')}_${sanitizeFilenamePart(context.postId || 'media')}.zip`;
                await downloadAsZip(files, archiveName);
            } else {
                for (let index = 0; index < selectedItems.length; index += 1) {
                    progressToast.update(getProgressMessage(index, selectedItems.length), 0);
                    const blob = await fetchMediaBlob(selectedItems[index].url);
                    const filename = buildFilename(context, selectedItems[index], index, selectedItems.length);
                    triggerDownload(blob, filename);
                    progressToast.update(getProgressMessage(index + 1, selectedItems.length), 0);
                    await sleep(110);
                }
            }

            if (state.config.rememberHistory) await markHistory(context, selectedItems.length);
            setButtonState(triggerButton, 'done');
            progressToast.close();
            showToast(t('toast.downloadDone'));
        } catch (error) {
            console.error(`${SCRIPT_ID}: download failed`, error);
            setButtonState(triggerButton, hasHistory(context.postId) ? 'done' : 'failed');
            progressToast.close();
            showToast(`${t('toast.downloadFailedReason')} ${getErrorMessage(error)}`);
            window.setTimeout(() => {
                if (triggerButton.isConnected) setButtonState(triggerButton, hasHistory(context.postId) ? 'done' : 'idle');
            }, 2600);
        }
    }

    async function downloadBatchMediaFromProfile(triggerButton) {
        triggerButton.disabled = true;
        setButtonState(triggerButton, 'loading', 'batchButton');

        let progressToast = showToast(getBatchCollectMessage(0), 0);

        try {
            const items = await collectBatchMediaItemsDuringScroll(progressToast);
            if (!items.length) {
                progressToast.close();
                setButtonState(triggerButton, getBatchButtonVisualState(), 'batchButton');
                showToast(getBatchEmptyMessage());
                return;
            }

            progressToast.close();
            const uniquePostIds = new Set(items.map(item => item.sourcePostId).filter(Boolean));
            const pickedItems = await openMediaPicker(null, items, {
                namespace: 'batchPicker',
                statsText: getBatchPickerStatsText(uniquePostIds.size, items.length),
                enableBulkActions: true,
                wide: true
            });

            if (!pickedItems) {
                setButtonState(triggerButton, getBatchButtonVisualState(), 'batchButton');
                return;
            }

            progressToast = showToast(getBatchPreparingMessage(), 0);

            const files = [];
            const downloadFailures = [];
            for (let index = 0; index < pickedItems.length; index += 1) {
                progressToast.update(getProgressMessage(index, pickedItems.length), 0);
                const item = pickedItems[index];
                try {
                    const successIndex = files.length;
                    files.push({
                        blob: await fetchMediaBlob(item.url),
                        filename: buildFilename({
                            postId: item.sourcePostId,
                            userId: item.sourceUserId,
                            userName: item.sourceUserName,
                            postTime: item.sourcePostTime
                        }, item, successIndex, pickedItems.length)
                    });
                } catch (error) {
                    console.warn(`${SCRIPT_ID}: batch media fetch failed`, error);
                    downloadFailures.push({ item, error });
                }
                progressToast.update(getProgressMessage(index + 1, pickedItems.length), 0);
            }

            if (!files.length) {
                throw new Error(t('toast.downloadFailed'));
            }

            progressToast.update(getBatchPackingMessage(files.length), 0);
            await downloadAsZip(files, buildBatchArchiveName(pickedItems));

            if (state.config.rememberHistory) {
                const selectedCounts = new Map();
                pickedItems.forEach(item => {
                    if (downloadFailures.some(entry => entry.item.url === item.url && entry.item.sourcePostId === item.sourcePostId)) {
                        return;
                    }
                    if (!item.sourcePostId) return;
                    selectedCounts.set(item.sourcePostId, (selectedCounts.get(item.sourcePostId) || 0) + 1);
                });

                for (const [postId, mediaCount] of selectedCounts.entries()) {
                    const sample = pickedItems.find(item => item.sourcePostId === postId);
                    if (sample) {
                        await markHistory({
                            postId,
                            userId: sample.sourceUserId,
                            userName: sample.sourceUserName,
                            postTime: sample.sourcePostTime
                        }, mediaCount);
                    }
                }
            }

            progressToast.close();
            const failedCount = downloadFailures.length;
            setButtonState(triggerButton, 'done', 'batchButton');
            processAll();
            showToast(failedCount > 0 ? getBatchPartialFailedMessage(files.length, failedCount) : getBatchDoneMessage());
        } catch (error) {
            console.error(`${SCRIPT_ID}: batch download failed`, error);
            progressToast.close();
            setButtonState(triggerButton, 'failed', 'batchButton');
            showToast(`${t('toast.downloadFailedReason')} ${getErrorMessage(error)}`);
            window.setTimeout(() => {
                if (triggerButton.isConnected) setButtonState(triggerButton, getBatchButtonVisualState(), 'batchButton');
            }, 2600);
        } finally {
            triggerButton.disabled = false;
        }
    }

    function closeSettings() {
        document.getElementById(MODAL_ID)?.remove();
    }

    function stopEventBubble(event) {
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
    }

    function blockDefaultAndBubble(event) {
        event.preventDefault();
        stopEventBubble(event);
    }

    async function warmupTweetMedia(article) {
        const context = getTweetContext(article);
        if (!context?.postId) return;
        if (state.resolvedMediaCache.has(context.postId)) return;
        try {
            await resolveMedia(context, article);
        } catch (error) {
            console.debug(`${SCRIPT_ID}: warmup failed`, error);
        }
    }

    function openBatchZipSettings() {
        ensureStyles();
        closeSettings();

        const modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.innerHTML = `
            <div class="xedl-modal-card" role="dialog" aria-modal="true" aria-labelledby="${MODAL_ID}-title">
                <h2 id="${MODAL_ID}-title">${getBatchZipModalText('title')}</h2>
                <div class="xedl-field">
                    <label for="${MODAL_ID}-zip-template">${getBatchZipModalText('template')}</label>
                    <textarea id="${MODAL_ID}-zip-template" spellcheck="false"></textarea>
                    <div class="xedl-hint">${getBatchZipModalText('templateHint')}</div>
                    <div class="xedl-preview"><strong>${getBatchZipModalText('preview')}:</strong> <span id="${MODAL_ID}-zip-preview"></span></div>
                </div>
                <div class="xedl-actions">
                    <div class="xedl-actions-group">
                        <button type="button" class="xedl-btn xedl-btn-ghost" id="${MODAL_ID}-restore">${getBatchZipModalText('restore')}</button>
                    </div>
                    <div class="xedl-actions-group">
                        <button type="button" class="xedl-btn xedl-btn-secondary" id="${MODAL_ID}-cancel">${getBatchZipModalText('cancel')}</button>
                        <button type="button" class="xedl-btn xedl-btn-primary" id="${MODAL_ID}-save">${getBatchZipModalText('save')}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const templateInput = modal.querySelector(`#${MODAL_ID}-zip-template`);
        const preview = modal.querySelector(`#${MODAL_ID}-zip-preview`);

        function updatePreview() {
            preview.textContent = renderBatchZipTemplate(templateInput.value || DEFAULT_BATCH_ZIP_TEMPLATE, {
                userId: 'sample_user',
                userName: 'Sample User'
            });
        }

        templateInput.value = state.config.batchZipTemplate || DEFAULT_BATCH_ZIP_TEMPLATE;
        updatePreview();

        templateInput.addEventListener('input', updatePreview);
        modal.addEventListener('click', event => {
            if (event.target === modal) closeSettings();
        });

        modal.querySelector(`#${MODAL_ID}-restore`).addEventListener('click', () => {
            templateInput.value = DEFAULT_BATCH_ZIP_TEMPLATE;
            updatePreview();
        });

        modal.querySelector(`#${MODAL_ID}-cancel`).addEventListener('click', closeSettings);
        modal.querySelector(`#${MODAL_ID}-save`).addEventListener('click', () => {
            saveConfig({
                ...state.config,
                batchZipTemplate: templateInput.value.trim() || DEFAULT_BATCH_ZIP_TEMPLATE
            });
            showToast(getBatchZipModalText('saved'));
            closeSettings();
        });

        window.addEventListener('keydown', function onKeyDown(event) {
            if (event.key === 'Escape') {
                window.removeEventListener('keydown', onKeyDown);
                closeSettings();
            }
        }, { once: true });
    }

    function openSettings() {
        ensureStyles();
        closeSettings();

        const modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.innerHTML = `
            <div class="xedl-modal-card" role="dialog" aria-modal="true" aria-labelledby="${MODAL_ID}-title">
                <h2 id="${MODAL_ID}-title">${t('modal.title')}</h2>
                <div class="xedl-field">
                    <label for="${MODAL_ID}-template">${t('modal.template')}</label>
                    <textarea id="${MODAL_ID}-template" spellcheck="false"></textarea>
                    <div class="xedl-hint">${t('modal.templateHint')}</div>
                    <div class="xedl-preview"><strong>${t('modal.preview')}:</strong> <span id="${MODAL_ID}-preview"></span></div>
                </div>
                <div class="xedl-check-row">
                    <label class="xedl-check"><input id="${MODAL_ID}-remember" type="checkbox" /> <span>${t('modal.rememberHistory')}</span></label>
                    <label class="xedl-check"><input id="${MODAL_ID}-zip" type="checkbox" /> <span>${t('modal.zipOnMobile')}</span></label>
                </div>
                <div class="xedl-actions">
                    <div class="xedl-actions-group">
                        <button type="button" class="xedl-btn xedl-btn-ghost" id="${MODAL_ID}-restore">${t('modal.restore')}</button>
                        <button type="button" class="xedl-btn xedl-btn-ghost" id="${MODAL_ID}-clear">${t('modal.clearHistory')}</button>
                    </div>
                    <div class="xedl-actions-group">
                        <button type="button" class="xedl-btn xedl-btn-secondary" id="${MODAL_ID}-cancel">${t('modal.cancel')}</button>
                        <button type="button" class="xedl-btn xedl-btn-primary" id="${MODAL_ID}-save">${t('modal.save')}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const templateInput = modal.querySelector(`#${MODAL_ID}-template`);
        const rememberInput = modal.querySelector(`#${MODAL_ID}-remember`);
        const zipInput = modal.querySelector(`#${MODAL_ID}-zip`);
        const preview = modal.querySelector(`#${MODAL_ID}-preview`);

        function updatePreview() {
            const sample = {
                userId: 'sample_user',
                userName: 'Sample User',
                postId: '1900000000000000000',
                postTime: '2026-04-02T12:34:56.000Z'
            };
            const tokens = {
                'user-id': sample.userId,
                'user-name': sample.userName,
                'post-id': sample.postId,
                'post-time': formatPostTime(sample.postTime),
                'media-type': 'photo',
                index: '1',
                ext: 'jpg'
            };
            let body = (templateInput.value || DEFAULT_CONFIG.filenameTemplate).replace(/\{([^}]+)\}/g, (match, token) => tokens[token] ?? '');
            body = sanitizeFilenamePart(body) || 'sample_media';
            preview.textContent = `${body}.jpg`;
        }

        templateInput.value = state.config.filenameTemplate;
        rememberInput.checked = state.config.rememberHistory;
        zipInput.checked = state.config.zipOnMobile;
        updatePreview();

        templateInput.addEventListener('input', updatePreview);
        modal.addEventListener('click', event => {
            if (event.target === modal) closeSettings();
        });

        modal.querySelector(`#${MODAL_ID}-restore`).addEventListener('click', () => {
            templateInput.value = DEFAULT_FILENAME_TEMPLATE;
            rememberInput.checked = DEFAULT_CONFIG.rememberHistory;
            zipInput.checked = DEFAULT_CONFIG.zipOnMobile;
            updatePreview();
        });

        modal.querySelector(`#${MODAL_ID}-clear`).addEventListener('click', async () => {
            await clearHistory();
            processAll();
            showToast(t('toast.historyCleared'));
        });

        modal.querySelector(`#${MODAL_ID}-cancel`).addEventListener('click', closeSettings);
        modal.querySelector(`#${MODAL_ID}-save`).addEventListener('click', async () => {
            const nextConfig = {
                filenameTemplate: templateInput.value.trim() || DEFAULT_FILENAME_TEMPLATE,
                batchZipTemplate: state.config.batchZipTemplate || DEFAULT_BATCH_ZIP_TEMPLATE,
                rememberHistory: rememberInput.checked,
                zipOnMobile: zipInput.checked
            };
            const rememberChanged = state.config.rememberHistory !== nextConfig.rememberHistory;
            saveConfig(nextConfig);
            if (rememberChanged) {
                if (nextConfig.rememberHistory) await loadHistoryCache();
                else {
                    state.historyCache.clear();
                    showToast(t('toast.historyDisabled'));
                }
            }
            processAll();
            showToast(t('toast.settingsSaved'));
            closeSettings();
        });

        window.addEventListener('keydown', function onKeyDown(event) {
            if (event.key === 'Escape') {
                window.removeEventListener('keydown', onKeyDown);
                closeSettings();
            }
        }, { once: true });
    }

    function createTimelineButton(article) {
        const actionGroup = article.querySelector('div[role="group"]');
        if (!actionGroup) return;
        const existingButton = actionGroup.querySelector('.xedl-button');
        if (existingButton) {
            if (!existingButton.classList.contains('xedl-state-loading')) {
                const currentContext = getTweetContext(article);
                setButtonState(existingButton, currentContext?.postId && hasHistory(currentContext.postId) ? 'done' : 'idle');
            }
            return;
        }
        if (!quickHasMedia(article)) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'xedl-action-item';
        const button = createButton();
        wrapper.appendChild(button);
        actionGroup.appendChild(wrapper);

        const context = getTweetContext(article);
        if (context?.postId && hasHistory(context.postId)) {
            setButtonState(button, 'done');
        }

        button.addEventListener('mouseenter', () => {
            warmupTweetMedia(article);
        }, { passive: true });

        button.addEventListener('click', event => {
            blockDefaultAndBubble(event);
            downloadTweetMedia(getTweetContext(article), article, button);
        }, true);

        button.addEventListener('contextmenu', event => {
            blockDefaultAndBubble(event);
            openSettings();
        }, true);
    }

    function findActiveMediaArticle() {
        const tweetId = parseTweetIdentifiers(location.href)?.postId;
        if (!tweetId) return null;
        return Array.from(document.querySelectorAll('article[data-testid="tweet"]')).find(article => {
            const context = getTweetContext(article);
            return context?.postId === tweetId;
        }) || null;
    }

    function upsertFloatingButton() {
        const mediaRoute = isMediaViewRoute();
        const existingWrap = document.getElementById(FLOATING_BUTTON_ID)?.parentElement;
        if (!mediaRoute) {
            existingWrap?.remove();
            return;
        }

        if (existingWrap) {
            const existingButton = existingWrap.querySelector('.xedl-floating-button');
            if (existingButton && !existingButton.classList.contains('xedl-state-loading')) {
                const currentArticle = findActiveMediaArticle();
                const currentContext = currentArticle ? getTweetContext(currentArticle) : parseTweetIdentifiers(location.href);
                setButtonState(existingButton, currentContext?.postId && hasHistory(currentContext.postId) ? 'done' : 'idle');
            }
            return;
        }

        const wrap = document.createElement('div');
        wrap.className = 'xedl-floating-wrap';
        const button = createButton({ floating: true });
        button.id = FLOATING_BUTTON_ID;
        wrap.appendChild(button);
        document.body.appendChild(wrap);

        const article = findActiveMediaArticle();
        const context = article ? getTweetContext(article) : parseTweetIdentifiers(location.href);
        if (context?.postId && hasHistory(context.postId)) setButtonState(button, 'done');

        button.addEventListener('click', event => {
            blockDefaultAndBubble(event);
            const activeArticle = findActiveMediaArticle();
            if (!activeArticle) {
                showToast(t('toast.missingTweet'));
                return;
            }
            downloadTweetMedia(getTweetContext(activeArticle), activeArticle, button);
        }, true);

        button.addEventListener('contextmenu', event => {
            blockDefaultAndBubble(event);
            openSettings();
        }, true);
    }

    function upsertBatchFloatingButton() {
        const existingWrap = document.getElementById(BATCH_FLOATING_BUTTON_ID)?.parentElement;
        if (!isProfileMediaRoute()) {
            existingWrap?.remove();
            return;
        }

        if (existingWrap) {
            const existingButton = existingWrap.querySelector('.xedl-floating-button');
            if (existingButton && !existingButton.classList.contains('xedl-state-loading')) {
                setButtonState(existingButton, getBatchButtonVisualState(), 'batchButton');
            }
            return;
        }

        const wrap = document.createElement('div');
        wrap.className = 'xedl-batch-floating-wrap';
        const button = createButton({ floating: true, namespace: 'batchButton' });
        button.id = BATCH_FLOATING_BUTTON_ID;
        wrap.appendChild(button);
        document.body.appendChild(wrap);

        setButtonState(button, getBatchButtonVisualState(), 'batchButton');

        button.addEventListener('click', event => {
            blockDefaultAndBubble(event);
            downloadBatchMediaFromProfile(button);
        }, true);

        button.addEventListener('contextmenu', event => {
            blockDefaultAndBubble(event);
            openBatchZipSettings();
        }, true);
    }

    function processAll() {
        state.isApplyingUiMutations = true;
        ensureStyles();
        try {
            document.querySelectorAll('article[data-testid="tweet"]').forEach(article => createTimelineButton(article));
            upsertFloatingButton();
            upsertBatchFloatingButton();
        } finally {
            requestAnimationFrame(() => {
                state.isApplyingUiMutations = false;
            });
        }
    }

    function scheduleProcess() {
        if (state.processingScheduled) return;
        state.processingScheduled = true;
        window.clearTimeout(state.processingTimer);
        state.processingTimer = window.setTimeout(() => {
            state.processingScheduled = false;
            processAll();
        }, 40);
    }

    function isOwnInjectedNode(node) {
        if (!(node instanceof Element)) return false;
        if (node.id && node.id.startsWith(SCRIPT_ID)) return true;
        if (node.classList && Array.from(node.classList).some(name => name.startsWith('xedl-'))) return true;
        return Boolean(node.closest(`#${MODAL_ID}, #${TOAST_CONTAINER_ID}, .xedl-action-item, .xedl-floating-wrap, .xedl-batch-floating-wrap`));
    }

    function mutationNeedsProcessing(mutations) {
        for (const mutation of mutations) {
            if (isOwnInjectedNode(mutation.target)) continue;
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;
                if (isOwnInjectedNode(node)) continue;
                if (
                    node.matches?.('article[data-testid="tweet"]') ||
                    node.querySelector?.('article[data-testid="tweet"]') ||
                    node.matches?.('main, section, [data-testid="primaryColumn"], [aria-label="Timeline: Your Home Timeline"]')
                ) {
                    return true;
                }
            }
            for (const node of mutation.removedNodes) {
                if (!(node instanceof Element)) continue;
                if (isOwnInjectedNode(node)) continue;
                if (
                    node.matches?.('article[data-testid="tweet"]') ||
                    node.querySelector?.('article[data-testid="tweet"]') ||
                    node.matches?.(`#${FLOATING_BUTTON_ID}`) ||
                    node.querySelector?.(`#${FLOATING_BUTTON_ID}`)
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    function registerMenuCommands() {
        if (typeof GM_registerMenuCommand !== 'function') return;
        GM_registerMenuCommand(t('menu.openSettings'), openSettings);
        GM_registerMenuCommand(t('menu.clearHistory'), async () => {
            await clearHistory();
            processAll();
            showToast(t('toast.historyCleared'));
        });
    }

    function observePage() {
        const observer = new MutationObserver(mutations => {
            if (state.isApplyingUiMutations) return;
            if (!mutationNeedsProcessing(mutations)) return;
            scheduleProcess();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('load', scheduleProcess);
        window.addEventListener('popstate', () => scheduleProcess());
        window.addEventListener('hashchange', () => scheduleProcess());

        const originalPushState = history.pushState;
        history.pushState = function patchedPushState() {
            const result = originalPushState.apply(this, arguments);
            scheduleProcess();
            return result;
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function patchedReplaceState() {
            const result = originalReplaceState.apply(this, arguments);
            scheduleProcess();
            return result;
        };
    }

    async function init() {
        ensureStyles();
        registerMenuCommands();
        await loadHistoryCache();
        observePage();
        scheduleProcess();
    }

    init().catch(error => {
        console.error(`${SCRIPT_ID}: initialization failed`, error);
    });
})();
