/*
 * services/scroll.js — page scroll helpers.
 *
 * Responsibility: lock/unlock scrolling around the preloader, jump or smooth-
 * scroll to positions (instant when prefers-reduced-motion), and broadcast reading
 * progress ("scroll:progress", 0..1).
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
      if ('scrollRestoration' in window.history) { window.history.scrollRestoration = 'manual'; }
      window.scrollTo(0, 0);
      this.bindProgress();
    },

    lock: function () {
      document.documentElement.classList.add('is-locked');
    },

    unlock: function () {
      document.documentElement.classList.remove('is-locked');
      anim.ScrollTrigger.refresh();
    },

    toY: function (y, opts) {
      var smooth = !this.reduced && !(opts && opts.instant);
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
