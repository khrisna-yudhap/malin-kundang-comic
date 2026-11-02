/*
 * models/story.js — the story manifest (scripts/data/story.json).
 *
 * Responsibility: fetch the manifest, split it into story-level attributes
 * (title, chapters) and a Scenes collection, and make sure
 * every chapter referenced by a scene has an entry.
 */
define(['underscore', 'backbone', 'collections/scenes'], function (_, Backbone, Scenes) {
  'use strict';

  var Story = Backbone.Model.extend({
    // DEV_STAMP (main.js) busts the browser cache on localhost so edits show up.
    url: function () {
      return 'scripts/data/story.json' + (window.DEV_STAMP ? '?' + window.DEV_STAMP : '');
    },

    defaults: function () {
      return { title: '', subtitle: '', chapters: [] };
    },

    initialize: function () {
      this.scenes = this.scenes || new Scenes();
    },

    fetch: function (options) {
      if (window.STORY_DATA || window.location.protocol === 'file:') {
        var data = window.STORY_DATA || {};
        var parsed = this.parse(data);
        this.set(parsed);
        if (options && typeof options.success === 'function') {
          options.success(this, data, options);
        }
        var $ = Backbone.$ || window.jQuery || window.$;
        if ($ && $.Deferred) {
          var d = $.Deferred();
          d.resolve(data);
          return d.promise();
        }
        return {
          done: function (fn) { fn(data); return this; },
          fail: function () { return this; }
        };
      }
      return Backbone.Model.prototype.fetch.apply(this, arguments);
    },

    parse: function (resp) {
      this.scenes = this.scenes || new Scenes();
      this.scenes.reset(resp.scenes || [], { parse: true });
      return _.extend(_.omit(resp, 'scenes'), {
        chapters: this.normaliseChapters(resp.chapters || [])
      });
    },

    // Keep declared chapter order, drop chapters with no scenes, add missing ones.
    normaliseChapters: function (declared) {
      var used = this.scenes.chapterIds();
      var known = _.filter(declared, function (c) { return _.contains(used, c.id); });
      var knownIds = _.pluck(known, 'id');
      var missing = _.map(_.difference(used, knownIds), function (id) { return { id: id, title: id }; });
      return known.concat(missing);
    }
  });

  return Story;
});
