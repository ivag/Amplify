/**
 * Amp List Widgets.
 *
 * Used as a standalone list and 
 * a part of the Select and Combo controls.
**/
;(function(){
  var Control = Amp.controls.control;
  var Button = Amp.controls.button;
  var Panel = Amp.controls.panel;
  
  /**
   * A generic list.
   * This is an abstract class.
  **/
  function List(element, options){
    Control.call(this, element, options);
    
    // Take care of options
    this.__op_validators(options.validators);
    this.__op_multiple(options.multiple);
    this.__op_nullable(options.nullable);
    
    // Setup generic properties
    this.items     = this.__normalize_items(options.items);
    this.selection = this.__normalize_selection(options.value);
  }

  List.prototype = _.extend({}, Control.prototype, {
    super: Control.prototype,

    __op_multiple: function(multiple){
      this.options.multiple = !!multiple;
    },

    __op_nullable: function(nullable){
      this.options.nullable = !!nullable;
    },
    
    /**
     * Normalizes a selection array.
     * It will always return an array containing only valid indices
     * of items that are part of the list.
     * The input should be an index (integer), an item's value (string) or 
     * an array containing a mix of values and/or indices.
     *
     *  Examples:  
         list.items = [ {value: "MK", label: "Macedonia"}, { value: "IT", label: "Italy" }, { value: "US", label: "America"} ];
         list.__normalize_selection(["MK", "IT"])  => ["MK", "IT"]
         list.__normalize_selection(["FR", "UK"])  => []
         list.__normalize_selection([0, "US"])     => ["MK", "US"]
         list.__normalize_selection(["US", "MK"])  => ["MK", "US"]
         list.__normalize_selection(2)             => ["US"]
         list.__normalize_selection("US")          => ["US"]
         list.__normalize_selection(null)          => []
     *
    **/
    __normalize_selection: function(selection) {
      var i, j, c, item, sitem;
      
      selection = (typeof selection !== 'number' && !selection) ? [] : _.isArray(selection) ? selection : [selection];
      selection = _.uniq(selection.sort(), true);

      i=0;
      while(sitem = selection[i++]){
        if(typeof sitem === 'number'){
          if(sitem >= this.items.length || sitem < 0){
            selection.splice(--i, 1);
          }
          continue;
        }
        j = 0;
        c = false;
        while(item = this.items[j++]){
          if(sitem === item.value){
            selection.splice(i-1, 1, j-1);
            c = true;
            break;
          }
        }
        if(c){
          continue;
        }
        selection.splice(--i, 1);
      }

      return _.map(selection.sort(), function(s){ return this.items[s].value }, this);
    },
    
    /**
     * Normalizes a list of items into the following form
     *  [ {value: "MK", label: "Macedonia"}, { value: "IT", label: "Italy" }, { value: "US", label: "America"} ]
     *
     * The 'items' array that is passed must not have duplicate values.
     * All the elements must be either strings, or objects of the type { value: String, label: String }
    **/
    __normalize_items: function(items) {
      var item, i, existing = {};
      
      _.isArray(items) || (items = [items]);
      
      for(i=0; i < items.length; ++i) {
        item = items[i];
        // Invalid item
        if(!item) {
          items.splice(i--, 1);
          continue;
        }
        // String item
        if(typeof item === 'string') {
          // Duplicate
          if(item in existing) {
            items.splice(i--, 1);
          }
          else {
            items.splice(i, 1, { value: item, label: item });
            existing[item] = 1;
          }
          continue;
        }
        // Invalid item
        if(!item.value) {
          items.splice(i--, 1);
          continue;
        }
        // Duplicate
        if(item.value in existing) {
          items.splice(i--, 1);
          continue;
        }
        // Fix missing label
        if(!item.label) {
          item.label = item.value;
        }
        existing[item.value] = 1;
      }
      return items;
    },
    
    /**
     * Returns an array of the selected items
    **/
    getItems: function(){
      return _.filter(this.items, function(item){ return this.selection.indexOf(item.value) > -1; }, this);
    },
    
    /**
     * Returns a list of the selected values
    **/
    getValue: function(){
      return this.selection.slice();
    },

    setValue: function(value, silent, callback){
      var i, j;

      var multiple = this.options.multiple;
      var nullable = this.options.nullable;
      var value    = this.__normalize_selection(value);
      var prevsel  = this.selection;
      var prevval  = this.getValue();

      // For non-multiple lists we discard the rest of the selected items
      if( !multiple ){
        value = value.slice(0,1);
      }
      
      // If the selection is the same as the already selected items, return immediately
      if(value.length !== prevsel.length || _.difference(value, prevsel).length > 0) {
        this.selection = value;
        
        // This is an internal change event that inherited list controls can listen to
        this.trigger('__change', { previous: prevsel, value: this.selection.slice(), callback: callback });
        silent || this.trigger('change', { previous: prevval, value: this.getValue(), callback: callback });
        this.validate();
      }
    },
    
    // Finds the items that contain the passed string, case insensitive.
    // If startswith is true, the item's label needs to begin with the passed string.
    // Returns a list of item indices.
    findByLabel: function(string, startswith){
      var ix, item, i=-1, result = [];

      while(item = this.items[++i]){
        ix = item.label.toLowerCase().indexOf(string);
        if(startswith ? ix === 0 : ~ix){
          result.push(i);
        }
      }

      return result;
    },
    
    // Resets the list with a new item set
    // Fires a `change` event if the list's selection has changed in the process 
    // because the new item set doesn't contain the previous values
    reset: function(items, silent, callback, filtering){
      var old = this.getValue(), prevsel = this.selection;

      this.items     = this.__normalize_items(_.isArray(items) ? items : []);
      this.selection = this.__normalize_selection(old);

      this.trigger('__reset', { previous: prevsel.slice(), value: this.selection.slice(), callback: callback, filtering: filtering });
      
      // NOTE: If `filtering` is true, the Combo will RESTORE the previous value of the selection, 
      //       even if it's not in the items and the __change and change events won't fire
      
      if(prevsel.length !== this.selection.length) {
        this.trigger('__change', { previous: prevsel.slice(), value: this.selection.slice(), callback: callback, filtering: filtering });
      }

      if(!silent) {
        this.trigger('reset', { previous: old, value: this.getValue(), callback: callback });
        
        // If the selections have the same number of elements, some of the old values were lost with the reset.
        // This is guaranteed by __normalize_selection which doesn't allow values that don't exist in the item set.
        if(prevsel.length !== this.selection.length) {
          this.trigger('change', { previous: old, value: this.getValue(), callback: callback });
          this.validate();
        }
      }
    }
  });

  
  /**
   * This is a generic list with a panel
   * It's sublclassed by all other interactable lists
  **/
  function PanelList(element, options){
    var self = this;

    // Inherits from list
    List.call(this, element, options);
    
    // Setup the options
    this.__op_filters(options.filters);
    
    this.__seekstr  = "";
    this.__seektout = 0;
    this.__focused  = null;
    this.__elements = null;

    this.panel = Amp(null, 'panel', { component: options.component });
    this.panel.parent = this;
    this.panel.element.addClass('list');

    // Component panels are absolutely positioned and invisible until requested
    if(options.component) {
      this.panel.element.prependTo( options.component instanceof $ ? options.component : document.body);
    }
    // Non-component panels should be placed directly in the DOM
    else if(element instanceof $){
      this.panel.element.appendTo(element).css('height', '100%').attr('tabindex', 0);
      this.renderContent();
      this.scrollToItem(this.selection[0] || 0, true);
    }
    
    // Listen to panel events
    this.on('panel:mousedown', function(e){
      if($(e.target).is('.panel-list-item')) {
        this.setValue($(e.target).attr('value'));
        this.focusItem(this.selection[0] || 0);
      }
    });
    
    // Listen to internal change events and add/remove "active" classes
    this.on('__change', function(args){
      this.__applySelection(args.previous);
    });
    
    this.on('__reset', function(args){
      options.component || this.renderContent();
      options.component || this.scrollToItem(this.selection[0] || 0, true);
    });
  }
  
  PanelList.prototype = _.extend({}, List.prototype, {
    super: List.prototype,
    
    __op_filters: function(filter){
      if(!_.isFunction(filter)) {
        return;
      }
      else if(filter === null) {
        this.options.filters = null;
      }
      if(!_.isArray(this.options.filters)) {
        this.options.filters = [];
      }
      if(this.options.filters.indexOf(filter) === -1) {
        this.options.filters.push(filter);
      }
    },
    
    // Default item template
    itemTemplate: _.template("<li class='panel-list-item' value='<%= value %>'><%= label %></li>"),
    wrapTemplate: _.template("<ul class='amp panel-list'><%= content %></ul>"),
    
    // Handle keypress events for fast searching
    __handleKeypress: function(key, e){
      var match, self=this;
      
      if(!key || !e){
        return;
      }

      this.__seektout && clearTimeout(this.__seektout);
      this.__seektout = setTimeout(function(){ self.__seekstr = "", self.__seektout = 0; }, 500);
      this.__seekstr += String.fromCharCode(key).toLowerCase();
      
      
      if((match = this.findByLabel(this.__seekstr, true)).length) {
        this.focusItem(match[0]);
        this.scrollToItem(match[0], true);
      }
    },

    // Handles keydown events
    __handleKeydown: function(key, e){
      (this.__focused === null) && (this.__focused = this.selection[0] || 0);

      if(key === Amp.keys.UP) {
        this.focusItem('-');
        this.scrollToItem(this.__focused, true);
        e.preventDefault();
      }
      else if(key === Amp.keys.DOWN) {
        this.focusItem('+');
        this.scrollToItem(this.__focused, true);
        e.preventDefault();
      }
      else if(key === Amp.keys.ENTER) {
        if(this.__focused !== null){
          this.setValue(this.__focused);
        }
      }
    },
    
    // Adds the 'active' classes to the selected elements and removes them from the old selection
    __applySelection: function(previous) {
      if(!this.__elements || !this.__elements.length) {
        return;
      }

      var item, selection = this.selection.slice();
      while((item = this.__elements.filter('[value=' + previous.shift() + ']')).length) {
        item.removeClass('active');
      }
      while((item = this.__elements.filter('[value=' + selection.shift() + ']')).length) {
        item.addClass('active');
      }
    },

    // Scrolls the list to the indexed item.
    scrollToItem: function(index, centered, axis) {
      // The panel's content must have a box with items
      var item = _.isNumber(index) ? this.__elements.eq(index) : this.__elements.filter('[value=' + index + ']');
      if( item.length ) {
        // If centered is passed, we try to set the scrolled-to item at the center of the list
        this.panel.scrollTo(axis || 'v', item.position().top - (+!!centered) * (this.panel.__wrapperH - item.outerHeight(true)) / 2);
      }
    },

    // Focuses on an item
    focusItem: function(index) {
      var item;

      if(!this.__elements || this.__focused === index) {
        return;
      }
      
      // Focus the prevous element
      if(index === '-'){
        item = this.__focused === null ? {} : this.__elements.filter('[value=' + this.__focused + ']').prev();
        index = item.length ? item.attr('value') : this.__elements.last().attr('value');
      }
      // Focus the next element
      else if(index === '+'){
        item = this.__focused === null ? {} : this.__elements.filter('[value=' + this.__focused + ']').next();
        index = item.length ? item.attr('value') : this.__elements.first().attr('value');
      }

      if(this.__focused !== null && (item = this.__elements.filter('[value=' + this.__focused + ']')).length) {
        item.removeClass('focused');
      }
      
      index = _.isNumber(index) ? ((item = this.items[index]) ? index = item.value : null) : index;
      
      if(index === null) {
        this.__focused = null;
        return;
      }
      else if((item = this.__elements.filter('[value=' + index + ']')).length) {
        this.__focused = index;
        item.addClass('focused');
      }
    },
    
    // Render method
    renderContent: function(items){
      items || (items = this.items);

      this.panel.content.html(this.wrapTemplate({ content: items.map(this.itemTemplate).join("") }));

      // The calc() method will be called by the component parent. 
      // We only need it for non-component panels.
      this.options.component || this.panel.calc();

      // A shortcut to the item elements
      this.__elements = this.panel.content.children().children();

      // Add focus classes to the already focused elements
      this.focusItem(this.__focused);
      
      // Apply the selected items' classes
      this.__applySelection([]);
    }
  });



  /**
   * A select (dropdown) list.
   * This is a composite control. It contains instances of other controls and/or views.
   * We expect this to be the most used one.
   *
   * The passed element is usually a button which is used to activate the 
   * dropdown list panel.
  **/
  function Select(element, options) {
    var self = this;
    
    // Dropdowns can have only a single value
    options.multiple = false;
    // The panel in this list is a component
    options.component = true;
    
    if(element instanceof $){
      element.addClass('select');
    }

    // Inherits from List
    PanelList.call(this, element, options);
    
    this.button = Amp(element, 'button', options);
    this.button.parent = this;
    this.__updateView();
    
    this.listenTo(this.button, 'click', function(){
      this.open();
    })
    .on('panel:mousedown', function(e){
      if($(e.target).is('.panel-list-item')) {
        this.close();
      }
    })
    .on('__change', function(){
      setTimeout(function(){
        self.close();
        self.__updateView();
      }, 1);
    })
    .on('__reset', function(args){
      this.__rendered = false;
      this.panel.element.removeAttr('style');
      this.__updateView();
    })
    .on('__blur', function(){
      this.close();
    })
  }

  Select.prototype = _.extend({}, PanelList.prototype, {
    super: PanelList.prototype,

    __handleKeypress: function(key, e) {
      if(this.__open) {
        this.super.__handleKeypress.call(this, key, e);
      }
    },
    
    __handleKeydown: function(key, e){
      // Close list on escape
      if(key === Amp.keys.ESCAPE) {
        this.close();
      }
      // The List __handleKeydown method will handle arrow keys and Enter selection when list is open
      else if(this.__open) {
        this.super.__handleKeydown.call(this, key, e);
      }
      // Open list on return. Also open on space, if not open already
      else if(key === Amp.keys.ENTER || key === Amp.keys.SPACE){
        this.open();
      }
    },

    /**
     * Updates the button element to show the selected value;
    **/
    __updateView: function(){
      var item = this.getItems()[0];
      this.button.element.html("<div>" + (item ? item.label : '&nbsp;') + "</div>");
    },
    
    /**
     * Opens the dropdown list
    **/
    open: function() {
      if( this.__open ) {
        return;
      }
      this.__open = true;

      if( !this.__rendered ) {
        this.__rendered = true;
        this.renderContent();
      }

      var offset    = this.element.offset();
      var top       = offset.top;
      var left      = offset.left;
      var width     = this.element.outerWidth();
      var wScrollT  = $(window).scrollTop();
      var wScrollL  = $(window).scrollLeft();
      var winWidth  = $(window).width();
      var winHeight = $(window).height();

      var contentH  = this.panel.content.outerHeight(true);
      var contentW  = this.panel.content.outerWidth(true);

      var spaceBelow = winHeight + wScrollT - top;  // Distance of button top edge from the window bottom edge
      var spaceAside = winWidth + wScrollL - left;  // Distance of button left edge from the window right edge
      var panelLeft, panelWidth, panelTop, panelHeight;
      
      if(contentH < spaceBelow) {
        panelTop = top;
        panelHeight = contentH;
      }
      else if(contentH < winHeight) {
        panelTop = top - (contentH - spaceBelow);
        panelHeight = contentH;
      }
      else {
        panelTop = wScrollT + 5;
        panelHeight = winHeight - 10;
      }

      if(contentW < spaceAside) {
        panelLeft = left;
        panelWidth = Math.max(contentW, width);
      }
      else if(contentW < winWidth) {
        panelLeft = left - (contentW - spaceAside);
        panelWidth = contentW;
      }
      else {
        panelLeft = wScrollL + 5;
        panelWidth = winWidth - 10;
      }

      this.panel.element.css({ left: panelLeft, width: panelWidth, top: panelTop, height: panelHeight});
      this.panel.element.addClass('shown');
      this.panel.calc();
      this.scrollToItem(this.selection[0] || 0, true);
      this.selection[0] && this.focusItem(this.selection[0]);
      this.trigger('open');
    },
    
    close: function(){
      if(this.__open) {
        this.__open = false;
        this.focusItem(null);
        this.panel.element.removeClass('shown');
        this.trigger('close');
      }
    },
    
    getValue: function(){
      var val = PanelList.prototype.getValue.apply(this);
      return val.length ? val[0] : null;
    }
  });
  
  
  /**
   * Combo lists are like Select lists except that
   * they operate with a huge number of items that are not entirely loaded into memory
  **/
  function Combo(element, options) {
    options.multiple = false;                 // Dropdowns can have only a single value
    options.component = true;                 // The panel in this list is a component

    if(options.items && _.isArray(options.items)) {
      this.ajax = false;
    }
    else if(options.ajax) {
      this.ajax = {                           // This is the ajax configuration.
        q:      options.ajax.q || 'q',        // The url for the handler, the query parameter name and extra parameters that need to be sent.
        v:      options.ajax.v || 'v',
        url:    options.ajax.url,
        extra:  options.ajax.extra || {}
      };
      options.items = [];
    }
    else {
      throw new Error("A Combo element is initialized without an item set and without an ajax configuration.");
    }

    if(element instanceof $){
      element.addClass('combo');
    }

    // Inherits from List
    PanelList.call(this, element, options);

    // Has an input
    this.input = Amp(element, 'text', options);
    this.input.parent = this;
    this.__updateView();

    // Only execute this if the user has stopped typing for 250 ms
    // Check underscore's debounce helper documentation
    this.listenTo(this.input, 'type', _.debounce(function(args){
      this.__handleTyping(args.value);
    }, 250))
    .on('__change', function(args){
      this.__updateView();
    })
    .on('__reset', function(args){
      if(args.filtering) {
        this.selection = args.previous; // Restore the previous value even if it's not in the itemlist anymore
      }
      this.__rendered = false;
      this.panel.element.removeAttr('style');
    })
    .on('__blur', function(){
      this.close();
      
      if(this.options.nullable) {
        var val = this.element.val().replace(/\s+/, "");
        if(val.length === 0 || this.getItems().length === 0) {    // If the field is empty or the selection is empty
          this.setValue(null);                                    
        }
        this.__updateView();
      }
      else if(this.ajax && this.getItems().length === 0) {        // Can't be null, but the selected item is missing, we need to fetch it
        this.__ajaxfill();
      }
      else {                                                      // Can't be null, we just set the input's value back to normal
        this.__updateView();
      }
    })
    .on('panel:mousedown', function(e){
      $(e.target).is('.panel-list-item') && this.close();
    });

    if(this.ajax && this.value) {
      this.selection = [options.value];
      this.__ajaxfill();
    };
  }


  Combo.prototype = _.extend({}, PanelList.prototype, {
    super: PanelList.prototype,
    
    // Initial __seekstr value
    __seekstr: "",
    
    // Masks the inherited keypress handler
    __handleKeypress: function(){},
    
    // Handles typing into the input field
    __handleTyping: function(value) {
      this.__seekstr = (value || "").toLowerCase();
      this.__rendered = false;

      if(this.__seekstr.length > 1){
        this.__open = false;
        this.ajax ? this.__ajaxopen() : this.open();
      }
      else {
        this.close();
      }
    },

    __handleKeydown: function(key, e){
      // Close list on escape
      if(key === Amp.keys.ESCAPE) {
        this.close();
      }
      else if(this.__open) {                                // The List __handleKeydown method will handle arrow keys and Enter selection when list is open
        this.super.__handleKeydown.call(this, key, e);
        if(key === Amp.keys.DOWN || key === Amp.keys.UP) {
          e.preventDefault();                               // Prevents the caret from bouncing to the left and right side of the input
        }
        else if(key === Amp.keys.ENTER) {
          this.close();
          e.preventDefault();
        }
      }
      else if(key === Amp.keys.DOWN || key === Amp.keys.UP){ // Open list on arrow keys
        this.ajax ? this.__ajaxopen() : this.open();
      }
    },
    
    // This will reset the items of the combo with a new filtered set from the server
    // However, if the filtered set does not contain the already selected value, the
    // selection will be lost since __normalize_selection makes sure the value is in the item set.
    // We use this silent reset and the callback to restore the previous value of the combo.
    __ajaxopen: function(){
      this.__ajax({ q: this.__seekstr }, function(items){
        this.reset(items, false, null, true);
        this.open();
      });
    },
    
    // If the combo already has a value, but it has no items to associate that value to
    // this method will fetch the appropriate item from the server and fill in the input field
    // with the item's label
    __ajaxfill: function(){
      this.__ajax({ v: this.value }, function(items){
        this.reset(items, true);
        this.__updateView();
      });
    },
    
    // An ajax helper
    __ajax: function(params, callback) {
      params[this.ajax.v] = params.v;
      params[this.ajax.q] = params.q;
      
      // TODO: Think about making the extra param async functions - can be done
      _.map(this.ajax.extra, function(val, key){
        params[key] = _.isFunction(val) ? val.call(this) : val;
      }, this);
      
      this.element.addClass('loading');

      $.ajax(this.ajax.url, {
        dataType: 'json',
        context:  this,
        data:     params,
        success:  function(items){
          this.element.removeClass('loading');
          callback.call(this, items);
        },
        error: function(){
          alert("Handle this ajax error.");
        }
      });
    },
  
    __updateView: function(string){
      var item = this.getItems()[0];
      this.input.element.val(this.input.__lastValue = string ? string : (item ? item.label : ""));
      this.__seekstr = this.input.__lastValue.toLowerCase();
    },
    
    open: function(){
      if( this.__open ) {
        return;
      }
      this.__open = true;

      if( !this.__rendered ) {
        var items, term = this.__seekstr;
        
        // If the control is using ajax, the items will always be filtered by the server
        items = this.ajax ? this.items : _.filter(this.items, function(item, index){
          return item.label.toLowerCase().indexOf(term) > -1;
        });

        this.renderContent(items);
        this.__rendered = true;
      }
      
      var offset    = this.element.offset();
      var top       = offset.top;
      var left      = offset.left;
      var width     = this.element.outerWidth();
      var height    = this.element.outerHeight(true);
      var wScrollT  = $(window).scrollTop();
      var wScrollL  = $(window).scrollLeft();
      var winWidth  = $(window).width();
      var winHeight = $(window).height();

      var contentH  = this.panel.content.outerHeight(true);
      var contentW  = this.panel.content.outerWidth(true);

      var spaceBelow = winHeight + wScrollT - top - height;  // Distance of input bottom edge from the window bottom edge
      var spaceAside = winWidth + wScrollL - left;           // Distance of button left edge from the window right edge
      var panelLeft, panelWidth, panelTop, panelHeight;
      
      // For combo boxes, we always show the panel under or above the input so the user can see what he's typing
      if(spaceBelow > 50) {
        panelTop = top + height + 2;
        panelHeight = Math.min(spaceBelow - 10, contentH);
      }
      // If not enough room, we show the panel above the input
      else if(top - wScrollT + 5 > contentH){
        panelTop = top - contentH - 2;
        panelHeight = contentH;
      }
      else {
        panelTop = wScrollT + 5;
        panelHeight = Math.min(top - wScrollT - 8, contentH);
      }

      if(contentW < spaceAside) {
        panelLeft = left;
        panelWidth = Math.max(contentW, width);
      }
      else if(contentW < winWidth) {
        panelLeft = left - (contentW - spaceAside);
        panelWidth = contentW;
      }
      else {
        panelLeft = wScrollL + 5;
        panelWidth = winWidth - 10;
      }

      this.panel.element.css({ left: panelLeft, width: panelWidth, top: panelTop, height: panelHeight});
      this.panel.element.addClass('shown');
      this.panel.calc();
      this.scrollToItem(this.selection[0] || 0, true);
      this.selection[0] && this.focusItem(this.selection[0]);
      this.trigger('open');
    },
    
    close:    Select.prototype.close,
    getValue: Select.prototype.getValue
  });
  
  

  $(function(){
    $(document.body)
      .delegate('.amp.btn.select, .amp.input.combo', {
        blur: function(e){
          $(this).amp().parent.trigger('__blur');
        }
      })
      .delegate('.amp.input.combo', {
        click: function(){
          if(this.style.cursor === 'pointer') {
            $(this).amp().parent.open();
          }
        }
      })
      .delegate('.amp.btn.select, .amp.amp-panel.list, .amp.input.combo', {
        keypress: function(e){
          $(this).amp().parent.__handleKeypress(e.which, e);
        },
        keydown: function(e){
          $(this).amp().parent.__handleKeydown(e.which, e);
        },
        blur: function(){
          $(this).amp().parent.focusItem(null);
        }
      })
      .delegate('.amp.amp-panel[tabindex]', {
        click: function(){
          $(this).focus();
        }
      });
  });
  


  Amp.controls.abstractList = List;
  Amp.controls.list         = PanelList;
  Amp.controls.select       = Select;
  Amp.controls.combo        = Combo;
})();
