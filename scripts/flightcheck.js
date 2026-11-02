/*
 * flightcheck.js — runs BEFORE RequireJS (plain ES5, no modules).
 *
 * Responsibility:
 *   1. Sanity-check what Modernizr and Detectizr reported (they can be wrong:
 *      Modernizr.webgl only checks the constructor exists, Detectizr reports
 *      iPadOS as a Mac desktop, etc.).
 *   2. Normalise the results into window.FLIGHT, the single source of truth the
 *      AMD app reads at boot.
 *   3. Show an "unsupported browser" message and stop the boot when the story
 *      cannot run.
 *
 * Debug query params:
 *   ?nowebgl=1        force the WebGL fallback path
 *   ?reducedmotion=1  force prefers-reduced-motion behaviour
 */
(function (window, document, navigator) {
  'use strict';

  var REQUIRED_FEATURES = ['canvas', 'csstransforms3d', 'cssanimations'];
  var FEATURE_NAMES = [
    'canvas', 'webgl', 'webaudio', 'touchevents', 'csstransforms3d',
    'cssanimations', 'video', 'audio', 'localstorage', 'history'
  ];
  var DEVICE_TYPES = ['mobile', 'tablet', 'desktop'];
  var BOOT_TIMEOUT_MS = 20000;

  var params = parseQuery(window.location.search);

  var FLIGHT = window.FLIGHT = {
    ok: false,
    booted: false,
    reasons: [],
    warnings: [],
    features: {},
    audioFormats: {},
    device: { type: 'desktop', model: '', orientation: 'landscape' },
    reducedMotion: false,
    webgl: false
  };

  function parseQuery(search) {
    var out = {};
    var pairs = search.replace(/^\?/, '').split('&');
    for (var i = 0; i < pairs.length; i++) {
      if (!pairs[i]) { continue; }
      var kv = pairs[i].split('=');
      out[decodeURIComponent(kv[0])] = kv.length > 1 ? decodeURIComponent(kv[1]) : '1';
    }
    return out;
  }

  // Modernizr stores audio/video results as Boolean objects (with codec props),
  // and !!new Boolean(false) === true, so unwrap with valueOf().
  function truthy(value) {
    return !!(value && typeof value.valueOf === 'function' ? value.valueOf() : value);
  }

  function missingJsApis() {
    var missing = [];
    if (!document.querySelector) { missing.push('querySelector'); }
    if (!window.addEventListener) { missing.push('addEventListener'); }
    if (!window.JSON) { missing.push('JSON'); }
    if (!window.requestAnimationFrame) { missing.push('requestAnimationFrame'); }
    if (!Function.prototype.bind) { missing.push('Function.prototype.bind'); }
    return missing;
  }

  function collectFeatures(M) {
    var out = {};
    for (var i = 0; i < FEATURE_NAMES.length; i++) {
      out[FEATURE_NAMES[i]] = truthy(M[FEATURE_NAMES[i]]);
    }
    return out;
  }

  function collectAudioFormats(M) {
    var a = M.audio || {};
    return { mp3: a.mp3 || '', ogg: a.ogg || '', m4a: a.m4a || '', wav: a.wav || '' };
  }

  // Modernizr only checks that WebGLRenderingContext exists; blocklisted GPUs or
  // disabled hardware acceleration still fail at getContext(). Try it for real.
  function verifyWebGL(claimed) {
    if (!claimed || params.nowebgl === '1') { return false; }
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) { return false; }
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) { lose.loseContext(); }
      return true;
    } catch (e) {
      return false;
    }
  }

  function currentOrientation() {
    if (window.matchMedia) {
      return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
    }
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  function guessTypeFromViewport(touch) {
    var w = Math.min(window.screen.width, window.screen.height);
    if (touch && w < 600) { return 'mobile'; }
    if (touch && w < 1100) { return 'tablet'; }
    return 'desktop';
  }

  // Shared with services/device.js through FLIGHT.normaliseDeviceType.
  function normaliseDeviceType(raw) {
    var touch = !!FLIGHT.features.touchevents || navigator.maxTouchPoints > 0;
    var type = raw === 'tv' ? 'desktop' : raw;
    if (DEVICE_TYPES.indexOf(type) === -1) {
      return guessTypeFromViewport(touch);
    }
    // iPadOS 13+ sends a macOS desktop user agent.
    if (type === 'desktop' && navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) {
      return 'tablet';
    }
    return type;
  }

  function readDevice(D) {
    var device = (D && D.device) || {};
    var type = normaliseDeviceType(device.type);
    if (type !== device.type) {
      FLIGHT.warnings.push('Detectizr device type "' + device.type + '" corrected to "' + type + '"');
    }
    return { type: type, model: device.model || '', orientation: currentOrientation() };
  }

  function prefersReducedMotion() {
    if (params.reducedmotion === '1') { return true; }
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function setHtmlClass(name, on) {
    var el = document.documentElement;
    var re = new RegExp('(^|\\s)' + name + '(?=\\s|$)', 'g');
    el.className = el.className.replace(re, '');
    if (on) { el.className += ' ' + name; }
  }

  function showMessage(title, body) {
    var box = document.getElementById('flight-warning') || document.createElement('div');
    box.id = 'flight-warning';
    box.className = 'flight-warning';
    box.setAttribute('role', 'alert');
    box.innerHTML = '';
    var h = document.createElement('h1');
    var p = document.createElement('p');
    h.textContent = title;
    p.textContent = body;
    box.appendChild(h);
    box.appendChild(p);
    if (!box.parentNode) { document.body.appendChild(box); }
    setHtmlClass('is-unsupported', true);
  }

  function describeReasons() {
    return 'Missing: ' + FLIGHT.reasons.join(', ') +
      '. Please try a recent version of Chrome, Safari, Firefox or Edge.';
  }

  function run() {
    if (window.location.protocol === 'file:' && !window.STORY_DATA) {
      showMessage('Please open this over http',
        'Browsers block loading the story data from file://. Run "python3 -m http.server" in the project folder and open http://localhost:8000.');
      return;
    }

    var M = window.Modernizr;
    var D = window.Detectizr;
    if (!M || typeof M.addTest !== 'function') { FLIGHT.reasons.push('Modernizr'); }
    if (!D || !D.device) { FLIGHT.reasons.push('Detectizr'); }
    FLIGHT.reasons = FLIGHT.reasons.concat(missingJsApis());

    if (M) {
      FLIGHT.features = collectFeatures(M);
      FLIGHT.audioFormats = collectAudioFormats(M);
      for (var i = 0; i < REQUIRED_FEATURES.length; i++) {
        if (!FLIGHT.features[REQUIRED_FEATURES[i]]) { FLIGHT.reasons.push(REQUIRED_FEATURES[i]); }
      }
    }

    FLIGHT.device = readDevice(D);
    FLIGHT.reducedMotion = prefersReducedMotion();
    FLIGHT.webgl = !FLIGHT.reducedMotion && verifyWebGL(FLIGHT.features.webgl);
    if (FLIGHT.features.webgl && !FLIGHT.webgl && !FLIGHT.reducedMotion) {
      FLIGHT.warnings.push('Modernizr reported WebGL but no context could be created');
    }

    FLIGHT.ok = FLIGHT.reasons.length === 0;
    setHtmlClass('flight-ok', FLIGHT.ok);
    setHtmlClass('reduced-motion', FLIGHT.reducedMotion);
    setHtmlClass('webgl-verified', FLIGHT.webgl);
    setHtmlClass('device-' + FLIGHT.device.type, true);

    if (!FLIGHT.ok) {
      showMessage('Your browser can\'t show this story', describeReasons());
    }
  }

  FLIGHT.normaliseDeviceType = normaliseDeviceType;
  FLIGHT.currentOrientation = currentOrientation;
  FLIGHT.fail = showMessage;

  run();

  // Watchdog: if RequireJS or a CDN script never arrives, tell the reader.
  window.setTimeout(function () {
    if (FLIGHT.ok && !FLIGHT.booted) {
      showMessage('The story is taking too long to load',
        'Some scripts could not be downloaded. Check your connection and reload the page.');
    }
  }, BOOT_TIMEOUT_MS);
}(window, document, navigator));
