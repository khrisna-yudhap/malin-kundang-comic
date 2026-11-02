/*
 * models/scene.js — one scene of the story.
 *
 * Responsibility: validate/normalise a scene entry from story.json and answer
 * small questions about it (which image to load for a device, has an effect).
 *
 * Fields:
 *   id, chapter, height (in screens),
 *   art          { width, height }  canvas size every layer was exported at (px)
 *   camera       { end 0..1, lift, liftFrom, pace, startCenter?, holdStart?, holdEnd?, spread? }
 *                spread: scales how far layers start from their place (depth push). < 1 = the
 *                waves start closer under the boat and arrive sooner (default 1).
 *                holdStart / holdEnd: screens of scroll where the art stays still before the
 *                camera moves (e.g. on the boat) and after it arrives (on the waves). Added on
 *                top of the move's own scroll length.
 *                startCenter: art fraction centred on screen when the scene starts (e.g. the
 *                boat), instead of the art top. Only matters where the art is taller than
 *                the screen (desktop); scroll length and timings are unchanged.
 *                pace: extra scroll (px) added to the section per px the camera travels
 *                (from its start frame to its end frame).
 *                Wide screens pan far (desktop ≈ 2 screens), phones barely pan, so without
 *                it desktop motion is several times faster per scroll. 0 = off.
 *                end: art fraction shown at the top of the screen when the scene
 *                ends (clamped so the art bottom never rises above the screen bottom)
 *                lift: extra end rise (stage heights) for layers deeper than liftFrom,
 *                capped by the art left below the screen
 *   background   CSS colour behind the layers
 *   captionStyle "panel" | "plain"
 *   layers   [{ src, srcMobile?, alt?, depth 0..1, scale >=1, pivot, drift %, bob px, tilt deg, shake? }]
 *            shake { x %, y %, rot deg, period s, phase 0..1 }: rough-sea rocking along
 *            a "smile" path (up-left -> down-centre -> up-right), tilting into the
 *            swing. x/y are % of the art box, so give the layer enough scale overscan.
 *            back-to-front
 *   captions [{ at 0..1, dur 0..1, phase?, pos, text, anchor?, exit?, fade? }]
 *            phase "start" | "move" | "end": at/dur are fractions of that part of the wave
 *            scroll (camera.holdStart, the camera move, camera.holdEnd), so a caption lands in
 *            the same part on every screen. Default "all": fractions of the whole wave scroll.
 *            Default: always visible, in front of the layers, no fading (comic text).
 *            fade true (opt-in): fade in at `at`; with exit "fade" also fade out at at + dur.
 *            Without fade, at/dur are ignored (except exit "scroll", which starts at `at`).
 *            enter "scroll": slides up from below the screen to its spot, 1:1 with the
 *            page, over one screen of scroll from `at` (default: appears in place).
 *            cueTransition 0..1 (true = 0.4): the white transition to the panels starts that far
 *            through this caption's scroll-out, so the white covers the text as it leaves,
 *            instead of starting at the end of the wave part.
 *            exit "scroll": from at + dur slides up off the top, 1:1 with the page, over
 *            one screen of scroll (default: disappears in place; fades with fade: true). Scroll captions sharing a group hold in place until
 *            the group's latest `at`, then move together (every line appears at
 *            the anchor, no gap between them).
 *            anchor { y 0..1, depth 0..1 }: pin the caption to the art instead of
 *            the screen. y = art fraction where the text's bottom edge sits; the
 *            caption moves like a layer of that depth (use the subject's depth,
 *            e.g. the ship's, so the text travels with it). pos is ignored.
 *            anchor { y, layer: i }: ride layer i (index into layers): same depth
 *            motion and same shake, so the text sits in that wave. Overrides depth/lock.
 *            anchor { y, lock: true }: screen-fixed instead, centred on the spot
 *            where art y lands when the scene ends (camera only, no lift/depth).
 *   audio    { src, volume 0..1, fade ms, loop } | null
 *   fx       "rain" | "none"
 *   index    position in the Scenes collection (set by the collection)
 */
define(['underscore', 'backbone'], function (_, Backbone) {
  'use strict';

  var FX = ['rain', 'none'];
  var CAPTION_STYLES = ['panel', 'plain'];
  var POSITIONS = ['top-left', 'top-center', 'top-right', 'center', 'bottom-left', 'bottom-center', 'bottom-right'];
  var PIVOT_RE = /^-?\d+(\.\d+)?%? -?\d+(\.\d+)?%?$/;

  function clamp(n, min, max, fallback) {
    n = Number(n);
    if (!isFinite(n)) { return fallback; }
    return Math.min(max, Math.max(min, n));
  }

  function parseLayer(layer) {
    return {
      src: String(layer.src || ''),
      srcMobile: layer.srcMobile ? String(layer.srcMobile) : null,
      alt: layer.alt ? String(layer.alt) : '',
      depth: clamp(layer.depth, 0, 1, 0.5),
      scale: clamp(layer.scale, 0.5, 2, 1), // < 1 shrinks the layer around its pivot (e.g. the boat)
      pivot: PIVOT_RE.test(layer.pivot) ? layer.pivot : '50% 50%',
      drift: clamp(layer.drift, 0, 20, 0),
      bob: clamp(layer.bob, 0, 60, 0),
      tilt: clamp(layer.tilt, 0, 15, 0),
      shake: layer.shake ? {
        x: clamp(layer.shake.x, 0, 5, 0),
        y: clamp(layer.shake.y, 0, 5, 0),
        rot: clamp(layer.shake.rot, 0, 10, 0),
        period: clamp(layer.shake.period, 0.5, 30, 3),
        phase: clamp(layer.shake.phase, 0, 1, 0)
      } : null
    };
  }

  function parseCaption(caption, layers) {
    var a = caption.anchor;
    var layer = a && _.isNumber(a.layer) && layers[a.layer] ? a.layer : null;
    return {
      type: caption.type || 'text',
      label: caption.label ? String(caption.label) : '',
      title: caption.title ? String(caption.title) : '',
      at: clamp(caption.at, 0, 1, 0),
      dur: clamp(caption.dur, 0.02, 10, 0.2), // may run past its phase: a window reaching the end stays
      pos: _.contains(POSITIONS, caption.pos) ? caption.pos : 'bottom-left',
      text: String(caption.text || ''),
      exit: caption.exit === 'scroll' ? 'scroll' : 'fade',
      enter: caption.enter === 'scroll' ? 'scroll' : 'none',
      // Screens of scroll the enter / exit slide takes (1 = moves with the page 1:1;
      // 2 = half as fast, lasts twice as long; 0.5 = twice as fast).
      enterDur: clamp(caption.enterDur, 0.1, 5, 1),
      exitDur: clamp(caption.exitDur, 0.1, 5, 1),
      // false, or 0..1 = how far through its scroll-out the white transition starts (true = 0.4).
      cueTransition: caption.cueTransition === true ? 0.4
        : (_.isNumber(caption.cueTransition) ? clamp(caption.cueTransition, 0, 1, 0.4) : false),
      fade: caption.fade === true,
      phase: _.contains(['start', 'move', 'end'], caption.phase) ? caption.phase : 'all',
      anchor: a ? {
        y: clamp(a.y, 0, 1, 0.5),
        depth: layer !== null ? layers[layer].depth : clamp(a.depth, 0, 1, 0.5),
        layer: layer,
        lock: layer === null && a.lock === true
      } : null
    };
  }

  function parseAudio(audio) {
    if (!audio || !audio.src) { return null; }
    return {
      src: String(audio.src),
      volume: clamp(audio.volume, 0, 1, 0.7),
      fade: clamp(audio.fade, 0, 10000, 1200),
      loop: audio.loop !== false
    };
  }

  function parseArt(art) {
    art = art || {};
    return { width: clamp(art.width, 1, 20000, 1600), height: clamp(art.height, 1, 20000, 1000) };
  }

  function parseDialog(d) {
    if (!d) { return null; }
    return {
      text: String(d.text || ''),
      top: String(d.top || '0%'),
      left: String(d.left || '0%'),
      width: String(d.width || '100%'),
      height: String(d.height || '100%')
    };
  }

  function parseBubble(b) {
    if (_.isString(b)) {
      return { src: b, origin: 'center center', dialogs: [] };
    }
    var dialogs = _.compact(_.map(b && b.dialogs ? b.dialogs : [], parseDialog));
    return {
      src: String(b && b.src ? b.src : ''),
      origin: b && b.origin ? String(b.origin) : 'center center',
      dialogs: dialogs
    };
  }

  function parsePanel(p) {
    if (_.isString(p)) {
      return {
        type: 'image',
        src: p,
        bubbles: [],
        tilt3d: p.indexOf('segmen1 01') !== -1,
        narrative: null
      };
    }
    if (p && p.type === 'narrative') {
      return { type: 'narrative', text: String(p.text || '') };
    }
    if (p && (p.type === 'multi' || p.frames)) {
      var frames = _.map(p.frames || [], function (f) {
        return {
          src: String(f && f.src ? f.src : ''),
          bubbles: _.map(f && f.bubbles ? f.bubbles : [], parseBubble),
          className: f && f.className ? String(f.className) : '',
          tilt: f && f.tilt ? String(f.tilt) : ''
        };
      });
      return {
        type: 'multi',
        layout: p.layout || 'stagger-right',
        staggerFrames: p.staggerFrames === true || p.layout === 'diptych-3d',
        frames: frames,
        narrative: p.narrative ? String(p.narrative) : null
      };
    }
    var bubbles = _.map(p && p.bubbles ? p.bubbles : [], parseBubble);
    return {
      type: 'image',
      src: String(p && p.src ? p.src : ''),
      bubbles: bubbles,
      tilt3d: p.tilt3d === true || (p.src && p.src.indexOf('segmen1 01') !== -1),
      narrative: p && p.narrative ? String(p.narrative) : (p && p.text && p.type !== 'narrative' ? String(p.text) : null)
    };
  }

  var Scene = Backbone.Model.extend({
    defaults: function () {
      return {
        id: '', chapter: '', height: 3, art: parseArt(), camera: { end: 1, lift: 0, liftFrom: 0.5, pace: 0 }, background: '',
        captionStyle: 'panel', layers: [], captions: [], panels: [], audio: null, fx: 'none', index: 0
      };
    },

    parse: function (attrs) {
      var layers = _.map(attrs.layers || [], parseLayer);
      return _.extend({}, attrs, {
        height: clamp(attrs.height, 1, 20, 3),
        art: parseArt(attrs.art),
        camera: {
          end: clamp(attrs.camera && attrs.camera.end, 0, 1, 1),
          lift: clamp(attrs.camera && attrs.camera.lift, 0, 1, 0),
          liftFrom: clamp(attrs.camera && attrs.camera.liftFrom, 0, 0.99, 0.5),
          pace: clamp(attrs.camera && attrs.camera.pace, 0, 10, 0),
          startCenter: clamp(attrs.camera && attrs.camera.startCenter, 0, 1, 0),
          holdStart: clamp(attrs.camera && attrs.camera.holdStart, 0, 10, 0),
          holdEnd: clamp(attrs.camera && attrs.camera.holdEnd, 0, 10, 0),
          spread: clamp(attrs.camera && attrs.camera.spread, 0, 2, 1)
        },
        background: attrs.background ? String(attrs.background) : '',
        captionStyle: _.contains(CAPTION_STYLES, attrs.captionStyle) ? attrs.captionStyle : 'panel',
        layers: layers,
        captions: _.map(attrs.captions || [], function (c) { return parseCaption(c, layers); }),
        panels: _.isArray(attrs.panels) ? _.map(attrs.panels, parsePanel) : [],
        audio: parseAudio(attrs.audio),
        fx: _.contains(FX, attrs.fx) ? attrs.fx : 'none'
      });
    },

    // Width / height of the art canvas.
    artRatio: function () {
      var art = this.get('art');
      return art.width / art.height;
    },

    // Captions bucketed by position (first-appearance order), each keeping its index.
    // Anchored captions group by anchor (same y + depth stack together).
    captionGroups: function () {
      var groups = [];
      _.each(this.get('captions'), function (c, i) {
        var key = !c.anchor ? c.pos
          : c.anchor.lock ? 'lock:' + c.anchor.y
          : 'anchor:' + c.anchor.y + ':' + c.anchor.depth + ':' + c.anchor.layer;
        var group = _.findWhere(groups, { key: key });
        if (!group) { group = { key: key, pos: c.pos, anchor: c.anchor, items: [] }; groups.push(group); }
        group.items.push(_.extend({ index: i }, c));
      });
      return groups;
    },

    layerSrc: function (layer, deviceType) {
      return deviceType === 'mobile' && layer.srcMobile ? layer.srcMobile : layer.src;
    },

    hasFx: function () {
      return this.get('fx') !== 'none';
    },

    hasPanels: function () {
      return this.get('panels') && this.get('panels').length > 0;
    }
  });

  Scene.POSITIONS = POSITIONS;
  return Scene;
});
