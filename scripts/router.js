/*
 * router.js — Backbone.Router for deep links.
 *
 * Responsibility: map #/chapter/:id to "chapter:goto" on the event bus, and keep
 * the URL hash in sync with the chapter being read. URLs are written as
 * "#/chapter/<id>" (Backbone itself would write "#chapter/<id>"; both parse).
 * Scroll-driven chapter changes replace the history entry; dot clicks push one.
 */
define(['underscore', 'backbone'], function (_, Backbone) {
  'use strict';

  var Router = Backbone.Router.extend({
    routes: {
      'chapter/:id': 'chapter',
      '*default': 'home'
    },

    initialize: function (options) {
      this.vent = options.vent;
      this.chapterIds = _.pluck(options.story.get('chapters'), 'id');
      this.active = false;
      this.listenTo(this.vent, 'story:begin', function () { this.active = true; });
      this.listenTo(this.vent, 'chapter:change', this.onChapterChange);
      this.listenTo(this.vent, 'nav:chapter', this.showChapter);
    },

    chapter: function (id) {
      if (_.contains(this.chapterIds, id)) {
        this.vent.trigger('chapter:goto', id);
      } else {
        this.home();
      }
    },

    home: function () {
      this.vent.trigger('story:home');
    },

    showChapter: function (id) {
      this.setUrl('#/chapter/' + id, 'chapter/' + id, false);
      this.vent.trigger('chapter:goto', id);
    },

    onChapterChange: function (id) {
      if (this.active) { this.setUrl('#/chapter/' + id, 'chapter/' + id, true); }
    },

    // Update the address bar without re-running the route handler.
    setUrl: function (url, fragment, replace) {
      if (Backbone.history.fragment === fragment) { return; }
      Backbone.history.fragment = fragment;
      if (window.history && window.history.pushState) {
        window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
      } else {
        window.location.replace(url);
      }
    }
  });

  return Router;
});
