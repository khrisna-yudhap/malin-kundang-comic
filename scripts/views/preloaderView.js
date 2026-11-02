/*
 * views/preloaderView.js — intro: typewriter loader + "Click to start".
 *
 * Responsibility: while the first scenes load, type "Loading" with looping
 * dots on a dark cover page. When loading is done (and "Loading" has been typed
 * at least once), erase it and type "Click to start"; the whole screen becomes
 * the start button. The click triggers "preloader:begin" synchronously (App
 * unlocks audio inside the gesture), then the intro fades out and
 * "preloader:done" fires.
 */
define(['jquery', 'underscore', 'backbone', 'services/anim'], function ($, _, Backbone, anim) {
  'use strict';

  var gsap = anim.gsap;
  var LOADING = 'Loading';
  var START = 'Click to start';
  var TYPE_MS = 80;
  var ERASE_MS = 35;
  var DOT_MS = 280;
  var MAX_DOTS = 4;
  var FADE_S = 0.7;

  var template = _.template([
    '<p class="intro__type" aria-hidden="true"><span class="intro__text"></span><span class="intro__caret"></span></p>',
    '<p class="sr-only" aria-live="polite"><%- status %></p>',
    '<button type="button" class="intro__start js-start" aria-label="Click to start" disabled></button>'
  ].join('\n'));

  var PreloaderView = Backbone.View.extend({
    events: {
      'click .js-start': 'onStart'
    },

    initialize: function (options) {
      this.vent = options.vent;
      this.story = options.story;
      this.reduced = window.FLIGHT.reducedMotion;
      this.loaded = false;
      this.typedOnce = false;
      this.started = false;
      this.timer = null;
    },

    render: function () {
      this.$el.addClass('intro').html(template({ status: 'Loading ' + this.story.get('title') + '…' }));
      this.$text = this.$('.intro__text');
      this.$status = this.$('.sr-only');
      this.$start = this.$('.js-start');
      this.typeLoading();
      return this;
    },

    track: function (promise) {
      promise.always(_.bind(function () {
        this.loaded = true;
        this.maybeReady();
      }, this));
      return this;
    },

    // ---- Typewriter -------------------------------------------------------

    later: function (fn, ms) {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(_.bind(fn, this), ms);
    },

    // Types `text` after the current content, then calls `done`.
    type: function (text, done) {
      if (this.reduced) { this.$text.text(this.$text.text() + text); done.call(this); return; }
      var i = 0;
      var step = function () {
        this.$text.text(this.$text.text() + text.charAt(i));
        i += 1;
        if (i < text.length) { this.later(step, TYPE_MS); } else { done.call(this); }
      };
      this.later(step, TYPE_MS);
    },

    erase: function (done) {
      if (this.reduced) { this.$text.text(''); done.call(this); return; }
      var step = function () {
        var t = this.$text.text();
        this.$text.text(t.slice(0, -1));
        if (t.length > 1) { this.later(step, ERASE_MS); } else { done.call(this); }
      };
      this.later(step, ERASE_MS);
    },

    typeLoading: function () {
      this.type(LOADING, function () {
        this.typedOnce = true;
        this.dots(0);
      });
    },

    // "Loading." -> "Loading...." -> "Loading" ... until ready.
    dots: function (n) {
      if (this.maybeReady()) { return; }
      if (this.reduced) { this.$text.text(LOADING + '…'); return; }
      this.$text.text(LOADING + new Array(n + 1).join('.'));
      this.later(function () { this.dots(n >= MAX_DOTS ? 0 : n + 1); }, DOT_MS);
    },

    maybeReady: function () {
      if (!this.loaded || !this.typedOnce || this.isReady) { return this.isReady; }
      this.isReady = true;
      this.erase(function () {
        this.type(START, function () {
          this.$el.addClass('is-ready');
          this.$status.text('Ready. Press the button to start.');
          this.$start.prop('disabled', false).trigger('focus');
        });
      });
      return true;
    },

    // ---- Start ------------------------------------------------------------

    onStart: function (e) {
      e.preventDefault();
      if (this.started) { return; }
      this.started = true;
      window.clearTimeout(this.timer);
      this.$start.prop('disabled', true).attr('hidden', true);
      this.$el.removeClass('is-ready').addClass('is-leaving');
      this.vent.trigger('preloader:begin');   // synchronous: audio unlock needs the gesture
      gsap.to(this.el, { autoAlpha: 0, duration: this.reduced ? 0.3 : FADE_S, ease: 'power1.inOut', onComplete: _.bind(this.finish, this) });
    },

    finish: function () {
      this.undelegateEvents();
      this.$el.empty().attr('hidden', true).removeAttr('style');
      this.vent.trigger('preloader:done');
    }
  });

  return PreloaderView;
});
