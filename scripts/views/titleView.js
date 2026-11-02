/*
 * views/titleView.js — story title card with thunder.
 *
 * Responsibility: after "story:begin", show the story title centred on the
 * first screen: a lightning flash, and the title settles from large to its
 * size. Then a thunder strike (screen flash) repeats at random intervals while
 * the title is on screen. The title stays locked in position until the steamship
 * enters the stage, then scrolls up 1:1 with the page (no fade) until it leaves
 * the top; strikes pause while it is off screen.
 *
 * Mouse parallax (fine pointer, no reduced motion): the title drifts with the pointer
 * like the front-most layer.
 *
 * Flash safety: each strike is at most two flashes within ~0.4 s, strikes are
 * 4–9 s apart (well under 3 flashes per second). Reduced motion: no flashes,
 * plain fade-in.
 */
define(['jquery', 'underscore', 'backbone', 'services/anim'], function ($, _, Backbone, anim) {
  'use strict';

  var gsap = anim.gsap;
  var STRIKE_MIN = 4;    // s between strikes
  var STRIKE_MAX = 9;
  var MOUSE_X = 30;      // px at full pointer offset (front-most layer feel)
  var MOUSE_Y = 16;

  var template = _.template([
    '<div class="thunder" aria-hidden="true"></div>',
    '<div class="title-card">',
    '  <h1 class="story-title">',
    '  <% var words = (title || "").split(" "); %>',
    '  <% if (words.length >= 2) { %>',
    '    <span class="story-title__line story-title__line--1"><%- words[0] %></span>',
    '    <span class="story-title__line story-title__line--2"><%- words.slice(1).join(" ") %></span>',
    '  <% } else { %>',
    '    <span class="story-title__line"><%- title %></span>',
    '  <% } %>',
    '  </h1>',
    '</div>'
  ].join('\n'));

  var TitleView = Backbone.View.extend({
    initialize: function (options) {
      this.vent = options.vent;
      this.story = options.story;
      this.reduced = window.FLIGHT.reducedMotion;
      this.visible = false;
      this.nextStrike = null;
      this.listenTo(this.vent, 'story:begin', this.show);
    },

    render: function () {
      this.$el.addClass('title-layer').html(template({ title: this.story.get('title') }));
      this.flashEl = this.$('.thunder')[0];
      this.cardEl = this.$('.title-card')[0];
      this.titleEl = this.$('.story-title')[0];
      gsap.set(this.titleEl, { autoAlpha: 0 });
      return this;
    },

    show: function () {
      this.visible = true;
      this.bindScrollFade();
      this.bindParallax();
      if (this.reduced) {
        gsap.to(this.titleEl, { autoAlpha: 1, duration: 0.6 });
        return;
      }
      this.intro();
    },

    // Lightning flash; the title drops in from large to its place.
    intro: function () {
      var tl = gsap.timeline({ delay: 0.25, onComplete: _.bind(this.scheduleStrike, this) });
      tl.add(this.flash(), 0)
        .fromTo(this.titleEl, { autoAlpha: 0, scale: 2.4 },
          { autoAlpha: 1, scale: 1, duration: 1.4, ease: 'expo.out' }, 0.02)
        .add(this.flash(0.7), 0.32);
    },

    // One lightning flash: sharp white-blue spike that decays.
    flash: function (strength) {
      var peak = 0.6 * (strength || 1);
      return gsap.timeline()
        .set(this.flashEl, { opacity: peak })
        .to(this.flashEl, { opacity: peak * 0.15, duration: 0.07, ease: 'none' })
        .to(this.flashEl, { opacity: 0, duration: 0.45, ease: 'power2.out' });
    },

    strike: function () {
      gsap.timeline()
        .add(this.flash(), 0)
        .add(this.flash(0.7), 0.24);
    },

    scheduleStrike: function () {
      if (this.nextStrike) { this.nextStrike.kill(); }
      this.nextStrike = gsap.delayedCall(gsap.utils.random(STRIKE_MIN, STRIKE_MAX), _.bind(function () {
        if (this.visible) { this.strike(); }
        this.scheduleStrike();
      }, this));
    },

    // Scroll Y where the steamship enters the stage from below.
    shipEntryScroll: function () {
      var scene = document.querySelector('#scene-segment-one') || document.querySelector('.scene');
      if (!scene) { return window.innerHeight; }
      var stage = scene.querySelector('.scene__stage');
      var art = scene.querySelector('.scene__art');
      var stageH = stage ? stage.clientHeight : window.innerHeight;
      var artH = art ? art.offsetHeight : stageH;

      // Camera travel and start offset for ship (depth 0.6)
      var maxTravel = Math.max(0, artH - stageH);
      var cameraEnd = Math.min(maxTravel, artH);
      // Wave scroll distance of the wave part (height 4 screens = 3 screens scroll + cameraEnd * pace 3)
      var waveScroll = Math.max(0, 3 * stageH + cameraEnd * 3);
      if (waveScroll <= 0) { return stageH; }

      var startY = 0.2 * stageH;
      // Ship's masts appear at art fraction ~0.46
      var shipArtY = 0.46 * artH;
      var denom = startY + cameraEnd;
      var p = denom > 0 ? (shipArtY + startY - stageH) / denom : 0.22;
      // Clamp between 0.18 and 0.30
      p = Math.max(0.18, Math.min(0.30, p));
      return Math.round(p * waveScroll);
    },

    // Title stays locked in place until the ship appears, then travels up with
    // the page like printed text: one screen of scroll = one screen up.
    bindScrollFade: function () {
      var self = this;
      this.fade = gsap.fromTo(this.cardEl, { y: 0 }, {
        y: function () { return -window.innerHeight; },
        ease: 'none',
        scrollTrigger: {
          start: function () { return self.shipEntryScroll(); },
          end: function () { return self.shipEntryScroll() + window.innerHeight; },
          scrub: true,
          invalidateOnRefresh: true,
          onLeave: _.bind(function () { this.visible = false; }, this),
          onEnterBack: _.bind(function () { this.visible = true; }, this)
        }
      });
    },

    bindParallax: function () {
      if (this.reduced || !window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) { return; }
      var el = this.titleEl;
      this.onPointerMove = _.throttle(function (e) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        if (!w || !h) { return; }
        var nx = Math.max(-1, Math.min(1, (e.clientX - w / 2) / (w / 2)));
        var ny = Math.max(-1, Math.min(1, (e.clientY - h / 2) / (h / 2)));
        // x/y only: the intro animates scale/autoAlpha, the scroll moves the card.
        gsap.to(el, { x: nx * MOUSE_X, y: ny * MOUSE_Y, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
      }, 16);
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    },

    remove: function () {
      if (this.onPointerMove) { window.removeEventListener('pointermove', this.onPointerMove); }
      if (this.nextStrike) { this.nextStrike.kill(); }
      if (this.fade) { this.fade.scrollTrigger.kill(); this.fade.kill(); }
      return Backbone.View.prototype.remove.call(this);
    }
  });

  return TitleView;
});
