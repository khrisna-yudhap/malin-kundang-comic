/*
 * main.js — RequireJS entry point (data-main).
 *
 * Responsibility: configure module paths + shims for every library, then boot
 * the App. Does nothing if flightcheck.js decided the browser can't run the story.
 */
(function (window) {
  'use strict';

  var FLIGHT = window.FLIGHT;
  if (!FLIGHT || !FLIGHT.ok) { return; }

  // Use local vendor libraries so the project runs offline and directly via file:// (double-click).
  var USE_LOCAL_VENDOR = true;

  // Local dev (python http.server sends no cache headers): browsers reuse stale
  // copies of our own modules after edits. Bust them on every load; CDN libs and
  // production hosts are untouched.
  var DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  var DEV_STAMP = 'dev=' + Date.now();
  window.DEV_STAMP = DEV ? DEV_STAMP : '';

  var CDN = {
    jquery: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min',
    underscore: 'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.6/underscore-min',
    backbone: 'https://cdnjs.cloudflare.com/ajax/libs/backbone.js/1.5.0/backbone-min',
    gsap: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min',
    ScrollTrigger: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min',
    three: 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min'
  };

  var LOCAL = {
    jquery: 'vendor/jquery.min',
    underscore: 'vendor/underscore-min',
    backbone: 'vendor/backbone-min',
    gsap: 'vendor/gsap.min',
    ScrollTrigger: 'vendor/ScrollTrigger.min',
    three: 'vendor/three.min'
  };

  var paths = USE_LOCAL_VENDOR ? LOCAL : CDN;
  paths.modernizr = 'vendor/modernizr-custom';
  paths.detectizr = 'vendor/detectizr.min';

  requirejs.config({
    baseUrl: 'scripts',
    waitSeconds: 30,
    urlArgs: function (id, url) {
      if (!DEV || /^(https?:)?\/\//.test(url)) { return ''; }
      return (url.indexOf('?') === -1 ? '?' : '&') + DEV_STAMP;
    },
    paths: paths,
    shim: {
      // Real shims: these two are plain globals with no AMD support.
      modernizr: { exports: 'Modernizr' },
      detectizr: { deps: ['modernizr'], exports: 'Detectizr' },

      // The pinned builds below are UMD and call define() themselves, so RequireJS
      // uses their AMD export and ignores `exports`. The entries keep dependency
      // order explicit and keep things working if you swap in a non-AMD build.
      jquery: { exports: 'jQuery' },
      underscore: { exports: '_' },
      backbone: { deps: ['underscore', 'jquery'], exports: 'Backbone' },
      gsap: { exports: 'gsap' },
      ScrollTrigger: { deps: ['gsap'], exports: 'ScrollTrigger' },
      three: { exports: 'THREE' }
    }
  });

  // Modernizr + Detectizr already ran via plain <script> tags (flightcheck needs
  // them before RequireJS exists). Register the globals so they aren't fetched twice.
  if (window.Modernizr) {
    define('modernizr', [], function () { return window.Modernizr; });
  }
  if (window.Detectizr) {
    define('detectizr', ['modernizr'], function () { return window.Detectizr; });
  }

  requirejs.onError = function (err) {
    FLIGHT.fail('The story failed to load',
      'Could not load: ' + (err.requireModules || [err.requireType]).join(', ') + '. Check your connection and reload.');
    throw err;
  };

  require(['app'], function (App) {
    FLIGHT.booted = true;
    App.init();
  });
}(window));
