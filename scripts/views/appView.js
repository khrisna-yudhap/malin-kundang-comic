/*
 * views/appView.js — owns #app-container and every SceneView.
 *
 * Responsibility: render all scenes, preload images (first N for the preloader,
 * then current + one ahead as the reader moves), track the current scene and
 * chapter ("chapter:change"), and perform chapter jumps / back-to-start.
 * Jumps requested before Begin are remembered and applied in start().
 */
define([
  'jquery', 'underscore', 'backbone', 'services/anim', 'services/scroll', 'views/sceneView'
], function ($, _, Backbone, anim, scroll, SceneView) {
  'use strict';

  var AppView = Backbone.View.extend({
    initialize: function (options) {
      this.vent = options.vent;
      this.sceneViews = [];
      this.started = false;
      this.currentChapter = null;
      this.pendingChapter = null;
      this.listenTo(this.vent, 'scene:enter', this.onSceneEnter);
      this.listenTo(this.vent, 'chapter:goto', this.goToChapter);
      this.listenTo(this.vent, 'story:home', this.goHome);
    },

    render: function () {
      var frag = document.createDocumentFragment();
      this.sceneViews = this.collection.map(function (scene) {
        var view = new SceneView({ model: scene, vent: this.vent });
        frag.appendChild(view.render().el);
        return view;
      }, this);
      this.$el.empty().append(frag);
      _.invoke(this.sceneViews, 'setupScroll');
      return this;
    },

    // Aggregate progress (0..1) of scenes [from, from + count).
    preload: function (from, count) {
      var d = $.Deferred();
      var views = this.sceneViews.slice(from, from + count);
      var state = _.map(views, function () { return { loaded: 0, total: 0 }; });
      var report = function () {
        var loaded = _.reduce(state, function (sum, s) { return sum + s.loaded; }, 0);
        var total = _.reduce(state, function (sum, s) { return sum + s.total; }, 0);
        d.notify(total ? loaded / total : 1);
      };
      var promises = _.map(views, function (view, i) {
        return view.preload().progress(function (loaded, total) {
          state[i] = { loaded: loaded, total: total };
          report();
        });
      });
      $.when.apply($, promises).always(function () { d.resolve(); });
      return d.promise();
    },

    preloadAround: function (index) {
      _.each([index, index + 1], function (i) {
        if (this.sceneViews[i]) { this.sceneViews[i].preload(); }
      }, this);
    },

    start: function () {
      this.started = true;
      if (this.pendingChapter) {
        this.goToChapter(this.pendingChapter, { instant: true });
        this.pendingChapter = null;
      }
      anim.ScrollTrigger.update();
      _.invoke(this.sceneViews, 'syncActive');
    },

    onSceneEnter: function (scene) {
      this.preloadAround(scene.get('index'));
      var chapter = scene.get('chapter');
      if (chapter !== this.currentChapter) {
        this.currentChapter = chapter;
        this.vent.trigger('chapter:change', chapter);
      }
    },

    goToChapter: function (id, opts) {
      if (!this.started) { this.pendingChapter = id; return; }
      var view = _.find(this.sceneViews, function (v) { return v.model.get('chapter') === id; });
      if (!view) { return; }
      this.preloadAround(view.model.get('index'));
      scroll.toElement(view.el, opts);
    },

    goHome: function () {
      if (!this.started) { this.pendingChapter = null; return; }
      scroll.toY(0);
      this.el.focus({ preventScroll: true });
    }
  });

  return AppView;
});
