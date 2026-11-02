/*
 * services/scroll.js — page scroll helpers.
 *
 * Responsibility: smooth wheel scrolling (Lenis, driven by the GSAP ticker so
 * ScrollTrigger reads the same position every frame), lock/unlock scrolling around
 * the preloader, jump or smooth-scroll to positions (instant when prefers-reduced-
 * motion), and broadcast reading progress ("scroll:progress", 0..1).
 *
 * Lenis is loaded on demand: with reduced motion, or if it fails to load (very old
 * browser), native scrolling is used and everything else works the same.
 */
define(['underscore', 'services/anim'], function (_, anim) {
  'use strict';

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  var scroll = {
    init: function (vent, flight) {
      this.vent = vent;
      this.reduced = flight.reducedMotion;
      this.locked = false;
      this.lenis = null;
      if ('scrollRestoration' in window.history) { window.history.scrollRestoration = 'manual'; }
      window.scrollTo(0, 0);
      this.bindProgress();
      if (!this.reduced) { this.loadSmooth(); }
    },

    // Smooth wheel scroll. Touch keeps native scrolling (Lenis default).
    loadSmooth: function () {
      var self = this;
      window.require(['lenis'], function (Lenis) {
        if (!Lenis) { return; }
        var lenis = self.lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
        lenis.on('scroll', anim.ScrollTrigger.update);
        anim.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        anim.gsap.ticker.lagSmoothing(0);
        if (self.locked) { lenis.stop(); }
      }, function (err) {
        window.console.warn('[scroll] smooth scrolling unavailable, using native scroll:', err && err.message);
      });
    },

    lock: function () {
      this.locked = true;
      document.documentElement.classList.add('is-locked');
      if (this.lenis) { this.lenis.stop(); }
    },

    unlock: function () {
      this.locked = false;
      document.documentElement.classList.remove('is-locked');
      if (this.lenis) { this.lenis.start(); }
      anim.ScrollTrigger.refresh();
    },

    toY: function (y, opts) {
      var smooth = !this.reduced && !(opts && opts.instant);
      if (this.lenis) {
        this.lenis.scrollTo(y, { immediate: !smooth, force: true });
        return;
      }
      if (smooth && 'scrollBehavior' in document.documentElement.style) {
        window.scrollTo({ top: y, behavior: 'smooth' });
      } else {
        window.scrollTo(0, y);
      }
    },

    toElement: function (el, opts) {
      this.toY(el.getBoundingClientRect().top + window.pageYOffset, opts);
    },

    progress: function () {
      var max = maxScroll();
      return max > 0 ? Math.min(1, window.pageYOffset / max) : 0;
    },

    bindProgress: function () {
      var queued = false;
      var self = this;
      window.addEventListener('scroll', function () {
        if (queued) { return; }
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          self.vent.trigger('scroll:progress', self.progress());
        });
      }, { passive: true });
    }
  };

  return scroll;
});
