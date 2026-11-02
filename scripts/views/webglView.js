/*
 * views/webglView.js — rain overlay for one scene.
 *
 * Responsibility: draw a transparent rain effect over the scene's stage and run
 * it only while the scene is active (start()/stop()).
 *   - WebGL (Three.js r149): THREE.Points with a small ShaderMaterial; drops
 *     fall in the vertex shader so the CPU only updates one uniform per frame.
 *   - No verified WebGL (or WebGL init fails): 2D canvas line rain.
 *   - prefers-reduced-motion: SceneView doesn't create this view at all.
 * Particle count scales with device.effectDensity(); pixel ratio is capped at 1.5.
 */
define(['underscore', 'backbone', 'three', 'services/device'], function (_, Backbone, THREE, device) {
  'use strict';

  var BASE_COUNT = 1600;
  var DPR_CAP = 1.5;
  var DROP_SIZE = 28;      // px, before pixel ratio
  var FALLBACK_SHARE = 0.3; // 2D canvas draws fewer drops

  var VERTEX_SHADER = [
    'uniform float uTime;',
    'uniform float uSize;',
    'uniform float uPixelRatio;',
    'attribute float aSpeed;',
    'attribute float aSeed;',
    'varying float vAlpha;',
    'void main() {',
    '  vec3 p = position;',
    '  p.y = mod(p.y + 1.1 - uTime * aSpeed, 2.2) - 1.1;',
    '  p.x += p.y * 0.12;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '  gl_PointSize = uSize * uPixelRatio * (0.6 + 0.4 * aSeed);',
    '  vAlpha = 0.2 + 0.45 * aSeed;',
    '}'
  ].join('\n');

  var FRAGMENT_SHADER = [
    'varying float vAlpha;',
    'void main() {',
    '  vec2 c = gl_PointCoord - vec2(0.5);',
    '  float streak = 1.0 - smoothstep(0.0, 0.05, abs(c.x - c.y * 0.12));',
    '  float taper = 1.0 - smoothstep(0.1, 0.5, abs(c.y));',
    '  float a = vAlpha * streak * taper;',
    '  if (a < 0.01) discard;',
    '  gl_FragColor = vec4(0.78, 0.84, 0.95, a);',
    '}'
  ].join('\n');

  var WebGLView = Backbone.View.extend({
    initialize: function (options) {
      this.vent = options.vent;
      this.running = false;
      this.time = 0;
      this.mode = window.FLIGHT.webgl ? 'webgl' : (window.FLIGHT.features.canvas ? '2d' : 'none');
      this.tick = _.bind(this.tick, this);
      this.onResize = _.debounce(_.bind(this.resize, this), 150);
      this.listenTo(this.vent, 'device:change', this.onDeviceChange);
    },

    render: function () {
      if (this.mode === 'none') { return this; }
      this.createCanvas();
      if (this.mode === 'webgl') { this.trySetupWebGL(); }
      if (this.mode === '2d') { this.setup2D(); }
      window.addEventListener('resize', this.onResize);
      this.resize();
      return this;
    },

    createCanvas: function () {
      if (this.canvas) { this.el.removeChild(this.canvas); }
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'fx-canvas';
      this.el.appendChild(this.canvas);
    },

    count: function () {
      return Math.round(BASE_COUNT * device.effectDensity());
    },

    trySetupWebGL: function () {
      try {
        this.setupWebGL();
      } catch (e) {
        window.console.warn('[fx] WebGL setup failed, using 2D fallback:', e && e.message);
        this.disposeWebGL();
        this.mode = '2d';
        this.createCanvas();
      }
    },

    setupWebGL: function () {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, alpha: true, antialias: false, powerPreference: 'low-power'
      });
      this.renderer.setPixelRatio(device.pixelRatio(DPR_CAP));
      this.renderer.setClearColor(0x000000, 0);
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
      this.camera.position.z = 1;
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: DROP_SIZE },
          uPixelRatio: { value: this.renderer.getPixelRatio() }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        depthTest: false
      });
      this.points = new THREE.Points(this.buildGeometry(this.count()), this.material);
      this.points.frustumCulled = false;
      this.scene.add(this.points);
      this.canvas.addEventListener('webglcontextlost', _.bind(this.onContextLost, this));
    },

    buildGeometry: function (n) {
      var positions = new Float32Array(n * 3);
      var speeds = new Float32Array(n);
      var seeds = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        positions[i * 3] = Math.random() * 2.4 - 1.2;
        positions[i * 3 + 1] = Math.random() * 2.2 - 1.1;
        speeds[i] = 0.9 + Math.random() * 0.9;
        seeds[i] = Math.random();
      }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
      geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      return geometry;
    },

    setup2D: function () {
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) { this.mode = 'none'; return; }
      this.drops = this.buildDrops(Math.round(this.count() * FALLBACK_SHARE));
    },

    buildDrops: function (n) {
      return _.times(n, function () {
        return { x: Math.random() * 1.2 - 0.1, y: Math.random(), len: 0.02 + Math.random() * 0.03, speed: 0.9 + Math.random() * 0.9 };
      });
    },

    resize: function () {
      var w = this.el.clientWidth;
      var h = this.el.clientHeight;
      if (!w || !h || this.mode === 'none') { return; }
      if (this.mode === 'webgl') {
        this.renderer.setSize(w, h, false);
      } else {
        var dpr = device.pixelRatio(DPR_CAP);
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.size = { w: w, h: h };
      }
      if (!this.running) { this.draw(0); }
    },

    start: function () {
      if (this.running || this.mode === 'none') { return; }
      this.resize(); // render() may run before the element is attached (0x0)
      this.running = true;
      this.last = null;
      this.el.classList.add('is-running');
      this.raf = window.requestAnimationFrame(this.tick);
    },

    stop: function () {
      this.running = false;
      this.el.classList.remove('is-running');
      window.cancelAnimationFrame(this.raf);
    },

    tick: function (now) {
      if (!this.running) { return; }
      var dt = this.last === null ? 0 : Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      if (!document.hidden) { this.draw(dt); }
      this.raf = window.requestAnimationFrame(this.tick);
    },

    draw: function (dt) {
      this.time += dt;
      if (this.mode === 'webgl') { this.drawWebGL(); } else if (this.mode === '2d' && this.size) { this.draw2D(dt); }
    },

    drawWebGL: function () {
      this.material.uniforms.uTime.value = this.time;
      this.renderer.render(this.scene, this.camera);
    },

    draw2D: function (dt) {
      var ctx = this.ctx;
      var w = this.size.w;
      var h = this.size.h;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(200, 215, 240, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      _.each(this.drops, function (d) {
        d.y += d.speed * dt;
        if (d.y > 1) { d.y = -d.len; d.x = Math.random() * 1.2 - 0.1; }
        ctx.moveTo(d.x * w, d.y * h);
        ctx.lineTo(d.x * w - d.len * h * 0.12, (d.y + d.len) * h);
      });
      ctx.stroke();
    },

    onDeviceChange: function (state, prev) {
      if (state.type === prev.type) { return; }
      if (this.mode === 'webgl') {
        this.points.geometry.dispose();
        this.points.geometry = this.buildGeometry(this.count());
      } else if (this.mode === '2d') {
        this.drops = this.buildDrops(Math.round(this.count() * FALLBACK_SHARE));
      }
    },

    onContextLost: function (e) {
      e.preventDefault();
      this.stop();
      this.mode = 'none';
    },

    disposeWebGL: function () {
      if (this.points) { this.points.geometry.dispose(); }
      if (this.material) { this.material.dispose(); }
      if (this.renderer) { this.renderer.dispose(); }
      this.points = this.material = this.renderer = null;
    },

    remove: function () {
      this.stop();
      window.removeEventListener('resize', this.onResize);
      this.disposeWebGL();
      return Backbone.View.prototype.remove.call(this);
    }
  });

  return WebGLView;
});
