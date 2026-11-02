/*
 * views/chapterNavView.js — chapter strip and sound toggle.
 *
 * Responsibility: a black brush-stroke strip on the right edge with one
 * hand-lettered number per chapter (current = white; click -> "nav:chapter" so
 * the router updates the hash and scrolls) and the global mute toggle. Hidden
 * until "story:begin".
 */
define([
  'jquery', 'underscore', 'backbone', 'services/audio'
], function ($, _, Backbone, audio) {
  'use strict';

  var template = _.template([
    '<nav class="chapter-nav" aria-label="Chapters">',
    // Brush stroke: dry-brush halo + solid core, stretched to the strip's height.
    '  <svg class="chapter-nav__stroke" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">',
    '    <defs>',
    '      <filter id="nav-brush" x="-20%" y="-5%" width="140%" height="110%">',
    '        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.014" numOctaves="3" seed="4"/>',
    '        <feDisplacementMap in="SourceGraphic" scale="12" xChannelSelector="R" yChannelSelector="G"/>',
    '      </filter>',
    '      <filter id="nav-dry" x="-20%" y="-5%" width="140%" height="110%">',
    '        <feTurbulence type="fractalNoise" baseFrequency="0.09 0.03" numOctaves="2" seed="9" result="n"/>',
    '        <feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" result="d"/>',
    '        <feComponentTransfer in="n" result="mask"><feFuncA type="discrete" tableValues="0 0 1 1 1"/></feComponentTransfer>',
    '        <feComposite in="d" in2="mask" operator="in"/>',
    '      </filter>',
    '    </defs>',
    '    <path class="chapter-nav__halo" filter="url(#nav-dry)" d="M130 0 L70 3 L38 14 L16 40 L14.0 60.0 L13.6 78.5 L13.4 97.0 L10.3 115.5 L8.6 134.0 L7.2 152.6 L4.8 171.1 L5.2 189.6 L5.6 208.1 L6.4 226.6 L4.9 245.1 L6.0 263.6 L5.5 282.1 L7.4 300.6 L6.3 319.1 L3.4 337.7 L5.2 356.2 L4.4 374.7 L3.2 393.2 L3.5 411.7 L3.3 430.2 L4.5 448.7 L8.0 467.2 L8.5 485.7 L10.4 504.3 L11.6 522.8 L11.3 541.3 L12.4 559.8 L11.6 578.3 L11.9 596.8 L10.1 615.3 L10.0 633.8 L9.6 652.3 L10.4 670.9 L10.4 689.4 L10.5 707.9 L13.0 726.4 L12.9 744.9 L11.7 763.4 L10.0 781.9 L7.1 800.4 L4.9 818.9 L3.4 837.4 L1.4 856.0 L2.9 874.5 L1.9 893.0 L3.9 911.5 L3.7 930.0 L14 958 L36 982 L70 995 L130 1000 Z"/>',
    '    <path filter="url(#nav-brush)" d="M130 5 L70 8 L38 19 L22 45 L20.7 60.0 L19.8 78.5 L16.1 97.0 L15.2 115.5 L15.7 134.0 L13.0 152.6 L13.5 171.1 L11.2 189.6 L10.2 208.1 L12.2 226.6 L13.2 245.1 L12.1 263.6 L11.6 282.1 L12.1 300.6 L13.4 319.1 L11.9 337.7 L9.1 356.2 L8.9 374.7 L8.2 393.2 L8.5 411.7 L11.7 430.2 L11.2 448.7 L14.1 467.2 L15.4 485.7 L16.0 504.3 L18.5 522.8 L17.0 541.3 L18.3 559.8 L16.1 578.3 L16.3 596.8 L15.0 615.3 L14.7 633.8 L16.8 652.3 L16.6 670.9 L15.6 689.4 L17.9 707.9 L16.2 726.4 L16.7 744.9 L17.4 763.4 L15.6 781.9 L12.5 800.4 L13.5 818.9 L9.7 837.4 L8.7 856.0 L9.6 874.5 L8.4 893.0 L8.9 911.5 L9.2 930.0 L20 953 L36 977 L70 990 L130 995 Z"/>',
    '  </svg>',
    '  <ol class="chapter-nav__list">',
    '  <% _.each(chapters, function (c, i) { %>',
    '    <li><button type="button" class="chapter-num" data-chapter="<%- c.id %>" aria-label="<%- (i + 1) + ". " + c.title %>">',
    '      <span aria-hidden="true"><%- i + 1 %></span>',
    '      <span class="chapter-num__label" aria-hidden="true"><%- c.title %></span>',
    '    </button></li>',
    '  <% }); %>',
    '  </ol>',
    '</nav>',
    '<div class="controls">',
    '  <% if (hasAudio) { %>',
    '  <button type="button" class="btn btn--ghost js-mute" aria-pressed="false">Sound on</button>',
    '  <% } %>',
    '</div>'
  ].join('\n'));

  var ChapterNavView = Backbone.View.extend({
    events: {
      'click .chapter-num': 'onNumClick',
      'click .js-mute': 'onMuteClick'
    },

    initialize: function (options) {
      this.vent = options.vent;
      this.story = options.story;
      this.listenTo(this.vent, 'chapter:change', this.setChapter);
      this.listenTo(this.vent, 'audio:mute', this.setMuted);
      this.listenTo(this.vent, 'story:begin', this.show);
    },

    render: function () {
      this.$el.addClass('ui-hidden').html(template({
        chapters: this.story.get('chapters'),
        hasAudio: window.FLIGHT.features.audio
      }));
      this.$nums = this.$('.chapter-num');
      this.setMuted(audio.isMuted());
      return this;
    },

    show: function () {
      this.$el.removeClass('ui-hidden');
    },

    setChapter: function (id) {
      this.$nums.each(function (i, dot) {
        var current = dot.getAttribute('data-chapter') === id;
        dot.classList.toggle('is-current', current);
        if (current) { dot.setAttribute('aria-current', 'step'); } else { dot.removeAttribute('aria-current'); }
      });
    },

    setMuted: function (muted) {
      this.$('.js-mute')
        .attr('aria-pressed', String(muted))
        .text(muted ? 'Muted' : 'Sound on');
    },

    onNumClick: function (e) {
      this.vent.trigger('nav:chapter', e.currentTarget.getAttribute('data-chapter'));
    },

    onMuteClick: function () {
      this.vent.trigger('audio:toggle');
    }
  });

  return ChapterNavView;
});
