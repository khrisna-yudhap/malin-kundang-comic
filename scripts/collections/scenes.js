/*
 * collections/scenes.js — ordered list of Scene models.
 *
 * Responsibility: keep scenes in story.json order, stamp each with its index,
 * and answer chapter lookups.
 */
define(['underscore', 'backbone', 'models/scene'], function (_, Backbone, Scene) {
  'use strict';

  var Scenes = Backbone.Collection.extend({
    model: Scene,

    initialize: function () {
      this.on('reset', this.stampIndexes, this);
    },

    stampIndexes: function () {
      this.each(function (scene, i) { scene.set('index', i); });
    },

    chapterIds: function () {
      return _.uniq(this.pluck('chapter'));
    },

    firstOfChapter: function (chapterId) {
      return this.findWhere({ chapter: chapterId });
    }
  });

  return Scenes;
});
