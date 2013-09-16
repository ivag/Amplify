/**
 * jQuery mousewheel plugin
**/
;(function(){
  var toFix = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'];
  var toBind = 'onwheel' in document || document.documentMode >= 9 ? ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'];
  var lowestDelta, lowestDeltaXY;

  if ($.event.fixHooks) {
    for ( var i = toFix.length; i; ) {
      $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
    }
  }

  $.event.special.mousewheel = {
    setup: function() {
      if ( this.addEventListener ) {
        for ( var i = toBind.length; i; ) {
          this.addEventListener( toBind[--i], handler, false );
        }
      } else {
        this.onmousewheel = handler;
      }
    },

    teardown: function() {
      if ( this.removeEventListener ) {
        for ( var i = toBind.length; i; ) {
          this.removeEventListener( toBind[--i], handler, false );
        }
      } else {
        this.onmousewheel = null;
      }
    }
  };

  function handler(event) {
    var orgEvent = event || window.event,
        args = [].slice.call(arguments, 1),
        delta = 0,
        deltaX = 0,
        deltaY = 0,
        absDelta = 0,
        absDeltaXY = 0,
        fn;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";

    // Old school scrollwheel delta
    if ( orgEvent.wheelDelta ) { 
      delta = orgEvent.wheelDelta; 
    }
    if ( orgEvent.detail ) { 
      delta = orgEvent.detail * -1; 
    }

    // New school wheel delta (wheel event)
    if ( orgEvent.deltaY ) {
      deltaY = orgEvent.deltaY * -1;
      delta  = deltaY;
    }
    if ( orgEvent.deltaX ) {
      deltaX = orgEvent.deltaX;
      delta  = deltaX * -1;
    }

    // Webkit
    if ( orgEvent.wheelDeltaY !== undefined ) { 
      deltaY = orgEvent.wheelDeltaY; 
    }
    if ( orgEvent.wheelDeltaX !== undefined ) { 
      deltaX = orgEvent.wheelDeltaX * -1; 
    }

    // Look for lowest delta to normalize the delta values
    absDelta = Math.abs(delta);
    if ( !lowestDelta || absDelta < lowestDelta ) { 
      lowestDelta = absDelta; 
    }
    absDeltaXY = Math.max(Math.abs(deltaY), Math.abs(deltaX));
    if ( !lowestDeltaXY || absDeltaXY < lowestDeltaXY ) { 
      lowestDeltaXY = absDeltaXY; 
    }

    // Get a whole value for the deltas
    fn = delta > 0 ? 'floor' : 'ceil';
    delta  = Math[fn](delta / lowestDelta);
    deltaX = Math[fn](deltaX / lowestDeltaXY);
    deltaY = Math[fn](deltaY / lowestDeltaXY);

    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);
    return ($.event.dispatch || $.event.handle).apply(this, args);
  }
})();

/**
 * Scrollable panel view
**/
(function(){
  // Shortcuts
  var Control = Amp.controls.control;
  var max     = Math.max;
  var min     = Math.min;
  var round   = Math.round;
  
  /**
   * A scrollable panel helper.
   * This is a helper used by lists and grids.
  **/
  var panel_template = _.template("\
<div class='amp-panel'>\
  <div class='amp-wrapper'>\
    <div class='amp-content'></div>\
  </div>\
  <div class='amp-scrollbar-v'><div class='amp-thumb-v'></div></div>\
  <div class='amp-scrollbar-h'><div class='amp-thumb-h'></div></div>\
</div>");

  function Panel(element, options) {    
    options || (options = {});

    // Inherits from Control
    Control.call(this, $(panel_template()), options);

    this.wrapper = this.element.find('.amp-wrapper');
    this.content = this.wrapper.find('.amp-content');

    this.vbar    = this.element.find('.amp-scrollbar-v');
    this.vthumb  = this.element.find('.amp-thumb-v');

    this.hbar    = this.element.find('.amp-scrollbar-h');
    this.hthumb  = this.element.find('.amp-thumb-h');

    options.component && this.element.addClass('component');
  }

  Panel.prototype = {
    /**
     * Recalculates some variables needed for scrolling. Also sets scrollbar thumb height.
     * Needs to be called everytime the panel contents change.
     * Performance:
     *  Chrome 28 - Macbook Pro 2.4 GHz - method takes 0.55 ms
    **/
    calc: function(options){
      options || (options = {});
      options.vbar && this.vbar.css(options.vbar);
      
      // Height of the content div, including margins
      this.__contentH = this.content.outerHeight(true);
      // Width of the content div, including margins
      this.__contentW = this.content.outerWidth(true);
      // Height of the area inside the wrapper div
      this.__wrapperH = this.wrapper.innerHeight();
      // Height of the vertical scrollbar
      this.__vbarH = this.vbar.height();
      // Maximum top value. This is the height of the invisible part of the content
      this.__maxTop = max(this.__contentH - this.__wrapperH, 0);
      // Ratio of wrapper/content
      var ratio = min(this.__wrapperH / this.__contentH, 1);

      // If the ratio is 1, then the content fits the wrapper, and we disable the scrollbar
      if( ratio === 1 ) {
        this.vbar.css('visibility', 'hidden');
        return;
      }
      else {
        this.vbar.css('visibility', '');
      }

      // The size of the scroll thumb. Can't be less than 15 pixels
      this.__vthumbH = max(this.__vbarH * ratio, 15);
      // Top position of the vertical scroll thumb. 
      // The available scrollspace on the vertical scrollbar is its height minus the thumb height
      this.vthumb.css({ height: this.__vthumbH, top: 0 });

      // Cache the top offset to avoid forced layouts by the rendering engine
      this.content.css('top', this.__contentTop = 0);
    },

    scroll: function(axis, delta) {
      if( this.__locked ) {
        return;
      }
      // The `delta` argument tells us how many pixels we've moved the scroll thumb
      // The `scrolldelta` tells us how many pixels we should move the content inside the wrapper      
      this.scrollTo(axis, min(max(round(this.__contentTop + this.__maxTop * delta / (this.__vbarH - this.__vthumbH)), 0), this.__maxTop));
    },
    
    wheelscroll: function(axis, delta){
      if( this.__locked ) {
        return;
      }
      this.scrollTo(axis, min(max(this.__contentTop - delta, 0), this.__maxTop));
    },
    
    jump: function(axis, position) {
      if( this.__locked ) {
        return;
      }
      this.scrollTo(axis, (position - this.__vthumbH / 2) / this.__vbarH * this.__contentH, true);
    },

    scrollTo: function(axis, scrolltop, animate) {
      if(axis === 'v') {
        this.__contentTop = min(max(scrolltop, 0), this.__maxTop);
        
        this.content.stop(true);
        this.vthumb.css({ top: round(this.__contentTop / this.__maxTop * (this.__vbarH - this.__vthumbH)) });
        
        if(animate) {
          this.content.animate({ top: -this.__contentTop }, 100);
        }
        else {
          this.content.css({ top: -this.__contentTop });  
        }
      }
      this.parent && this.parent.trigger('panel:scrollto', scrolltop);
    },

    beginScroll: function() {
      $(document.body).addClass('amp-unselectable');
      this.element.addClass('scrolling');
    },

    endScroll: function() {
      $(document.body).removeClass('amp-unselectable');
      this.element.removeClass('scrolling');
    },
    
    // Prevent the panel from scrolling
    lock: function(){
      this.__locked = true;
      this.vbar.hide();
      this.hbar.hide();
    },

    // Allows the panel to scroll
    unlock: function(){
      this.__locked = false;
      this.vbar.show();
      this.hbar.show();
    }
  }
  
  // Attach DOM events for the scrollable panel
  $(function(){
    var hovered  = null;  // Currently hovered panel
    var scrolled = null;  // Currently scrolled panel
    var startpos = null;  // The e.pageX or e.pageY of the last pointer positon
    var axis     = null;  // The orientation of the scroll (h or v), depends on which scrollbar was clicked

    $(document).delegate('.amp-panel', {
      mouseenter: function(e) {
        hovered = $(this).amp();
        hovered && hovered.parent && hovered.parent.trigger('panel:mouseenter', e);
      },

      mouseleave: function(e) {
        hovered && hovered.parent && hovered.parent.trigger('panel:mouseleave', e);
        hovered = null;
      },

      mouseup: function(e){
        hovered && hovered.parent && hovered.parent.trigger('panel:mouseup', e);
      },
      
      mousedown: function(e){
        if(e.which !== 1) {
          return;
        }

        hovered && hovered.parent && hovered.parent.trigger('panel:mousedown', e);
        
        if(e.target.className === 'amp-thumb-v') {
          axis     = 'v';
          startpos = e.pageY;
          scrolled = hovered;
          if(!hovered.unmute || !hovered.unmute(e.target)) {
            e.preventDefault();
          }
        }
        else if(e.target.className === 'amp-thumb-h') {
          axis     = 'h';
          startpos = e.pageX;
          scrolled = hovered;
          if(!hovered.unmute || !hovered.unmute(e.target)) {
            e.preventDefault();
          }
        }
        // Clicking on a scrollbar should take you to that part of the screen
        if(e.target.className === 'amp-scrollbar-v') {
          hovered && hovered.jump('v', e.pageY - $(e.target).offset().top);
          axis     = 'v';
          startpos = e.pageY;
          scrolled = hovered;
          
          // This event can trigger blurring of other elements.
          // We want to handle that ourselves through the panel:mousedown event.
          // The mute function can be set for special control of the default behaviour.
          if(!hovered.unmute || !hovered.unmute(e.target)) {
            e.preventDefault();
          }
        }
      },
            
      mousewheel: function(e, delta, deltaX, deltaY) {
        hovered && hovered.wheelscroll('v', deltaY);
        e.preventDefault();
      }
    }).on({ 
      mousemove: function(e){
        var pos, delta;

        if(scrolled) {
          e.preventDefault();
          
          pos = axis === 'v' ? e.pageY : e.pageX;
          delta = pos - startpos;
          startpos += delta;
        
          if(delta) {
            scrolled.beginScroll();
            scrolled.scroll(axis, delta);
          }
        }
      },
      mouseup: function(e){
        scrolled && scrolled.endScroll();
        scrolled = startpos = axis = null;
      }
    });
  });
  
  Amp.controls.panel = Panel;
})();