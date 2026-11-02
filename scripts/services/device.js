/*
 * services/device.js — device class + orientation, wrapping Detectizr.
 *
 * Responsibility: expose isMobile / isTablet / isDesktop / orientation, keep
 * them current on resize/orientationchange, and trigger "device:change"
 * (state, prevState) on the event bus when either changes. Views use
 * effectDensity() and type to pick image sizes and particle counts.
 *
 * Device type comes from Detectizr.device.type, passed through
 * FLIGHT.normaliseDeviceType (fixes "tv", unknown values and iPadOS-as-Mac).
 * Detectizr only tracks orientation on touch devices, so orientation is read
 * from matchMedia and mirrored back into Detectizr.device.orientation.
 */
define(['underscore', 'detectizr'], function (_, Detectizr) {
  'use strict';

  var DENSITY = { mobile: 0.3, tablet: 0.6, desktop: 1 };

  var device = {
    type: 'desktop',
    orientation: 'landscape',
    isMobile: false,
    isTablet: false,
    isDesktop: true,

    init: function (vent, flight) {
      this.vent = vent;
      this.flight = flight;
      this.apply(this.read(), true);
      var onChange = _.debounce(_.bind(this.refresh, this), 150);
      window.addEventListener('resize', onChange);
      window.addEventListener('orientationchange', onChange);
    },

    read: function () {
      var raw = Detectizr && Detectizr.device ? Detectizr.device.type : '';
      return {
        type: this.flight.normaliseDeviceType(raw),
        orientation: this.flight.currentOrientation()
      };
    },

    refresh: function () {
      this.apply(this.read(), false);
    },

    apply: function (state, silent) {
      var prev = this.snapshot();
      this.type = state.type;
      this.orientation = state.orientation;
      this.isMobile = state.type === 'mobile';
      this.isTablet = state.type === 'tablet';
      this.isDesktop = state.type === 'desktop';
      if (Detectizr && Detectizr.device) { Detectizr.device.orientation = state.orientation; }
      if (!silent && (prev.type !== state.type || prev.orientation !== state.orientation)) {
        this.vent.trigger('device:change', this.snapshot(), prev);
      }
    },

    snapshot: function () {
      return { type: this.type, orientation: this.orientation };
    },

    // 0..1 multiplier for particle counts and other effect budgets.
    effectDensity: function () {
      return DENSITY[this.type] || 1;
    },

    pixelRatio: function (cap) {
      return Math.min(window.devicePixelRatio || 1, cap || Infinity);
    }
  };

  return device;
});
