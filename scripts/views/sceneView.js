/*
 * views/sceneView.js — one scene: a tall <section> with a sticky stage.
 *
 * Responsibility: render the layered art (back-to-front <img>), captions (real
 * text) and the optional fx overlay; build ONE GSAP timeline scrubbed by
 * ScrollTrigger (camera pan + depth parallax + caption fades); run ambient
 * motion (drift / bob / tilt / shake) and fx only while the scene is active; lazy-load
 * its images on request (AppView asks one scene ahead).
 *
 * Layout: every layer shares one "art box" with the art's aspect ratio, sized
 * to cover the stage (CSS --art-w). On a screen with the art's own ratio the
 * whole composition fits; on wider screens the box fills the width and the
 * camera pans down to camera.end.
 *
 * Parallax: at scroll progress p, layer y = push * (1 - p) - (cameraEnd + lift) * p.
 *   push = (depth - DEPTH_REF) * PUSH_FAR|PUSH_NEAR * stage height: far layers
 *          start higher, near layers start much lower and surge up.
 *   lift = extra rise at the end for layers deeper than camera.liftFrom, up to
 *          camera.lift stage heights, capped by the art left below the screen
 *          (so it never opens a gap). Lets the front waves show on wide
 *          screens; phone-shaped screens have no art below, so they land on the
 *          authored composition exactly.
 *
 * Pace: section height = height screens + camera travel * camera.pace (px, --scene-extra),
 * re-measured on every ScrollTrigger refresh. Keeps motion per scroll px similar on
 * desktop (long camera pan) and phones (almost none).
 *
 * Timeline length is fixed at 1, so caption `at`/`dur` map directly to the
 * scroll progress through the pinned part of the section.
 *
 * Captions: screen-fixed groups live in .scene__captions (by `pos`). Captions
 * with an `anchor` live inside the art box (.caption-anchor at anchor.y) and get
 * the same motion as a layer of anchor.depth, so they travel with their subject.
 * anchor.lock captions stay screen-fixed in .scene__captions, centred where
 * anchor.y of the art lands when the scene ends (placeLockedCaptions, on refresh).
 */
define([
  'jquery', 'underscore', 'backbone', 'services/anim', 'services/device', 'views/webglView'
], function ($, _, Backbone, anim, device, WebGLView) {
  'use strict';

  var gsap = anim.gsap;
  var ScrollTrigger = anim.ScrollTrigger;
  var DEPTH_REF = 0.5;   // depth that moves exactly with the camera
  var PUSH_FAR = 1.2;    // start offset (stage heights) per unit of depth below DEPTH_REF
  var PUSH_NEAR = 2;     // ... and above it (near waves travel further = faster)
  var CAPTION_FADE = 0.04;
  var CAPTION_RISE = 16; // px

  // Speech bubbles play on their own clock (seconds), not with the scroll: when a
  // panel arrives, its bubbles pop one after another and their words fade in one by
  // one. Scrolling back above the panel resets them so they replay next time.
  var BUBBLE_POP = 0.35;   // s, bubble shape fades/scales in
  var WORD_STEP = 0.09;    // s between word starts
  var WORD_FADE = 0.45;    // s, one word's fade-in
  var BUBBLE_GAP = 0.25;   // s pause before the next bubble
  var BUBBLE_CUE = 0.6;    // fraction of the panel's enter scroll at which bubbles start

  // Bubble text auto-fit: largest font whose text block's corners stay inside the
  // dialog oval: (w/W)^2 + (h/H)^2 <= BUBBLE_FIT (1 = corners exactly on the ellipse).
  var BUBBLE_FONT_MIN = 8;   // px
  var BUBBLE_FONT_MAX = 40;  // px
  var BUBBLE_FIT = 0.8;

  // Mouse parallax: px per unit of (depth - MOUSE_REF) at full pointer offset.
  var MOUSE_REF = 0.35;
  var MOUSE_X = 44;
  var MOUSE_Y = 26;

  function formatBubbleDialog(text) {
    if (!text) { return ''; }
    var lines = text.split('\n');
    var out = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { continue; }
      out += '<span class="bubble-line">';
      var words = line.split(/\s+/);
      for (var j = 0; j < words.length; j++) {
        var w = words[j];
        if (w) {
          out += '<span class="bubble-word">' + _.escape(w) + '</span> ';
        }
      }
      out += '</span>';
    }
    return out;
  }

  var template = _.template([
    '<div class="scene__stage">',
    '  <div class="scene__art">',
    '  <% _.each(layers, function (layer, i) { %>',
    '    <div class="layer" data-layer="<%- i %>">',
    '      <div class="layer__mouse">',
    '        <div class="layer__shake">',
    '          <img class="layer__img" alt="<%- layer.alt %>" decoding="async" draggable="false">',
    '        </div>',
    '      </div>',
    '    </div>',
    '  <% }); %>',
    '  <% _.each(groups, function (group) { if (!group.anchor || group.anchor.lock) { return; } %>',
    '    <div class="caption-anchor scene__captions--<%- captionStyle %>" data-depth="<%- group.anchor.depth %>" data-layer="<%- group.anchor.layer === null ? "" : group.anchor.layer %>">',
    '      <div class="caption-group caption-group--anchor" style="bottom: <%- (1 - group.anchor.y) * 100 %>%">',
    '      <% _.each(group.items, function (c) { %>',
    '        <% if (c.type === "chapter-title") { %>',
    '        <div class="caption caption--chapter-title" data-caption="<%- c.index %>">',
    '          <span class="chapter-title__label"><%- c.label || "CHAPTER 1 :" %></span>',
    '          <h2 class="chapter-title__name"><%- c.title || c.text || "RUMAH" %></h2>',
    '        </div>',
    '        <% } else { %>',
    '        <p class="caption" data-caption="<%- c.index %>"><%- c.text %></p>',
    '        <% } %>',
    '      <% }); %>',
    '      </div>',
    '    </div>',
    '  <% }); %>',
    '  </div>',
    '  <div class="scene__fx" aria-hidden="true"></div>',
    '  <div class="scene__captions scene__captions--<%- captionStyle %>">',
    '  <% _.each(groups, function (group) { if (group.anchor && !group.anchor.lock) { return; } %>',
    '  <% if (group.anchor) { %>',
    '    <div class="caption-group caption-group--locked" data-y="<%- group.anchor.y %>">',
    '  <% } else { %>',
    '    <div class="caption-group caption-group--<%- group.pos %>">',
    '  <% } %>',
    '    <% _.each(group.items, function (c) { %>',
    '      <% if (c.type === "chapter-title") { %>',
    '      <div class="caption caption--chapter-title" data-caption="<%- c.index %>">',
    '        <span class="chapter-title__label"><%- c.label || "CHAPTER 1 :" %></span>',
    '        <h2 class="chapter-title__name"><%- c.title || c.text || "RUMAH" %></h2>',
    '      </div>',
    '      <% } else { %>',
    '      <p class="caption" data-caption="<%- c.index %>"><%- c.text %></p>',
    '      <% } %>',
    '    <% }); %>',
    '    </div>',
    '  <% }); %>',
    '  </div>',
    '  <% if (panels && panels.length) { %>',
    '  <div class="scene__white-transition" aria-hidden="true"></div>',
    '  <div class="scene__panels" aria-label="Comic panels">',
    '  <% _.each(panels, function (item, i) { %>',
    '    <% if (item.type === "narrative") { %>',
    '    <div class="comic-panel comic-panel--narrative" data-panel="<%- i %>">',
    '      <div class="comic-narrative">',
    '        <p class="comic-narrative__text"><%- item.text %></p>',
    '      </div>',
    '    </div>',
    '    <% } else if (item.type === "multi") { %>',
    '    <div class="comic-panel comic-panel--multi comic-panel--<%- item.layout || "stagger-right" %>" data-panel="<%- i %>">',
    '      <div class="comic-multi-container comic-multi-container--<%- item.layout || "stagger-right" %>">',
    '        <% _.each(item.frames, function (f, fIdx) { %>',
    '        <div class="comic-multi__tilt comic-multi__tilt--<%- fIdx %> <%= f.tilt ? "comic-multi__tilt--" + f.tilt : "" %>">',
    '          <div class="comic-panel__frame comic-multi__frame comic-multi__frame--<%- fIdx %> <%- f.className || "" %>">',
    '            <img class="comic-panel__img" src="<%- f.src %>" alt="Comic panel" decoding="async" draggable="false">',
    '            <% if (f.bubbles && f.bubbles.length) { %>',
    '              <% _.each(f.bubbles, function (bubble) { %>',
    '              <div class="comic-bubble" data-origin="<%- bubble.origin %>">',
    '                <div class="comic-bubble__inner">',
    '                  <img class="comic-bubble__bg" src="<%- bubble.src %>" alt="Speech bubble" decoding="async" draggable="false">',
    '                  <% if (bubble.dialogs && bubble.dialogs.length) { %>',
    '                    <% _.each(bubble.dialogs, function (d) { %>',
    '                    <div class="comic-bubble__dialog" style="top: <%- d.top %>; left: <%- d.left %>; width: <%- d.width %>; height: <%- d.height %>;">',
    '                      <p class="comic-bubble__text"><%= formatBubbleDialog(d.text) %></p>',
    '                    </div>',
    '                    <% }); %>',
    '                  <% } %>',
    '                </div>',
    '              </div>',
    '              <% }); %>',
    '            <% } %>',
    '          </div>',
    '        </div>',
    '        <% }); %>',
    '      </div>',
    '      <% if (item.narrative) { %>',
    '      <div class="comic-narrative comic-panel__narrative">',
    '        <p class="comic-narrative__text"><%- item.narrative %></p>',
    '      </div>',
    '      <% } %>',
    '    </div>',
    '    <% } else { %>',
    '    <div class="comic-panel comic-panel--image <%= item.narrative ? "comic-panel--with-narrative" : "" %> <%= item.tilt3d ? "comic-panel--tilt-3d" : "" %>" data-panel="<%- i %>">',
    '      <div class="comic-panel__tilt <%= item.tilt3d ? "comic-panel__tilt--active" : "" %>">',
    '        <div class="comic-panel__frame">',
    '          <img class="comic-panel__img" src="<%- item.src %>" alt="Comic panel" decoding="async" draggable="false">',
    '          <% if (item.bubbles && item.bubbles.length) { %>',
    '            <% _.each(item.bubbles, function (bubble) { %>',
    '            <div class="comic-bubble" data-origin="<%- bubble.origin %>">',
    '              <div class="comic-bubble__inner">',
    '                <img class="comic-bubble__bg" src="<%- bubble.src %>" alt="Speech bubble" decoding="async" draggable="false">',
    '                <% if (bubble.dialogs && bubble.dialogs.length) { %>',
    '                  <% _.each(bubble.dialogs, function (d) { %>',
    '                  <div class="comic-bubble__dialog" style="top: <%- d.top %>; left: <%- d.left %>; width: <%- d.width %>; height: <%- d.height %>;">',
    '                    <p class="comic-bubble__text"><%= formatBubbleDialog(d.text) %></p>',
    '                  </div>',
    '                  <% }); %>',
    '                <% } %>',
    '              </div>',
    '            </div>',
    '            <% }); %>',
    '          <% } %>',
    '        </div>',
    '      </div>',
    '      <% if (item.narrative) { %>',
    '      <div class="comic-narrative comic-panel__narrative">',
    '        <p class="comic-narrative__text"><%- item.narrative %></p>',
    '      </div>',
    '      <% } %>',
    '    </div>',
    '    <% } %>',
    '  <% }); %>',
    '  </div>',
    '  <% } %>',
    '</div>'
  ].join('\n'));

  var SceneView = Backbone.View.extend({
    tagName: 'section',
    className: 'scene',

    attributes: function () {
      return { id: 'scene-' + this.model.id, 'data-chapter': this.model.get('chapter') };
    },

    initialize: function (options) {
      this.vent = options.vent;
      this.reduced = window.FLIGHT.reducedMotion;
      this.active = false;
      this.loading = null;
      this.ambient = [];
      this.onPointerMoveBound = null;
      this.onPointerLeaveBound = null;
      this.$frames = null;
      this.$narratives = null;
      this.$bubbleInners = null;
      this.$layerMouses = null;
      this.$chapterCaptions = null;
      this.$anchorTexts = null;
      this.bubbleCues = [];
      this.listenTo(this.vent, 'device:change', this.onDeviceChange);
    },

    render: function () {
      var style = this.el.style;
      style.setProperty('--scene-h', this.model.get('height'));
      style.setProperty('--art-ratio', this.model.artRatio());
      if (this.model.get('background')) { style.setProperty('--scene-bg', this.model.get('background')); }

      this.$el.html(template(_.extend(this.model.toJSON(), {
        groups: this.model.captionGroups(),
        formatBubbleDialog: formatBubbleDialog
      })));
      this.stageEl = this.$('.scene__stage')[0];
      this.artEl = this.$('.scene__art')[0];
      this.$layers = this.$('.layer');
      this.$imgs = this.$('.layer__img');
      this.$shakes = this.$('.layer__shake');
      this.$layerMouses = this.$('.layer__mouse');
      this.$chapterCaptions = this.$('.caption--chapter-title');
      this.whiteTransitionEl = this.$('.scene__white-transition')[0] || null;
      this.$panels = this.$('.comic-panel');
      this.bindBubbleFit();
      this.prepareImages();
      if (this.model.hasFx() && !this.reduced) {
        this.fx = new WebGLView({ el: this.$('.scene__fx')[0], vent: this.vent, model: this.model }).render();
      }
      return this;
    },

    // Call after the element is in the DOM.
    setupScroll: function () {
      this.sizeScene();
      this.onRefreshInit = _.bind(this.sizeScene, this);
      ScrollTrigger.addEventListener('refreshInit', this.onRefreshInit);
      this.timeline = this.buildTimeline();
      this.placeLockedCaptions();
      var placeLocked = _.bind(this.placeLockedCaptions, this);
      this.scrubTrigger = ScrollTrigger.create({
        trigger: this.el,
        start: 'top top',
        end: 'bottom bottom',
        scrub: this.reduced ? true : 0.2,
        invalidateOnRefresh: true,   // re-measure stage/art on resize
        animation: this.timeline,
        onRefresh: _.bind(function (st) {
          placeLocked();
          var p = st.progress;
          st.animation.progress(p > 0.5 ? 0 : 1, true).progress(p, true);
        }, this)
      });
      this.activeTrigger = ScrollTrigger.create({
        trigger: this.el,
        start: 'top center',
        end: 'bottom center',
        onToggle: _.bind(function (self) { this.setActive(self.isActive); }, this)
      });
      this.bindParallax();
    },

    // Scroll (px) a panel stays centred. Kept short so scrolling stays free: bubble
    // text plays on its own clock (playBubbles), so nothing waits on the scroll.
    panelHoldDistance: function (p) {
      var stageH = this.stageEl.clientHeight;
      if (!p) { return stageH * 0.25; }
      if (p.type === 'multi' && p.staggerFrames) { return stageH * 0.6; }
      if (p.type === 'multi' || p.narrative || p.type === 'narrative') { return stageH * 0.35; }
      return stageH * 0.25;
    },

    panelsScrollDistance: function () {
      var panels = this.model.get('panels');
      if (!panels || !panels.length) { return 0; }
      var total = 0;
      var stageH = this.stageEl ? this.stageEl.clientHeight : window.innerHeight;
      var dEnter = stageH * 0.45;
      var dExit = stageH * 0.45;
      for (var i = 0; i < panels.length; i++) {
        total += dEnter + this.panelHoldDistance(panels[i]);
      }
      total += dExit;
      return total;
    },

    // Extra section height so a long camera pan gets proportionally more scroll,
    // plus extra scroll distance for panels and white transition if present.
    sizeScene: function () {
      this.fitBubbleText();
      var stageH = this.stageEl.clientHeight;
      var extra = this.cameraEnd() * this.model.get('camera').pace;
      var panels = this.model.get('panels');
      if (panels && panels.length) {
        var transDist = stageH * 0.4;
        extra += transDist + this.panelsScrollDistance();
      }
      this.el.style.setProperty('--scene-extra', Math.round(extra) + 'px');
    },

    // Size each dialog's text to fill its oval (binary search on font size).
    // Measured without transforms, so it works while panels are hidden or tilted.
    fitBubbleText: function ($dialogs) {
      ($dialogs || this.$('.comic-bubble__dialog')).each(function (i, box) {
        var text = box.firstElementChild;
        var W = box.clientWidth;
        var H = box.clientHeight;
        if (!text || W < 8 || H < 8) { return; }
        var lo = BUBBLE_FONT_MIN;
        var hi = BUBBLE_FONT_MAX;
        for (var k = 0; k < 10; k++) {
          var mid = (lo + hi) / 2;
          text.style.fontSize = mid + 'px';
          var fx = text.offsetWidth / W;
          var fy = text.offsetHeight / H;
          if (fx * fx + fy * fy <= BUBBLE_FIT) { lo = mid; } else { hi = mid; }
        }
        text.style.fontSize = (Math.floor(lo * 10) / 10) + 'px';
      });
    },

    // Refit a panel's bubbles once its image has a size; refit all once web fonts load.
    bindBubbleFit: function () {
      var self = this;
      this.$('.comic-panel__img').each(function (i, img) {
        $(img).one('load', function () {
          self.fitBubbleText($(img).closest('.comic-panel__frame').find('.comic-bubble__dialog'));
        });
      });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { self.fitBubbleText(); });
      }
    },

    // Scroll distance (px) of the wave part alone.
    waveScrollDistance: function () {
      var stageH = this.stageEl.clientHeight;
      var extra = this.cameraEnd() * this.model.get('camera').pace;
      return Math.max(0, (this.model.get('height') - 1) * stageH + extra);
    },

    // How far the camera has travelled (px) when the scene ends.
    cameraEnd: function () {
      var artH = this.artEl.offsetHeight;
      var maxTravel = Math.max(0, artH - this.stageEl.clientHeight);
      return Math.min(maxTravel, this.model.get('camera').end * artH);
    },

    // Locked captions: screen y (px) where their art y sits when the scene ends.
    placeLockedCaptions: function () {
      var artH = this.artEl.offsetHeight;
      var end = this.cameraEnd();
      this.$('.caption-group--locked').each(function (i, el) {
        el.style.top = (Number(el.getAttribute('data-y')) * artH - end) + 'px';
      });
    },

    buildTimeline: function () {
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      var panels = this.model.get('panels');
      var hasPanels = panels && panels.length > 0;
      var stageH = this.stageEl.clientHeight;

      if (!hasPanels) {
        tl.to({}, { duration: 1 }, 0);
        this.addLayerMotion(tl, 1);
        this.addCaptions(tl, 1);
        return tl;
      }

      var waveDist = this.waveScrollDistance();
      this.waveDist = waveDist;
      var transDist = stageH * 0.4;
      var panelsDist = this.panelsScrollDistance();
      var totalDist = waveDist + transDist + panelsDist;

      tl.to({}, { duration: totalDist }, 0);
      this.addLayerMotion(tl, waveDist);
      this.addCaptions(tl, waveDist);
      this.addPanelsMotion(tl, waveDist, transDist);
      return tl;
    },

    // Extra end rise (px) for a layer of this depth.
    endLift: function (depth) {
      var cam = this.model.get('camera');
      if (this.reduced || !cam.lift || depth <= cam.liftFrom) { return 0; }
      var stageH = this.stageEl.clientHeight;
      var below = Math.max(0, this.artEl.offsetHeight - this.cameraEnd() - stageH);
      var k = (depth - cam.liftFrom) / (1 - cam.liftFrom);
      return Math.min(below, cam.lift * stageH * k);
    },

    // Layers and anchored captions: start pushed by depth, end at camera + lift.
    addLayerMotion: function (tl, duration) {
      duration = duration || 1;
      var self = this;
      var layers = this.model.get('layers');
      var addDepthMotion = function (el, depth) {
        var startY = function () {
          if (self.reduced) { return 0; }
          var rel = depth - DEPTH_REF;
          return rel * (rel > 0 ? PUSH_NEAR : PUSH_FAR) * self.stageEl.clientHeight;
        };
        var endY = function () { return -self.cameraEnd() - self.endLift(depth); };
        tl.fromTo(el, { y: startY }, { y: endY, duration: duration }, 0);
      };
      this.$layers.each(function (i, el) { addDepthMotion(el, layers[i].depth); });
      this.$('.caption-anchor').each(function (i, el) {
        addDepthMotion(el, Number(el.getAttribute('data-depth')));
      });
    },

    // Page scroll (px) across the whole timeline: section height minus the pinned stage.
    scrollDistance: function () {
      return Math.max(0, this.el.offsetHeight - this.stageEl.clientHeight);
    },

    addCaptions: function (tl, waveDuration) {
      waveDuration = waveDuration || 1;
      var self = this;
      var captions = this.model.get('captions');
      var rise = this.reduced ? 0 : CAPTION_RISE;
      var captionOf = function (el) { return captions[Number(el.getAttribute('data-caption'))]; };
      this.$('.caption').each(function (i, el) {
        var c = captionOf(el);
        var at = c.at * waveDuration;
        var dur = c.dur * waveDuration;
        if (c.exit === 'scroll') {
          // Fade in in place, then travel up with the page until off the top. Scroll
          // captions in a group hold their spot until the group's last `at`, then
          // move together, so every line appears at the anchor with no gap.
          var start = _.max(_.map($(el).siblings('.caption').addBack().get(), function (s) {
            var sc = captionOf(s);
            return sc.exit === 'scroll' ? sc.at * waveDuration : -Infinity;
          }));
          if (c.fade) { tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: CAPTION_FADE * waveDuration }, at); }
          if (start < waveDuration) {
            tl.fromTo(el, { y: 0 }, {
              y: function () { return -(1 - (start / waveDuration)) * self.scrollDistance(); },
              duration: waveDuration - start
            }, start);
          }
          return;
        }
        if (!c.fade) { return; } // default: always visible, like comic text
        var fade = Math.min(CAPTION_FADE * waveDuration, dur / 3);
        tl.fromTo(el, { opacity: 0, y: rise }, { opacity: 1, y: 0, duration: fade }, at);
        if (at + dur < waveDuration) {
          tl.to(el, { opacity: 0, y: -rise, duration: fade }, at + dur - fade);
        }
      });
    },

    // White transition and comic panels scrolling up smoothly one by one
    addPanelsMotion: function (tl, waveDist, transDist) {
      var self = this;
      var stageH = this.stageEl.clientHeight;
      var panels = this.model.get('panels');
      var N = panels ? panels.length : 0;
      if (!N) { return; }

      // 1. Transition effect to plain white background
      if (this.whiteTransitionEl) {
        tl.fromTo(this.whiteTransitionEl, { autoAlpha: 0 }, {
          autoAlpha: 1,
          duration: transDist,
          ease: 'power1.inOut'
        }, waveDist);
      }

      this.bubbleCues = [];
      tl.eventCallback('onUpdate', _.bind(this.cueBubbles, this));

      var startPanelTime = waveDist + transDist;
      var currentStart = startPanelTime;
      var dEnter = stageH * 0.45;
      var dExit = stageH * 0.45;

      this.$panels.each(function (i, el) {
        var pData = panels[i];
        var dHold = self.panelHoldDistance(pData);
        var enterStart = currentStart;
        var holdStart = enterStart + dEnter;
        var exitStart = holdStart + dHold;

        // Reset panel initial position below screen. autoAlpha (opacity + visibility)
        // so off-screen panels aren't painted while the waves scroll.
        gsap.set(el, { y: stageH, autoAlpha: 0 });

        // 1. Enter from bottom and lock in center (y: 0)
        tl.fromTo(el, {
          y: function () { return self.stageEl.clientHeight; },
          autoAlpha: 0
        }, {
          y: 0,
          autoAlpha: 1,
          duration: dEnter,
          ease: self.reduced ? 'none' : 'power1.out'
        }, enterStart);

        // Special 3D Card Parallax Transition for tilt3d panels (e.g. segmen1 01)
        if (pData.tilt3d && !self.reduced) {
          var $tilt = $(el).find('.comic-panel__tilt');
          if ($tilt.length) {
            var tiltEl = $tilt[0];
            gsap.set(tiltEl, {
              rotateY: 26,
              rotateX: 4,
              scale: 0.88,
              x: 30,
              opacity: 0.15
            });

            tl.fromTo(tiltEl, {
              rotateY: 26,
              rotateX: 4,
              scale: 0.88,
              x: 30,
              opacity: 0.15
            }, {
              rotateY: 14,
              rotateX: 0,
              scale: 1.0,
              x: 0,
              opacity: 1.0,
              duration: dEnter,
              ease: 'power2.out'
            }, enterStart);

            if (i < N - 1) {
              tl.to(tiltEl, {
                rotateY: 22,
                rotateX: -4,
                scale: 0.92,
                duration: dExit,
                ease: 'power1.in'
              }, exitStart);
            }
          }
        }

        // Sequential reveal for multi-panel scenes with staggerFrames (e.g. Panel 13 & 14)
        if (pData.type === 'multi' && pData.staggerFrames) {
          var $tilts = $(el).find('.comic-multi__tilt');
          var tilt0 = $tilts[0];
          var tilt1 = $tilts[1];

          if (tilt0 && tilt1) {
            if (!self.reduced) {
              // Frame 0 (Panel 13): starts with deep 3D tilt, enters with panel
              gsap.set(tilt0, { rotateY: 26, scale: 0.9, x: 25, opacity: 0.3 });
              tl.fromTo(tilt0, {
                rotateY: 26,
                scale: 0.9,
                x: 25,
                opacity: 0.3
              }, {
                rotateY: 13,
                scale: 1.0,
                x: 0,
                opacity: 1.0,
                duration: dEnter,
                ease: 'power2.out'
              }, enterStart);

              // Frame 1 (Panel 14): initially hidden, appears sequentially during hold
              gsap.set(tilt1, {
                rotateY: -26,
                scale: 0.88,
                y: 35,
                x: -25,
                opacity: 0
              });

              var f1Start = holdStart + dHold * 0.26;
              var f1Dur = dHold * 0.42;

              tl.fromTo(tilt1, {
                rotateY: -26,
                scale: 0.88,
                y: 35,
                x: -25,
                opacity: 0
              }, {
                rotateY: -13,
                scale: 1.0,
                y: 0,
                x: 0,
                opacity: 1.0,
                duration: f1Dur,
                ease: 'power2.out'
              }, f1Start);

              // Exit: tilts slightly deeper as scene leaves
              if (i < N - 1) {
                tl.to(tilt0, { rotateY: 20, scale: 0.94, duration: dExit, ease: 'power1.in' }, exitStart);
                tl.to(tilt1, { rotateY: -20, scale: 0.94, duration: dExit, ease: 'power1.in' }, exitStart);
              }
            } else {
              // Reduced motion: simple sequential fade
              gsap.set(tilt1, { opacity: 0 });
              tl.fromTo(tilt1, { opacity: 0 }, { opacity: 1, duration: dHold * 0.4 }, holdStart + dHold * 0.3);
            }
          }
        }

        // 2. Speech bubbles: a time-based timeline per panel, cued when the scroll
        //    brings the panel in (cueBubbles). Only the gentle float follows the scroll.
        var $bubbles = $(el).find('.comic-bubble');
        if ($bubbles.length) {
          var bt = gsap.timeline({ paused: true });
          var t = 0;
          $bubbles.each(function (bIdx, bEl) {
            gsap.set(bEl, { transformOrigin: bEl.getAttribute('data-origin') || 'center center' });
            bt.fromTo(bEl, { scale: 0.95, autoAlpha: 0 }, {
              scale: 1, autoAlpha: 1, duration: BUBBLE_POP, ease: 'power1.out'
            }, t);
            if (!self.reduced) {
              tl.fromTo(bEl, { y: 0 }, { y: -14, duration: Math.max(1, exitStart - enterStart), ease: 'none' }, enterStart);
            }
            var $words = $(bEl).find('.bubble-word');
            if ($words.length) {
              bt.fromTo($words, { opacity: 0, y: 4 }, {
                opacity: 1, y: 0, duration: WORD_FADE, stagger: WORD_STEP, ease: 'power1.out'
              }, t + BUBBLE_POP * 0.6);
            }
            t += BUBBLE_POP * 0.6 + Math.max(0, $words.length - 1) * WORD_STEP + WORD_FADE + BUBBLE_GAP;
          });
          if (self.reduced) {
            bt.progress(1);
          } else {
            self.bubbleCues.push({ at: enterStart + dEnter * BUBBLE_CUE, tl: bt, started: false });
          }
        }

        // 3. Exit to top (or hold center for last panel)
        if (i < N - 1) {
          tl.to(el, {
            y: function () { return -self.stageEl.clientHeight; },
            autoAlpha: 0,
            duration: dExit,
            ease: self.reduced ? 'none' : 'power1.in'
          }, exitStart);
        } else {
          tl.to(el, { y: 0, autoAlpha: 1, duration: dExit }, exitStart);
        }

        // Next panel starts entering at the exact moment this panel starts exiting
        currentStart = exitStart;
      });
    },

    // Scrubbed timeline moved: start bubble text for panels the scroll has reached,
    // reset (to replay later) those the reader scrolled back above.
    cueBubbles: function () {
      var time = this.timeline ? this.timeline.time() : 0;
      _.each(this.bubbleCues, function (cue) {
        if (time >= cue.at) {
          if (!cue.started) { cue.started = true; cue.tl.restart(); }
        } else if (cue.started) {
          cue.started = false;
          cue.tl.pause(0);
        }
      });
    },

    // Per-layer static transform (overscan scale + pivot) and paused ambient loops.
    prepareImages: function () {
      var layers = this.model.get('layers');
      this.$imgs.each(_.bind(function (i, img) {
        var cfg = layers[i];
        gsap.set(img, { scale: cfg.scale, transformOrigin: cfg.pivot });
        if (this.reduced) { return; }
        if (cfg.drift) {
          this.ambient.push(gsap.fromTo(img, { xPercent: -cfg.drift }, {
            xPercent: cfg.drift, duration: 16 + i * 3, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true
          }));
        }
        if (cfg.shake) { this.ambient = this.ambient.concat(this.shakeLoops(this.$shakes[i], cfg)); }
        if (cfg.bob || cfg.tilt) {
          // On a shaking layer, bob in step with the shake so it rides the same swell.
          var bob = gsap.fromTo(img, { y: -cfg.bob, rotation: -cfg.tilt }, {
            y: cfg.bob, rotation: cfg.tilt, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true,
            duration: cfg.shake ? cfg.shake.period / 2 : 2.6 + (i % 4) * 0.55
          });
          if (cfg.shake) { bob.totalTime(cfg.shake.phase * cfg.shake.period); }
          this.ambient.push(bob);
        }
      }, this));
      // Captions riding a layer (anchor.layer) copy that layer's shake.
      if (this.reduced) { return; }
      this.$('.caption-anchor').each(_.bind(function (i, el) {
        var cfg = layers[el.getAttribute('data-layer')];
        if (cfg && cfg.shake) { this.ambient = this.ambient.concat(this.shakeLoops(el, cfg)); }
      }, this));
    },

    // Rough-sea rocking on the layer's shake wrapper (separate element, so it
    // stacks with drift / bob / tilt on the img). Three yoyo tweens, one cycle per period:
    //   x   left <-> right over half a period
    //   y   up <-> down at double speed: up at both ends of the swing, down in the middle
    //   rot leans into the swing (in step with x)
    // phase offsets the cycle so neighbouring waves don't move in lockstep.
    shakeLoops: function (el, cfg) {
      var s = cfg.shake;
      var half = s.period / 2;
      var ease = 'sine.inOut';
      gsap.set(el, { transformOrigin: cfg.pivot });
      var loops = [
        gsap.fromTo(el, { xPercent: -s.x, rotation: -s.rot }, {
          xPercent: s.x, rotation: s.rot, duration: half, ease: ease, yoyo: true, repeat: -1, paused: true
        }),
        gsap.fromTo(el, { yPercent: -s.y }, {
          yPercent: s.y, duration: half / 2, ease: ease, yoyo: true, repeat: -1, paused: true
        })
      ];
      _.invoke(loops, 'totalTime', s.phase * s.period);
      return loops;
    },

    // Re-check after jumps/refreshes in case onToggle didn't fire.
    syncActive: function () {
      if (this.activeTrigger) { this.setActive(this.activeTrigger.isActive); }
    },

    setActive: function (active) {
      if (active === this.active) { return; }
      this.active = active;
      this.$el.toggleClass('is-active', active);
      _.invoke(this.ambient, active ? 'play' : 'pause');
      if (active) {
        if (this.fx) { this.fx.start(); }
        this.vent.trigger('scene:enter', this.model);
      } else {
        if (this.fx) { this.fx.stop(); }
        this.onPointerLeave();
        this.vent.trigger('scene:leave', this.model);
      }
    },

    bindParallax: function () {
      this.unbindParallax();
      if (this.reduced) { return; }
      var hasMouse = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (!hasMouse) { return; }

      this.$frames = this.$('.comic-panel__frame');
      this.$narratives = this.$('.comic-narrative');
      this.$bubbleInners = this.$('.comic-bubble__inner');
      this.$layerMouses = this.$('.layer__mouse');
      this.$chapterCaptions = this.$('.caption--chapter-title');
      this.$anchorTexts = this.$('.caption-anchor .caption').not('.caption--chapter-title');
      if (!this.$frames.length && !this.$anchorTexts.length && !this.$narratives.length && !this.$bubbleInners.length && !this.$layerMouses.length) { return; }

      this.onPointerMoveBound = _.throttle(_.bind(this.onPointerMove, this), 16);
      this.onPointerLeaveBound = _.bind(this.onPointerLeave, this);

      window.addEventListener('pointermove', this.onPointerMoveBound, { passive: true });
      document.addEventListener('mouseleave', this.onPointerLeaveBound);
    },

    unbindParallax: function () {
      if (this.onPointerMoveBound) {
        window.removeEventListener('pointermove', this.onPointerMoveBound);
        this.onPointerMoveBound = null;
      }
      if (this.onPointerLeaveBound) {
        document.removeEventListener('mouseleave', this.onPointerLeaveBound);
        this.onPointerLeaveBound = null;
      }
      if (this.$frames && this.$frames.length) {
        gsap.killTweensOf(this.$frames);
        gsap.set(this.$frames, { x: 0, y: 0, rotateX: 0, rotateY: 0 });
      }
      if (this.$narratives && this.$narratives.length) {
        gsap.killTweensOf(this.$narratives);
        gsap.set(this.$narratives, { x: 0, y: 0 });
      }
      if (this.$bubbleInners && this.$bubbleInners.length) {
        gsap.killTweensOf(this.$bubbleInners);
        gsap.set(this.$bubbleInners, { x: 0, y: 0 });
      }
      if (this.$layerMouses && this.$layerMouses.length) {
        gsap.killTweensOf(this.$layerMouses);
        gsap.set(this.$layerMouses, { x: 0, y: 0, rotate: 0 });
      }
      if (this.$chapterCaptions && this.$chapterCaptions.length) {
        gsap.killTweensOf(this.$chapterCaptions);
        gsap.set(this.$chapterCaptions, { x: 0, y: 0 });
      }
      if (this.$anchorTexts && this.$anchorTexts.length) {
        gsap.killTweensOf(this.$anchorTexts);
        gsap.set(this.$anchorTexts, { x: 0, y: 0 });
      }
    },

    onPointerMove: function (e) {
      if (!this.active || this.reduced) { return; }
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (!w || !h) { return; }

      var normX = Math.max(-1, Math.min(1, (e.clientX - w / 2) / (w / 2)));
      var normY = Math.max(-1, Math.min(1, (e.clientY - h / 2) / (h / 2)));

      // 3D Card tilt and gentle parallax movement following mouse
      var targetRotY = normX * 7.5;   // tilts left/right up to 7.5 deg
      var targetRotX = -normY * 4.5;  // tilts up/down up to 4.5 deg
      var targetX = normX * 22;       // moves left/right up to 22px
      var targetY = normY * 12;       // moves up/down up to 12px

      if (this.$frames && this.$frames.length) {
        gsap.to(this.$frames, {
          rotateY: targetRotY,
          rotateX: targetRotX,
          x: targetX,
          y: targetY,
          duration: 0.85,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }

      if (this.$narratives && this.$narratives.length) {
        gsap.to(this.$narratives, {
          x: normX * 10,
          y: normY * 6,
          duration: 0.85,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }

      if (this.$bubbleInners && this.$bubbleInners.length) {
        // Floating physical layer depth separation (1.85x movement relative to panel)
        gsap.to(this.$bubbleInners, {
          x: targetX * 1.85,
          y: targetY * 1.85,
          duration: 0.95,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }

      // Multi-plane mouse parallax on ocean scene & ship layers
      if (this.$layerMouses && this.$layerMouses.length) {
        var layers = this.model.get('layers') || [];
        this.$layerMouses.each(function (i, el) {
          var cfg = layers[i];
          var depth = cfg && typeof cfg.depth === 'number' ? cfg.depth : 0.5;
          var lx = normX * (depth - MOUSE_REF) * MOUSE_X;
          var ly = normY * (depth - MOUSE_REF) * MOUSE_Y;
          var props = {
            x: lx,
            y: ly,
            duration: 0.9,
            ease: 'power2.out',
            overwrite: 'auto'
          };
          if (cfg && (cfg.alt || '').toLowerCase().indexOf('steamship') !== -1) {
            props.rotate = normX * 2.4;
          }
          gsap.to(el, props);
        });
      }

      // Narration printed on the art: same offset as a layer of its anchor depth,
      // so the text moves with the wave it sits on.
      if (this.$anchorTexts && this.$anchorTexts.length) {
        this.$anchorTexts.each(function (i, el) {
          var depth = Number($(el).closest('.caption-anchor').attr('data-depth')) || 0.5;
          gsap.to(el, {
            x: normX * (depth - MOUSE_REF) * MOUSE_X,
            y: normY * (depth - MOUSE_REF) * MOUSE_Y,
            duration: 0.9,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        });
      }

      // Chapter title card ("Chapter 1: Rumah") subtle parallax
      if (this.$chapterCaptions && this.$chapterCaptions.length) {
        gsap.to(this.$chapterCaptions, {
          x: normX * 14,
          y: normY * 8,
          duration: 0.85,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    },

    onPointerLeave: function () {
      if (this.$frames && this.$frames.length) {
        gsap.to(this.$frames, {
          rotateY: 0,
          rotateX: 0,
          x: 0,
          y: 0,
          duration: 1.0,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
      if (this.$narratives && this.$narratives.length) {
        gsap.to(this.$narratives, {
          x: 0,
          y: 0,
          duration: 1.0,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
      if (this.$bubbleInners && this.$bubbleInners.length) {
        gsap.to(this.$bubbleInners, {
          x: 0,
          y: 0,
          duration: 1.0,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
      if (this.$layerMouses && this.$layerMouses.length) {
        gsap.to(this.$layerMouses, {
          x: 0,
          y: 0,
          rotate: 0,
          duration: 1.0,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
      if (this.$chapterCaptions && this.$chapterCaptions.length) {
        gsap.to(this.$chapterCaptions, {
          x: 0,
          y: 0,
          duration: 1.0,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
      if (this.$anchorTexts && this.$anchorTexts.length) {
        gsap.to(this.$anchorTexts, { x: 0, y: 0, duration: 1.0, ease: 'power2.out', overwrite: 'auto' });
      }
    },

    // Returns a promise; notifies (loaded, total) per image. Errors count as loaded.
    preload: function () {
      if (this.loading) { return this.loading.promise(); }
      var d = this.loading = $.Deferred();
      var layers = this.model.get('layers');
      var total = this.$imgs.length;
      var loaded = 0;
      var done = function () {
        loaded += 1;
        d.notify(loaded, total);
        if (loaded === total) { d.resolve(); }
      };
      if (!total) { d.notify(0, 0).resolve(); }
      this.$el.addClass('is-loading');
      d.done(_.bind(function () { this.$el.removeClass('is-loading').addClass('is-loaded'); }, this));
      this.$imgs.each(_.bind(function (i, img) {
        $(img).one('load', done).one('error', function () {
          window.console.warn('[scene] image failed to load:', img.src);
          done();
        });
        img.src = this.model.layerSrc(layers[i], device.type);
      }, this));
      return d.promise();
    },

    onDeviceChange: function (state, prev) {
      if (!this.loading || state.type === prev.type) { return; }
      var layers = this.model.get('layers');
      this.$imgs.each(_.bind(function (i, img) {
        var src = this.model.layerSrc(layers[i], state.type);
        if (img.getAttribute('src') !== src) { img.src = src; }
      }, this));
    },

    remove: function () {
      _.invoke(this.ambient, 'kill');
      this.ambient = [];
      this.unbindParallax();
      if (this.onRefreshInit) { ScrollTrigger.removeEventListener('refreshInit', this.onRefreshInit); }
      if (this.scrubTrigger) { this.scrubTrigger.kill(); }
      if (this.activeTrigger) { this.activeTrigger.kill(); }
      if (this.timeline) { this.timeline.kill(); }
      _.each(this.bubbleCues, function (cue) { cue.tl.kill(); });
      if (this.fx) { this.fx.remove(); }
      return Backbone.View.prototype.remove.call(this);
    }
  });

  return SceneView;
});
