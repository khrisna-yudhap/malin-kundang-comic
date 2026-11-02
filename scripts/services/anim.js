/*
 * services/anim.js — GSAP + ScrollTrigger access point.
 *
 * Responsibility: unwrap the UMD/AMD exports of gsap and ScrollTrigger, register
 * the plugin exactly once, and apply global ScrollTrigger config. Modules that
 * animate require this instead of 'gsap' / 'ScrollTrigger' directly.
 */
define(['gsap', 'ScrollTrigger'], function (gsapModule, stModule) {
  'use strict';

  var gsap = gsapModule.gsap || gsapModule['default'] || gsapModule;
  var ScrollTrigger = stModule.ScrollTrigger || stModule['default'] || stModule;

  gsap.registerPlugin(ScrollTrigger);
  // Mobile URL-bar show/hide resizes the viewport; don't re-layout for it.
  ScrollTrigger.config({ ignoreMobileResize: true });

  return { gsap: gsap, ScrollTrigger: ScrollTrigger };
});
