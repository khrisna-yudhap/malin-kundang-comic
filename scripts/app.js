/*
 * app.js — App singleton.
 *
 * Responsibility: own the global event bus, fetch the story manifest, create
 * services, views and the router, and run the "Begin" gate (which must happen
 * inside the click so audio can be unlocked).
 *
 * Event bus (App.vent) — main events:
 *   device:change (state, prev)     services/device
 *   scene:enter / scene:leave (scene) views/sceneView
 *   chapter:change (chapterId)      views/appView
 *   chapter:goto (chapterId)        router -> appView
 *   nav:chapter (chapterId)         chapterNavView -> router
 *   story:home                      router -> appView
 *   preloader:begin                 preloaderView -> app (audio unlock, inside the click)
 *   preloader:done / story:begin    preloaderView -> app -> everyone (intro faded out)
 *   scroll:progress (0..1)          services/scroll
 *   audio:toggle, audio:mute (bool) services/audio
 */
define([
  'jquery', 'underscore', 'backbone',
  'models/story',
  'services/device', 'services/scroll', 'services/audio',
  'router',
  'views/appView', 'views/preloaderView', 'views/chapterNavView', 'views/titleView'
], function ($, _, Backbone, Story, device, scroll, audio, Router,
  AppView, PreloaderView, ChapterNavView, TitleView) {
  'use strict';

  var PRELOAD_SCENES = 2;

  var App = {
    vent: _.extend({}, Backbone.Events),
    flight: window.FLIGHT,
    story: null,
    router: null,
    views: {},

    init: function () {
      device.init(this.vent, this.flight);
      scroll.init(this.vent, this.flight);
      scroll.lock();
      this.story = new Story();
      if (window.STORY_DATA || window.location.protocol === 'file:') {
        this.story.fetch();
        this.onStoryLoaded();
        return;
      }
      this.story.fetch()
        .done(_.bind(this.onStoryLoaded, this))
        .fail(_.bind(this.onStoryFailed, this));
    },

    onStoryLoaded: function () {
      audio.init(this.vent, this.flight);
      audio.prepare(this.story.scenes);
      this.router = new Router({ vent: this.vent, story: this.story });
      this.buildViews();
      this.vent.once('preloader:begin', this.unlockAudio, this);
      this.vent.once('preloader:done', this.begin, this);
      this.views.preloader.track(this.views.app.preload(0, PRELOAD_SCENES));
      Backbone.history.start();
    },

    onStoryFailed: function (xhr) {
      this.flight.fail('Could not load the story',
        'scripts/data/story.json failed to load (' + (xhr && xhr.status) + '). Check that the file exists and is valid JSON.');
    },

    buildViews: function () {
      var opts = { vent: this.vent, story: this.story };
      this.views.app = new AppView(_.extend({ el: '#app-container', collection: this.story.scenes }, opts)).render();
      this.views.nav = new ChapterNavView(_.extend({ el: '#chapter-nav-container' }, opts)).render();
      this.views.title = new TitleView(_.extend({ el: '#title-container' }, opts)).render();
      this.views.preloader = new PreloaderView(_.extend({ el: '#preloader-container' }, opts)).render();
    },

    // Runs synchronously inside the start click: AudioContext + media elements
    // need the user gesture.
    unlockAudio: function () {
      audio.unlock();
    },

    // Runs when the intro has faded out.
    begin: function () {
      var self = this;
      this.views.app.start();     // honour a pending deep link, sync the active scene
      this.vent.trigger('story:begin');

      // Keep scrolling locked for 4.5s so the opening title card and thunderstorm
      // are experienced before the reader scrolls (unless reducedMotion or deep-linked).
      var delay = (this.flight.reducedMotion || this.views.app.pendingChapter) ? 0 : 1500;
      if (delay > 0) {
        this.unlockTimer = setTimeout(function () {
          self.unlockTimer = null;
          scroll.unlock();
        }, delay);
        var cancelHold = function () {
          if (self.unlockTimer) {
            clearTimeout(self.unlockTimer);
            self.unlockTimer = null;
            scroll.unlock();
          }
        };
        this.vent.once('chapter:goto', cancelHold);
        this.vent.once('story:home', cancelHold);
      } else {
        scroll.unlock();
      }
    }
  };

  return App;
});
