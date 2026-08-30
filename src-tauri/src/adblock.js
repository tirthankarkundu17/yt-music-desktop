(function () {
  'use strict';

  // 1. Storage & State for Blocked Ads Counter
  const STORAGE_KEY = 'ytm_ads_blocked_count';
  let blockedCount = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  let isHandlingCurrentAd = false;

  // 2. Inject CSS rules for ad hiding & the counter badge
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
      
      /* "Upgrade to Premium" / Free Trial dialogs & banners */
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(a[href*="premium"]) {
        display: none !important;
      }

      /* AdBlocker Counter Badge */
      #ytm-adblock-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        color: #e0e0e0;
        font-family: Roboto, 'Segoe UI', Arial, sans-serif;
        font-size: 12px;
        font-weight: 500;
        padding: 5px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
        margin-right: 12px;
        backdrop-filter: blur(8px);
        z-index: 9999;
      }

      #ytm-adblock-badge:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.25);
        transform: scale(1.03);
      }

      #ytm-adblock-badge .shield-icon {
        font-size: 13px;
        filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.6));
      }

      #ytm-adblock-badge .count-number {
        color: #4caf50;
        font-weight: 700;
      }

      #ytm-adblock-badge.pulse {
        animation: ytm-adblock-pulse 0.6s ease-out;
      }

      @keyframes ytm-adblock-pulse {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
        }
        50% {
          transform: scale(1.08);
          box-shadow: 0 0 10px 3px rgba(76, 175, 80, 0.4);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
        }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // 3. UI Badge management
  function updateBadgeText() {
    const countSpan = document.querySelector('#ytm-adblock-badge .count-number');
    if (countSpan) {
      countSpan.textContent = blockedCount;
    }
  }

  function triggerBadgePulse() {
    const badge = document.getElementById('ytm-adblock-badge');
    if (badge) {
      badge.classList.remove('pulse');
      // Trigger reflow to restart CSS animation
      void badge.offsetWidth;
      badge.classList.add('pulse');
    }
  }

  function incrementBlockedCount() {
    blockedCount += 1;
    localStorage.setItem(STORAGE_KEY, blockedCount.toString());
    updateBadgeText();
    triggerBadgePulse();
  }

  function ensureBadgeInDOM() {
    let badge = document.getElementById('ytm-adblock-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'ytm-adblock-badge';
      badge.title = 'YouTube Music AdBlocker • Click to reset count';
      badge.innerHTML = `<span class="shield-icon">🛡️</span> <span class="count-number">${blockedCount}</span> ads blocked`;
      
      badge.addEventListener('click', () => {
        if (confirm(`Blocked ${blockedCount} ads so far. Do you want to reset the counter to 0?`)) {
          blockedCount = 0;
          localStorage.setItem(STORAGE_KEY, '0');
          updateBadgeText();
        }
      });
    }

    // Try to attach badge to YouTube Music top navigation bar
    const navRight = document.querySelector('ytmusic-nav-bar .right-content') ||
                     document.querySelector('ytmusic-nav-bar #right-content') ||
                     document.querySelector('.ytmusic-nav-bar #right-content');

    if (navRight && !navRight.contains(badge)) {
      badge.style.position = 'relative';
      badge.style.top = 'unset';
      badge.style.right = 'unset';
      navRight.prepend(badge);
    } else if (!navRight && !document.body.contains(badge)) {
      // Fallback floating top-right if navbar hasn't rendered yet
      badge.style.position = 'fixed';
      badge.style.top = '12px';
      badge.style.right = '60px';
      document.body.appendChild(badge);
    }
  }

  // 4. High-speed ad skipper & counter
  function handleAds() {
    const moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video');

    if (moviePlayer && video) {
      const isAdActive =
        moviePlayer.classList.contains('ad-showing') ||
        moviePlayer.classList.contains('ad-interrupting') ||
        document.querySelector('.ytp-ad-text') !== null ||
        document.querySelector('.ytp-ad-preview-container') !== null;

      if (isAdActive) {
        if (!isHandlingCurrentAd) {
          isHandlingCurrentAd = true;
          incrementBlockedCount();
        }

        // Mute and fast-forward ad
        video.muted = true;
        video.playbackRate = 16.0;

        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration;
        }

        // Auto-click any variation of the Skip button
        const skipButtons = document.querySelectorAll(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot, [id^="skip-button"], .ytp-ad-overlay-close-button'
        );
        skipButtons.forEach((btn) => {
          if (typeof btn.click === 'function') {
            btn.click();
          }
        });
      } else {
        isHandlingCurrentAd = false;
      }
    }

    // Auto-dismiss "Upgrade to Premium" / trial dialogs
    const dismissButtons = document.querySelectorAll(
      'ytmusic-mealbar-promo-renderer #dismiss-button, ytmusic-upsell-dialog-renderer #dismiss-button, ytmusic-you-there-renderer #dismiss-button'
    );
    dismissButtons.forEach((btn) => {
      if (typeof btn.click === 'function') {
        btn.click();
      }
    });
  }

  // 5. Initialize
  function init() {
    injectStyles();
    ensureBadgeInDOM();
    handleAds();

    const observer = new MutationObserver(() => {
      handleAds();
      injectStyles();
      ensureBadgeInDOM();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'src'],
    });

    setInterval(() => {
      handleAds();
      ensureBadgeInDOM();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
