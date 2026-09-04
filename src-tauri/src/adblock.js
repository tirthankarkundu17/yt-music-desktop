/**
 * YouTube Music uBlock-Origin Style Engine
 *
 * Implements:
 * 1. Network level ad request blocking (doubleclick, googleads, telemetry)
 * 2. Deep JSON response pruning (strips adPlacements, playerAds, adSlots from /player and /next endpoints)
 * 3. ytInitialPlayerResponse & ytcfg property trap/interception
 * 4. Fallback Player API & DOM ad skipper / speed-up
 * 5. Background inactivity ("Are you still listening?") auto-dismissal
 * 6. Premium upsell / trial promo auto-dismissal & cosmetic CSS filtering
 * 7. Live counter badge in the navigation bar
 */

(function () {
  'use strict';

  // --- 1. Configuration & Blocklists ---
  const STORAGE_KEY = 'ytm_ads_blocked_count';
  let blockedCount = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

  const BLOCKED_DOMAINS_AND_PATHS = [
    'googleads.g.doubleclick.net',
    'pagead2.googlesyndication.com',
    'ad.doubleclick.net',
    'pubads.g.doubleclick.net',
    'securepubads.g.doubleclick.net',
    'youtube.com/api/stats/ads',
    'youtube.com/pagead/',
    'youtube.com/ptracking',
    'youtube.com/get_midroll_info',
    '/youtubei/v1/log_event',
    '/youtubei/v1/feedback',
  ];

  function isBlockedUrl(url) {
    if (!url || typeof url !== 'string') return false;
    for (let i = 0; i < BLOCKED_DOMAINS_AND_PATHS.length; i++) {
      if (url.includes(BLOCKED_DOMAINS_AND_PATHS[i])) {
        return true;
      }
    }
    return false;
  }

  // --- 2. Counter Badge & UI Feedback ---
  function updateBadgeText() {
    const host = document.getElementById('ytm-ublock-host');
    if (host && host.shadowRoot) {
      const countSpan = host.shadowRoot.getElementById('count');
      if (countSpan) {
        countSpan.textContent = blockedCount;
      }
    }
  }

  function updateBadgePosition() {
    const host = document.getElementById('ytm-ublock-host');
    if (!host || !host.shadowRoot) return;
    const badge = host.shadowRoot.getElementById('badge');
    if (!badge) return;

    // Dynamically align badge to the left of YouTube Music's right controls (profile avatar, cast button, sign-in button)
    const rightContent =
      document.querySelector('ytmusic-nav-bar #right-content') ||
      document.querySelector('#right-content') ||
      document.querySelector('ytmusic-settings-button') ||
      document.querySelector('ytmusic-sign-in-button');

    if (rightContent) {
      const rect = rightContent.getBoundingClientRect();
      if (rect.left > 0 && rect.left < window.innerWidth) {
        const computedRight = Math.max(130, Math.round(window.innerWidth - rect.left + 16));
        badge.style.right = `${computedRight}px`;
        return;
      }
    }
    badge.style.right = '130px';
  }

  function triggerBadgePulse() {
    const host = document.getElementById('ytm-ublock-host');
    if (host && host.shadowRoot) {
      const badge = host.shadowRoot.getElementById('badge');
      if (badge) {
        badge.classList.remove('pulse');
        void badge.offsetWidth;
        badge.classList.add('pulse');
      }
    }
  }

  function incrementBlockedCount(amount = 1) {
    blockedCount += amount;
    localStorage.setItem(STORAGE_KEY, blockedCount.toString());
    updateBadgeText();
    triggerBadgePulse();
  }

  // --- 3. JSON Pruning (uBlock Origin json-prune replication) ---
  const AD_PROPERTIES_TO_PRUNE = [
    'adPlacements',
    'playerAds',
    'adSlots',
    'adBreakHeartbeatParams',
    'adBreakParams',
    'adParams',
    'adLayoutMetadata',
    'adPlacementRenderer',
  ];

  function pruneAdData(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    let modified = false;

    // Prune known root and nested ad properties
    for (const key of AD_PROPERTIES_TO_PRUNE) {
      if (key in obj) {
        delete obj[key];
        modified = true;
      }
    }

    // Prune ad tracking endpoints from playbackTracking if present
    if (obj.playbackTracking && typeof obj.playbackTracking === 'object') {
      const trackingKeys = ['ptrackingUrl', 'qoeUrl', 'atrUrl', 'videostatsDelayplayUrl', 'videostatsWatchtimeUrl'];
      for (const k of trackingKeys) {
        if (k in obj.playbackTracking) {
          delete obj.playbackTracking[k];
          modified = true;
        }
      }
    }

    // Prune promo and upsell modal dialogs from message renderers
    if (obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers) {
      if (obj.auxiliaryUi.messageRenderers.upsellDialogRenderer) {
        delete obj.auxiliaryUi.messageRenderers.upsellDialogRenderer;
        modified = true;
      }
      if (obj.auxiliaryUi.messageRenderers.mealbarPromoRenderer) {
        delete obj.auxiliaryUi.messageRenderers.mealbarPromoRenderer;
        modified = true;
      }
    }

    // Recursively check embedded player responses or nested objects if needed
    if (obj.playerResponse && typeof obj.playerResponse === 'object') {
      if (pruneAdData(obj.playerResponse)) {
        modified = true;
      }
    }

    return modified ? obj : obj;
  }

  // --- 4. Network Interception (Fetch & XMLHttpRequest) ---
  // Hook window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const resource = args[0];
    const url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');

    // 1. Drop blocked ad/telemetry domains
    if (isBlockedUrl(url)) {
      console.log('%c[uBlock Engine] 🚫 Blocked ad network request:', 'color: #ff5252; font-weight: bold;', url);
      incrementBlockedCount();
      return new Response(JSON.stringify({ blocked: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await originalFetch.apply(this, args);

    // 2. Intercept YouTube Player and Next endpoints to prune ad data
    if (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next')) {
      try {
        const clone = response.clone();
        const text = await clone.text();
        let data = JSON.parse(text);

        const hadAdPlacements = Boolean(data.adPlacements || data.adSlots || data.playerAds);
        data = pruneAdData(data);

        if (hadAdPlacements) {
          console.log('%c[uBlock Engine] 🛡️ Pruned adPlacements & adSlots from player response:', 'color: #4caf50; font-weight: bold;', url);
          incrementBlockedCount();
        }

        const sanitizedBody = JSON.stringify(data);
        return new Response(sanitizedBody, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (err) {
        return response;
      }
    }

    return response;
  };

  // Hook XMLHttpRequest
  const OriginalXHR = window.XMLHttpRequest;
  const xhrOpen = OriginalXHR.prototype.open;
  const xhrSend = OriginalXHR.prototype.send;

  OriginalXHR.prototype.open = function (method, url, ...rest) {
    this._url = typeof url === 'string' ? url : (url && url.toString ? url.toString() : '');
    return xhrOpen.call(this, method, url, ...rest);
  };

  OriginalXHR.prototype.send = function (...args) {
    if (this._url && isBlockedUrl(this._url)) {
      console.log('%c[uBlock Engine] 🚫 Blocked XHR ad network request:', 'color: #ff5252; font-weight: bold;', this._url);
      incrementBlockedCount();
      Object.defineProperty(this, 'status', { get: () => 200 });
      Object.defineProperty(this, 'readyState', { get: () => 4 });
      Object.defineProperty(this, 'responseText', { get: () => '{}' });
      Object.defineProperty(this, 'response', { get: () => '{}' });
      setTimeout(() => {
        this.dispatchEvent(new Event('readystatechange'));
        this.dispatchEvent(new Event('load'));
        this.dispatchEvent(new Event('loadend'));
      }, 0);
      return;
    }

    if (this._url && (this._url.includes('/youtubei/v1/player') || this._url.includes('/youtubei/v1/next'))) {
      this.addEventListener('readystatechange', () => {
        if (this.readyState === 4 && this.status === 200) {
          try {
            let data = JSON.parse(this.responseText);
            const hadAds = Boolean(data.adPlacements || data.adSlots || data.playerAds);
            data = pruneAdData(data);
            if (hadAds) {
              console.log('%c[uBlock Engine] 🛡️ Pruned XHR player ads payload:', 'color: #4caf50; font-weight: bold;', this._url);
              incrementBlockedCount();
            }
            const sanitizedText = JSON.stringify(data);
            Object.defineProperty(this, 'responseText', { get: () => sanitizedText });
            Object.defineProperty(this, 'response', { get: () => sanitizedText });
          } catch (e) {}
        }
      });
    }

    return xhrSend.apply(this, args);
  };

  // --- 5. Global Property Trapping (set-constant & ytInitialPlayerResponse) ---
  let _ytInitialPlayerResponse;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get: () => _ytInitialPlayerResponse,
      set: (val) => {
        if (val && typeof val === 'object') {
          const hadAds = Boolean(val.adPlacements || val.adSlots || val.playerAds);
          _ytInitialPlayerResponse = pruneAdData(val);
          if (hadAds) {
            console.log('%c[uBlock Engine] 🛡️ Pruned ytInitialPlayerResponse ads payload', 'color: #4caf50; font-weight: bold;');
            incrementBlockedCount();
          }
        } else {
          _ytInitialPlayerResponse = val;
        }
      },
      configurable: true,
    });
  } catch (e) {}

  // Trap ytcfg embedded responses
  function patchYtcfg() {
    if (window.ytcfg && window.ytcfg.set && !window.ytcfg._adblockPatched) {
      const origYtcfgSet = window.ytcfg.set;
      window.ytcfg.set = function (obj, ...rest) {
        if (obj && typeof obj === 'object') {
          if (obj.PLAYER_VARS && obj.PLAYER_VARS.embedded_player_response) {
            try {
              let resp = JSON.parse(obj.PLAYER_VARS.embedded_player_response);
              resp = pruneAdData(resp);
              obj.PLAYER_VARS.embedded_player_response = JSON.stringify(resp);
            } catch (e) {}
          }
        }
        return origYtcfgSet.call(this, obj, ...rest);
      };
      window.ytcfg._adblockPatched = true;
    }
  }

  // --- 6. Fallback Player API & DOM Fast-Skipper ---
  let isHandlingAd = false;
  function handleDomAds() {
    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video');

    if (moviePlayer && video) {
      // Check YouTube player internal ad state
      const isAdShowing =
        (typeof moviePlayer.getAdState === 'function' && moviePlayer.getAdState() === 1) ||
        moviePlayer.classList.contains('ad-showing') ||
        moviePlayer.classList.contains('ad-interrupting') ||
        document.querySelector('.ytp-ad-player-overlay') !== null ||
        document.querySelector('.ytp-ad-text') !== null ||
        document.querySelector('.ytp-ad-preview-container') !== null;

      if (isAdShowing) {
        if (!isHandlingAd) {
          isHandlingAd = true;
          incrementBlockedCount();
        }

        // Try native Player API skip first
        if (typeof moviePlayer.skipAd === 'function') {
          try { moviePlayer.skipAd(); } catch (e) {}
        }
        if (typeof moviePlayer.cancelPlayback === 'function') {
          try { moviePlayer.cancelPlayback(); } catch (e) {}
        }

        // Mute and fast-forward stream
        video.muted = true;
        video.playbackRate = 16.0;
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration;
        }

        // Trigger skip button clicks
        const skipButtons = document.querySelectorAll(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot, [id^="skip-button"], .ytp-ad-overlay-close-button'
        );
        skipButtons.forEach((btn) => {
          if (typeof btn.click === 'function') {
            btn.click();
          }
        });
      } else {
        if (isHandlingAd) {
          isHandlingAd = false;
          if (video.playbackRate === 16.0) {
            video.playbackRate = 1.0;
          }
          video.muted = false;
        }
      }
    }

    // Auto-dismiss "Are you still listening?" / Inactivity prompt
    const youThereConfirm = document.querySelector('ytmusic-you-there-renderer #confirm-button, ytmusic-you-there-renderer button');
    if (youThereConfirm && typeof youThereConfirm.click === 'function') {
      youThereConfirm.click();
    }

    // Auto-dismiss "Upgrade to Premium" / Free Trial upsell dialogs
    const dismissButtons = document.querySelectorAll(
      'ytmusic-mealbar-promo-renderer #dismiss-button, ytmusic-upsell-dialog-renderer #dismiss-button, ytmusic-upsell-dialog-renderer tp-yt-paper-button'
    );
    dismissButtons.forEach((btn) => {
      if (typeof btn.click === 'function') {
        btn.click();
      }
    });
  }

  // --- 7. Cosmetic Hiding Styles & Badge Styles ---
  function injectStyles() {
    if (document.getElementById('ytm-adblock-styles')) return;
    const style = document.createElement('style');
    style.id = 'ytm-adblock-styles';
    style.textContent = `
      /* Ad banners & overlay modules */
      #player-ads,
      .ytp-ad-module,
      .ytp-ad-overlay-container,
      .ytp-ad-image-overlay,
      ytmusic-companion-slot-renderer,
      ytmusic-player-bar-ad,
      .ytmusic-player-bar-ad,
      ytmusic-banner-promo-renderer,
      
      /* "Upgrade to Premium" / Free Trial dialogs & banners */
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(a[href*="premium"]),
      ytmusic-guide-entry-renderer:has(a[href*="music_premium"]) {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureBadgeInDOM() {
    const root = document.documentElement || document.body;
    if (!root) return;

    let host = document.getElementById('ytm-ublock-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'ytm-ublock-host';
      host.style.position = 'fixed';
      host.style.top = '0';
      host.style.right = '0';
      host.style.zIndex = '1001';
      host.style.pointerEvents = 'none';

      const shadow = host.attachShadow({ mode: 'open' });

      // 1. Create Style
      const style = document.createElement('style');
      style.textContent = `
        .badge {
          position: fixed;
          top: 14px;
          right: 130px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(28, 28, 28, 0.92);
          color: #f1f1f1;
          font-family: 'YouTube Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
          cursor: pointer;
          user-select: none;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          pointer-events: auto;
          transition: all 0.2s ease;
          height: 28px;
          box-sizing: border-box;
        }
        .badge:hover {
          background: rgba(45, 45, 45, 0.98);
          border-color: rgba(76, 175, 80, 0.6);
          transform: scale(1.03);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
        }
        .shield-icon {
          font-size: 13px;
          filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.8));
        }
        .count-number {
          color: #4caf50;
          font-weight: 700;
        }
        .badge.pulse {
          animation: pulse-anim 0.6s ease-out;
        }
        @keyframes pulse-anim {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.8); }
          50% { transform: scale(1.08); box-shadow: 0 0 12px 5px rgba(76, 175, 80, 0.5); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
      `;
      shadow.appendChild(style);

      // 2. Create Badge Container
      const badgeElem = document.createElement('div');
      badgeElem.className = 'badge';
      badgeElem.id = 'badge';
      badgeElem.title = 'uBlock Engine • Click to reset count';

      // 3. Create Shield Icon
      const shieldSpan = document.createElement('span');
      shieldSpan.className = 'shield-icon';
      shieldSpan.textContent = '🛡️';
      badgeElem.appendChild(shieldSpan);

      // 4. Create Count Span
      const countSpan = document.createElement('span');
      countSpan.className = 'count-number';
      countSpan.id = 'count';
      countSpan.textContent = blockedCount.toString();
      badgeElem.appendChild(countSpan);

      // 5. Create Text Label
      const labelSpan = document.createElement('span');
      labelSpan.textContent = 'ads blocked';
      badgeElem.appendChild(labelSpan);

      // 6. Event Listener
      badgeElem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Blocked ${blockedCount} ads & trackers so far.\n\nDo you want to reset the counter to 0?`)) {
          blockedCount = 0;
          localStorage.setItem(STORAGE_KEY, '0');
          updateBadgeText();
        }
      });

      shadow.appendChild(badgeElem);
      root.appendChild(host);
      updateBadgePosition();
      console.log('%c[uBlock Engine] 🛡️ Shadow DOM Badge attached to documentElement', 'color: #4caf50; font-weight: bold;');
    } else if (!root.contains(host)) {
      root.appendChild(host);
      updateBadgePosition();
    } else {
      updateBadgePosition();
    }
  }

  // --- 8. Lifecycle & Observers ---
  function init() {
    patchYtcfg();
    injectStyles();
    ensureBadgeInDOM();
    updateBadgePosition();
    handleDomAds();

    window.addEventListener('resize', updateBadgePosition, { passive: true });

    const observer = new MutationObserver(() => {
      patchYtcfg();
      handleDomAds();
      injectStyles();
      ensureBadgeInDOM();
      updateBadgePosition();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'src'],
    });

    setInterval(() => {
      patchYtcfg();
      handleDomAds();
      ensureBadgeInDOM();
      updateBadgePosition();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
