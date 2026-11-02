/*
 * services/audio.js — per-scene ambient loops with crossfades + global mute.
 *
 * Responsibility: one HTMLAudioElement per unique src. On "scene:enter" the
 * current loop fades out and the scene's loop fades in. With Web Audio each
 * element is routed through its own GainNode into a master gain (iOS ignores
 * element.volume, so fades must happen in Web Audio there); without it,
 * element.volume is faded directly.
 *
 * Nothing plays until unlock() runs inside the Begin click (autoplay policy).
 * Mute state is remembered in localStorage when available.
 */
define(['underscore'], function (_) {
  'use strict';

  var STORAGE_KEY = 'malin-kundang-comic:muted';
  var MUTE_FADE_MS = 250;

  function playSafe(el) {
    var p = el.play();
    if (p && p.catch) { p.catch(function () { /* interrupted or blocked; next scene retries */ }); }
  }

  function readMuted(canStore) {
    try { return canStore && window.localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function writeMuted(canStore, muted) {
    try { if (canStore) { window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } } catch (e) { /* private mode */ }
  }

  var audio = {
    tracks: {},
    current: null,
    pending: null,
    unlocked: false,
    muted: false,
    enabled: false,

    init: function (vent, flight) {
      this.vent = vent;
      this.canStore = flight.features.localstorage;
      this.enabled = flight.features.audio;
      this.Ctx = window.AudioContext || window.webkitAudioContext;
      this.useWebAudio = this.enabled && flight.features.webaudio && !!this.Ctx;
      this.muted = readMuted(this.canStore);
      vent.on('scene:enter', this.onSceneEnter, this);
      vent.on('audio:toggle', this.toggleMute, this);
      document.addEventListener('visibilitychange', _.bind(this.onVisibility, this));
    },

    prepare: function (scenes) {
      if (!this.enabled) { return; }
      scenes.each(function (scene) {
        var cfg = scene.get('audio');
        if (cfg) { this.track(cfg.src); }
      }, this);
    },

    track: function (src) {
      if (!this.tracks[src]) {
        var el = new Audio();
        el.preload = 'auto';
        el.src = src;
        this.tracks[src] = { src: src, el: el, gain: null, timer: null, raf: null };
      }
      return this.tracks[src];
    },

    // Must be called synchronously from a user gesture.
    unlock: function () {
      if (!this.enabled || this.unlocked) { return; }
      if (this.useWebAudio) { this.setupGraph(); }
      _.each(this.tracks, this.prime, this);
      this.unlocked = true;
      this.crossfadeTo(this.pending);
    },

    setupGraph: function () {
      try {
        this.ctx = new this.Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
        _.each(this.tracks, function (t) {
          t.gain = this.ctx.createGain();
          t.gain.gain.value = 0;
          this.ctx.createMediaElementSource(t.el).connect(t.gain);
          t.gain.connect(this.master);
        }, this);
        if (this.ctx.resume) { this.ctx.resume(); }
      } catch (e) {
        window.console.warn('[audio] Web Audio setup bypassed (e.g. file:// CORS restriction), using HTML5 audio volume:', e && e.message);
        this.useWebAudio = false;
        if (this.ctx && this.ctx.close) { this.ctx.close(); }
        this.ctx = null;
        this.master = null;
      }
    },

    // play()+pause() inside the gesture so iOS allows later programmatic play().
    prime: function (t) {
      if (!this.useWebAudio) { t.el.volume = 0; t.el.muted = this.muted; }
      playSafe(t.el);
      t.el.pause();
    },

    onSceneEnter: function (scene) {
      this.pending = scene.get('audio');
      if (this.unlocked) { this.crossfadeTo(this.pending); }
    },

    crossfadeTo: function (cfg) {
      var next = cfg ? this.tracks[cfg.src] : null;
      var prev = this.current;
      if (prev && prev !== next) { this.fadeOut(prev, cfg ? cfg.fade : prev.cfg.fade); }
      this.current = next;
      if (!next) { return; }
      next.cfg = cfg;
      next.el.loop = cfg.loop;
      if (next.el.paused) { playSafe(next.el); }
      this.fade(next, cfg.volume, cfg.fade);
    },

    fadeOut: function (t, ms) {
      this.fade(t, 0, ms, function () { t.el.pause(); });
    },

    fade: function (t, to, ms, done) {
      window.clearTimeout(t.timer);
      window.cancelAnimationFrame(t.raf);
      if (t.gain) { this.rampGain(t.gain.gain, to, ms); } else { this.rampVolume(t, to, ms); }
      if (done) { t.timer = window.setTimeout(done, ms); }
    },

    rampGain: function (param, to, ms) {
      var now = this.ctx.currentTime;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(to, now + ms / 1000);
    },

    rampVolume: function (t, to, ms) {
      var from = t.el.volume;
      var start = null;
      var step = function (now) {
        if (start === null) { start = now; }
        var k = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
        t.el.volume = from + (to - from) * k;
        if (k < 1) { t.raf = window.requestAnimationFrame(step); }
      };
      t.raf = window.requestAnimationFrame(step);
    },

    toggleMute: function () {
      this.setMuted(!this.muted);
    },

    setMuted: function (muted) {
      this.muted = muted;
      writeMuted(this.canStore, muted);
      if (this.master) {
        this.rampGain(this.master.gain, muted ? 0 : 1, MUTE_FADE_MS);
      } else {
        _.each(this.tracks, function (t) { t.el.muted = muted; });
      }
      this.vent.trigger('audio:mute', muted);
    },

    isMuted: function () {
      return this.muted;
    },

    onVisibility: function () {
      if (!this.unlocked || !this.current) { return; }
      if (document.hidden) {
        this.current.el.pause();
      } else {
        if (this.ctx && this.ctx.resume) { this.ctx.resume(); }
        playSafe(this.current.el);
      }
    }
  };

  return audio;
});
