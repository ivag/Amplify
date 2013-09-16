/**
 * Amp Framework - Core Module.
 * 
 * This module provides a container and core functionality for Amp.js
 * It is required for every other Amp module.
 *
 * Copyright Quipu GmbH (http://www.quipugmbh.com)
**/
;(function(){
  var GUID = 1;
  var cache = {};

  /**
   * Amp factory.
   * Returns a new Amp object for a jQuery element.
   * It's also the Amp namespace exposed to window.
  **/
  var Amp = function(element, type, options){
    if(!(type in Amp.controls)) {
      throw new Error("Unrecognized control type: " + type);
    }

    if(!options) {
      options = {};
    }

    return new (Amp.controls[type])(element, options);
  }
  
  // Expose available controls
  Amp.controls = {};
  
  // Various settings configurable on launch
  Amp.settings = {
    decimalPoint:       ".",   // The decimal point used in the current locale
    decimalReplace:     "",    // Should be "," if the decimal point is ","
    thousandsSeparator: ",",   // The tousands separator used in the current locale
    thousandsSepRegexp: /,/g,  // A regular expression to find all thousands separators
    
    date: {
      ISO:                /^(\d{2,4})-(\d{1,2})-(\d{1,2})$/,
      EU:                 /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/,
      US:                 /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,

      format:             "ISO", // Can be ISO (yyyy-mm-dd), US (mm/dd/yyyy) or EU (dd.mm.yyyy)
      language: {
        dayNamesShort:    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dayNames:         ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        monthNames:       ['January','February','March','April','May','June', 'July','August','September','October','November','December'],
      	monthNamesShort:  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      },
    },
    emailRegexp:        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  };
  
  // A named map of key codes
  Amp.keys = {
  	ALT:             18,
  	BACKSPACE:       8,
  	CAPS_LOCK:       20,
  	COMMA:           188,
  	COMMAND:         91,
  	WINDOWS:         91, // COMMAND
  	MENU:            93, // COMMAND_RIGHT
  	COMMAND_LEFT:    91, // COMMAND
  	COMMAND_RIGHT:   93,
  	CONTROL:         17,
  	DELETE:          46,
  	DOWN:            40,
  	END:             35,
  	ENTER:           13,
  	ESCAPE:          27,
  	HOME:            36,
  	INSERT:          45,
  	LEFT:            37,
  	NUMPAD_ADD:      107,
  	NUMPAD_DECIMAL:  110,
  	NUMPAD_DIVIDE:   111,
  	NUMPAD_ENTER:    108,
  	NUMPAD_MULTIPLY: 106,
  	NUMPAD_SUBTRACT: 109,
  	PAGE_DOWN:       34,
  	PAGE_UP:         33,
  	PERIOD:          190,
    SLASH:           191,
    DASH:            189,
  	RIGHT:           39,
  	SHIFT:           16,
  	SPACE:           32,
  	TAB:             9,
  	UP:              38,
  };

  /**
   * The parent class of all Amp controls
  **/
  function Control(element, options) {
    var guid = GUID++;

    cache[guid] = this;

    if(element instanceof $) {
      element.addClass('amp').data('amp', guid);
      element[options.disabled ? 'attr' : 'removeAttr']('disabled', 'disabled');
    }

    this.disabled   = options.disabled || false;
    this.active     = options.active || false;
    this.value      = options.value === undefined ? null : options.value;
    this.element    = element;
    this.options  = {
      format:     null,  // For input[type=text] based controls, this dictates the format of the contents.
      realtime:   null,  // For input[type=text] based controls, if true, they will fire amp "change" events on "keyup" DOM events.
      validators: null,  // Validators are run after a value has been changed. If they fail, a validationError event is triggered.
      multiple:   null,  // For all lists - whether the list can have multiple values selected
      nullable:   null,  // For all lists - whether the list can have no selection
      filters:    null,  // For all lists - only items that pass the filters test will be displayed and allowed for selection
      component:  null,  // For panels - panels that are components of composite controls will have this set to true
    };

    /**
     * Other properties
     *  this.selection    // For lists/enums only - contains the values of the selected items
     *  this.items        // For lists/enums only - contains the original items
     *  this.parent       // For various components of composite controls. This points to the top level composite parent
     *  this.ajax         // For combos - contains the ajax configuration

     *  this.__native     // If true, this is a native checkbox or radio control; Only available for checkboxes and radios.
     *  this.__group      // A reference to all other radio buttons with the same "name" attribute; Only available for radios.
     *  this.__lastValue  // Stores the last typed-in value for text fields.
     *  this.__rendered   // Mostly for lists, this flag is true if the list has been already rendered
     *  this.__open       // Mostly for lists and datepickers. True if the widget is shown.
     *  this.__focused    // Mostly for lists and datepickers. The index/date of the focused item.
     *  this.__elements   // Mostly for lists, this is a shortcut to the list item DOM elements.
     *  this.__seekstr    // For search-while-typing in lists, this is a timeout reference
     *  this.__seektout   // For search-while-typing in lists, this is a search string store
    **/

    _.extend(this, Backbone.Events);
  }


  Control.prototype = {    
    option: function(name, value) {
      var previous, option, method = '__op_' + name;

      if(!this[method]) {
        return this;
      }
      
      previous = this.options[name];
      this[method](value);
      

      if(previous !== this.options[name]) {
        this.trigger('option', { name: name, previous: previous, value: value, option: this.options[name] });
      }

      return this;
    },

    enable: function(silent){
      this.disabled = false;
      this.element && this.element.removeAttr('disabled');
      silent || this.trigger('enable');
      return this;
    },

    disable: function(silent){
      this.disabled = true;
      this.element && this.element.attr('disabled', 'disabled');
      silent || this.trigger('disable');
      return this;
    },
    
    val: function(value, silent, callback) {
      if(value === undefined) {
        return this.getValue ? this.getValue() : null;
      }
      this.setValue && this.setValue(value, silent, callback);
      return this;
    },
    
    /**
     * Validation facilities
    **/
    validate: function(silent){
      var validator, i=0, messages = [];
      
      if(_.isArray(this.options.validators) && this.options.validators.length) {
        while(validator = this.options.validators[i++]) {
          if(result = validator(this.value, this)) {
            messages.push(result);
          }
        }
      }
      
      if(messages.length) {
        silent || this.trigger('validationError', messages, this);
        return messages;
      }

      return [];
    },

    __op_validators: function(validators) {
      if(_.isFunction(validators)) {
        this.options.validators = [validators];
      }
      else if(_.isArray(validators)) {
        this.options.validators = _.filter(validators, function(v){ return _.isFunction(v); });
      }
    }
  }
  
  // Amp Group mechanics
  Amp.Group = function(amps){
    if( !_.isArray(amps) ) {
      amps = Array.prototype.slice.call(arguments);
    }

    // Fix missing `new` keyword
    if( this === Amp || this === window ) {
      return new Amp.Group(amps);
    }
    this._amps = amps;
  }

  Amp.Group.prototype.minus = function(amps){
    if(amps instanceof Amp.Group) {
      amps = amps._amps;
    }
    else if( !_.isArray(amps) ) {
      amps = Array.prototype.slice.call(arguments);
    }
    return new Amp.Group(_.difference(this._amps, amps));
  }

  Amp.Group.prototype.plus = function(amps){
    if(amps instanceof Amp.Group) {
      amps = amps._amps;
    }
    else if( !_.isArray(amps) ) {
      amps = Array.prototype.slice.call(arguments);
    }
    return new Amp.Group(_.union(this._amps, amps));
  }

  // Add the common methods to the Group class
  _.each(['option', 'enable', 'disable', 'val', 'validate'], function(name){
    Amp.Group.prototype[name] = function(){
      var args = arguments;
      var results = _.map(this._amps, function(amp){ 
        return amp[name].apply(amp, args); 
      });
      return results[0] instanceof Control ? this : results;
    }   
  });


  // A backdrop used for modals and alerts
  Amp.backdrop = $('<div class="amp-backdrop"></div>').prependTo(document.body);

  // jQuery binding
  $.fn.amp = function(){
    var guid;

    // Amp getter
    if(arguments.length === 0) {
      if(this.length === 0) {
        throw new Error("Can't get the Amp object from an empty jQuery selection.");
      }
      else if(this.length === 1) {
        guid = this.data('amp');
        return guid ? cache[guid] : null;
      }
      else {
        throw new Error("This jQuery element doesn't have an associated Amp object or there are multiple jQuery elements in the selection");
      }
    }

    // Make a new Amp
    return Amp(this, arguments[0], arguments[1]);
  }

  // Expose the base control
  Amp.controls.control = Control;

  // Expose Amp
  window.Amp = Amp;
  
  
  
  
  
  // 
  // Some extensions to native types
  //

  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || 
                                 window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  
  /**
   * Number methods
  **/
  
  // Parses a string into a number. Takes into account the localized formatting.
  Number.parse = function(val) {
    val = ("" + val).replace(Amp.settings.thousandsSepRegexp, "");
    val = parseFloat(Amp.settings.decimalReplace ? val.replace(Amp.settings.decimalReplace, ".") : val, 10);
    return isNaN(val) ? null : val;
  }

  // Matches all numbers greater than 999. We need to add separators here.
  var gt999 = /(\d+)(\d{3})/;
  function nformat(value, round, parser){
    if( value instanceof Date ) {
      value = +value;
    }

    else if( typeof value === 'string' ) {
      value = Number.parse(value);
    }

    if(value === null) {
      value = "";
    }

    else {
      if(!isNaN(round)) {
        value = value.toFixed(round);
      }
      
      // The decimal point here is always "." because we used value.toFixed();
      var parts = ( value + "" ).split( "." );
      if( parser === parseInt || !parts[1] || !parts[1].length ) {
        parts[1] = "";
      }
      else {
        parts[1] = Amp.settings.decimalPoint + parts[1];
      }
      while ( gt999.test( parts[0] ) ){
        parts[0] = parts[0].replace( gt999, '$1' + Amp.settings.thousandsSeparator + '$2' );
      }
      value = parts[0] + parts[1];
    }

    return value;
  }

  Number.prototype.format = function(round, ifZero) {
    if(+this === 0 && typeof ifZero === 'string'){
      return ifZero;
    }
    if(this % 1 || round){
      return nformat(this, round || 2, parseFloat);
    }
    return nformat(this, null, parseInt);
  }

  Number.prototype.round = function(precision){
    var pow = Math.pow(10, precision || 2);
    return Math.round(this * pow) / pow;
  }
  
  Number.prototype.pad = function(width, z) {
    var n = this + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z || '0') + n;
  }
  
  /**
   * String methods
  **/
  
  String.prototype.toDate = function(){
    return Date.parse(this);
  }
  
  /**
   * Array extensions
   * Taken from underscore.js
  **/
  fn = Array.prototype;
  fn.forEach || (fn.forEach = function(fn, context) { _.forEach(this, fn, context); return this; });  
  fn.map     || (fn.map     = function(fn, context) { return _.map(this, fn, context); });
  fn.filter  || (fn.filter  = function(fn, context) { return _.filter(this, fn, context); });
  fn.indexOf || (fn.indexOf = function(el, isSorted) { return _.indexOf(this, el, isSorted); });
  
  /**
   * Date methods
  **/
  
  /** 
   * Determines if the current date instance is within a LeapYear.
   * @param {Number}   The year (0-9999).
   * @return {Boolean} true if date is within a LeapYear, otherwise false.
   */
  Date.isLeapYear = Date.isLeapYear || function (year) { 
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)); 
  };

  /**
   * Gets the number of days in the month, given a year and month value. Automatically corrects for LeapYear.
   * @param {Number}   The year (0-9999).
   * @param {Number}   The month (0-11).
   * @return {Number}  The number of days in the month.
   */
  Date.getDaysInMonth = Date.getDaysInMonth || function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  };
  
  Date.parse = function (value, format) {
    var match, year, month, day;
    
    if(value instanceof Date) {
      return value;
    }
    format || (format = Amp.settings.date.format);
    
  	if(format === "ISO") {
  	  match = ("" + value).match(Amp.settings.date.ISO);
      if(!match) {
        return null;
      }

      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[3], 10);
  	}
    else if(format === "US") {
      match = ("" + value).match(Amp.settings.date.US);
      if(!match) {
        return null;
      }
      
      year = parseInt(match[3], 10);
      month = parseInt(match[1], 10) - 1;
      day = parseInt(match[2], 10);
    }
    else if(format === "EU") {
      match = ("" + value).match(Amp.settings.date.EU);
      if(!match) {
        return null;
      }
      
      year = parseInt(match[3], 10);
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[1], 10);
    }
    
  	return new Date(year, month, day);
  };
  
  // Instance methods
  fn = Date.prototype;
  
  /**
   * Returns a new Date object that is an exact date and time copy of the original instance.
   * @return {Date}    A new Date instance
   */
  fn.clone || (fn.clone = function () {
    return new Date(this.getTime()); 
  });

  /**
   * Compares this instance to a Date object and return an number indication of their relative values.  
   * @param {Date}     Date object to compare [Required]
   * @return {Number}  1 = this is greaterthan date. -1 = this is lessthan date. 0 = values are equal
   */
  fn.compareTo || (fn.compareTo = function (date) {
    if (isNaN(this)) { 
      throw new Error(this); 
    }
    if (date instanceof Date && !isNaN(date)) {
      return (this > date) ? 1 : (this < date) ? -1 : 0;
    } else { 
      throw new TypeError(date); 
    }
  });

  /**
   * Compares this instance to another Date object and returns true if they are equal.  
   * @param {Date}     Date object to compare [Required]
   * @return {Boolean} true if dates are equal. false if they are not equal.
   */
  fn.equals || (fn.equals = function (date) { 
    return (this.compareTo(date) === 0); 
  });

  /**
   * Determines is this instance is between a range of two dates or equal to either the start or end dates.
   * @param {Date}     Start of range [Required]
   * @param {Date}     End of range [Required]
   * @return {Boolean} true is this is between or equal to the start and end dates, else false
   */
  fn.between || (fn.between = function (start, end) {
    var t = this.getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  /**
   * Adds the specified number of milliseconds to this instance. 
   * @param {Number}   The number of milliseconds to add. The number can be positive or negative [Required]
   * @return {Date}    this
   */
  fn.addMilliseconds || (fn.addMilliseconds = function (value) {
    this.setMilliseconds(this.getMilliseconds() + value);
    return this;
  });

  /**
   * Adds the specified number of seconds to this instance. 
   * @param {Number}   The number of seconds to add. The number can be positive or negative [Required]
   * @return {Date}    this
   */
  fn.addSeconds || (fn.addSeconds = function (value) { 
    return this.addMilliseconds(value * 1000); 
  });

  /**
   * Adds the specified number of seconds to this instance. 
   * @param {Number}   The number of seconds to add. The number can be positive or negative [Required]
   * @return {Date}    this
   */
  fn.addMinutes || (fn.addMinutes = function (value) { 
    return this.addMilliseconds(value * 60000); /* 60*1000 */
  });

  /**
   * Adds the specified number of hours to this instance. 
   * @param {Number}   The number of hours to add. The number can be positive or negative [Required]
   * @return {Date}    this
   */
  fn.addHours || (fn.addHours = function (value) { 
    return this.addMilliseconds(value * 3600000); /* 60*60*1000 */
  });

  /**
   * Adds the specified number of days to this instance. 
   * @param {Number}   The number of days to add. The number can be positive or negative [Required]
   * @return {Date}    this
   */
  fn.addDays || (fn.addDays = function (value) { 
    return this.addMilliseconds(value * 86400000); /* 60*60*24*1000 */
  });

  /**
   * Adds the specified number of weeks to this instance. 
   * @param {Number}   The number of weeks to add. The number can be positive or negative [Required]
   * @return {Date}    this
   */
  fn.addWeeks || (fn.addWeeks = function (value) { 
    return this.addMilliseconds(value * 604800000); /* 60*60*24*7*1000 */
  });

  /**
   * Adds the specified number of months to this instance. 
   * @param {Number}   The number of months to add. The number can be positive or negative [Required]
   * @return {Date}    this
   */
  fn.addMonths || (fn.addMonths = function (value) {
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
  });

  /**
   * Adds the specified number of years to this instance. 
   * @param {Number}   The number of years to add. The number can be positive or negative [Required]
   * @return {Date}    this
   */
  fn.addYears || (fn.addYears = function (value) {
    return this.addMonths(value * 12);
  });

  /**
   * Resets the time of this Date object to 12:00 AM (00:00), which is the start of the day.
   * @return {Date}    this
   */
  fn.clearTime || (fn.clearTime = function () {
    this.setHours(0); 
    this.setMinutes(0); 
    this.setSeconds(0);
    this.setMilliseconds(0); 
    return this;
  });

  /**
   * Determines whether or not this instance is in a leap year.
   * @return {Boolean} true if this instance is in a leap year, else false
   */
  fn.isLeapYear || (fn.isLeapYear = function () { 
    var y = this.getFullYear(); 
    return (((y % 4 === 0) && (y % 100 !== 0)) || (y % 400 === 0)); 
  });

  /**
   * Get the number of days in the current month, adjusted for leap year.
   * @return {Number}  The number of days in the month
   */
  fn.getDaysInMonth || (fn.getDaysInMonth = function () { 
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
  });

  /**
   * Get the numeric day number of the year, adjusted for leap year.
   * @return {Number} 0 through 364 (365 in leap years)
   */
  fn.getDayOfYear || (fn.getDayOfYear = function () {
    return Math.floor((this - new Date(this.getFullYear(), 0, 1)) / 86400000);
  });

  /**
   * Determine whether Daylight Saving Time (DST) is in effect
   * @return {Boolean} True if DST is in effect.
   */
  fn.isDST || (fn.isDST = function () {
    return this.toString().match(/(E|C|M|P)(S|D)T/)[2] == "D";
  });

  /**
   * Get the timezone abbreviation of the current date.
   * @return {String} The abbreviated timezone name (e.g. "EST")
   */
  fn.getTimezone || (fn.getTimezone = function () {
    return Date.getTimezoneAbbreviation(this.getUTCOffset, this.isDST());
  });

  fn.setTimezoneOffset || (fn.setTimezoneOffset = function (s) {
    var here = this.getTimezoneOffset(), there = Number(s) * -6 / 10;
    this.addMinutes(there - here); 
    return this;
  });

  fn.setTimezone || (fn.setTimezone = function (s) { 
    return this.setTimezoneOffset(Date.getTimezoneOffset(s)); 
  });

  /**
   * Get the offset from UTC of the current date.
   * @return {String} The 4-character offset string prefixed with + or - (e.g. "-0500")
   */
  fn.getUTCOffset || (fn.getUTCOffset = function () {
    var n = this.getTimezoneOffset() * -10 / 6, r;
    if (n < 0) { 
      r = (n - 10000).toString(); 
      return r[0] + r.substr(2); 
    } else { 
      r = (n + 10000).toString();  
      return "+" + r.substr(1); 
    }
  });

  fn.format || (fn.format = function(format) {
    format || (format = Amp.settings.date.format);
    
  	if(format === "ISO") {
      return this.getFullYear() + '-' + (this.getMonth() + 1).pad(2) + '-' + this.getDate().pad(2);
  	}
    else if(format === "US") {
      return (this.getMonth() + 1).pad(2) + '/' + this.getDate().pad(2) + '/' + this.getFullYear();
    }
    else if(format === "EU") {
      return this.getDate().pad(2) + '.' + (this.getMonth() + 1).pad(2) + '.' + this.getFullYear();
    }

  	return this.toString();
  });
})();
/** 
 * Amp Buttons
**/
;(function() {
  var Control = Amp.controls.control;
  
  /**
   * Generic button.
   * Responds only to 'click' events.
  **/
  function Button(element, options){
    if(element instanceof $) {
      element.addClass('btn');
      element[options.active ? 'addClass' : 'removeClass']('active');
      if(this.__native) {
        element[options.active ? 'attr' : 'removeAttr']('checked', 'checked');
      }
    }
    
    // Inherits from Control
    Control.call(this, element, options);
  }

  Button.prototype = _.extend({}, Control.prototype, {
    super: Control.prototype,
    toString: function(){
      return this.active ? "1" : "";
    }
  });
  
  
  /**
   * Checkbox button.
   * Has 2 states: active and inactive. The active state has a value of "1", and the inactive a value of "".
   * Responds to 'click' and 'change' events
  **/
  function Checkbox(element, options) {
    if(element instanceof $) {
      element.addClass('checkbox');
      if(this.__native = element.is('input[type=checkbox]')) {
        'active' in options || (options.active = !!element.is('[checked]'));
      }
    }
    
    // Inherits from Button
    Button.call(this, element, options);
  }

  Checkbox.prototype = _.extend({}, Button.prototype, {
    super: Button.prototype,

    getValue: function() {
      return !!this.active;
    },

    setValue: function(active, silent, callback) {
      // Only execut if the value actually changes
      if(!this.active !== !active) {
        this.element[(this.active = !!active) ? 'addClass' : 'removeClass']('active');

        if(this.__native) {
          active ? this.element.attr('checked', 'checked') : this.element.removeAttr('checked');
        }

        silent || this.trigger('change', { previous: !this.active, value: active, callback: callback });
      }
    }
  });

  
  /**
   * Radio button.
   * Has 2 states: active and inactive. The active state has a value of "1", and the inactive a value of "".
   * Responds to 'click' and 'change' events.
   * Radios can be grouped in groups where only a single radio can be selected buy setting the same 'name' attribute.
  **/
  function Radio(element, options) {
    if(element instanceof $){
      element.addClass('radio');
      if(this.__native = element.is('input[type=radio]')){
        'active' in options || (options.active = !!element.is('[checked]'));
      }
    }

    // Find the other radio buttons in this group
    this.__group  = $('[name=' + element.attr('name') + ']:not(#' + element.attr('id') + ')');
    
    // Inherits from Button
    Button.call(this, element, options);
  }

  Radio.prototype = _.extend({}, Button.prototype, {
    super: Button.prototype,

    getValue: function() {
      return !!this.active;
    },

    setValue: function(active, silent, callback) {
      // Only execute if the value actually changes
      if(!this.active !== !active) {
        this.element[(this.active = !!active) ? 'addClass' : 'removeClass']('active');

        if(this.__native) {
          active ? this.element.attr('checked', 'checked') : this.element.removeAttr('checked');
        }
        
        // Other radio buttons in the same group need to be turned off
        if(active) {
          this.__group.each(function(){
            var other = $(this).amp();
            other && other.setValue(false, silent, callback);
          });
        }

        silent || this.trigger('change', { previous: !this.active, value: active, callback: callback });
      }
    }

  });


  $(function () {
    // This is a hack that enables us to set the active state on buttons
    // that are already focused in browsers that missbehave (like webkit)
    var pressed;

    $(document.body)
      .mouseup(function(){
        pressed = null; 
      })
      .delegate('.amp.btn', {
        click: function (e) {
          $(this).focus().amp().trigger("click");
        }
      })
      .delegate('.amp.btn', {
        mousedown: function (e) {
          if(e.which !== 1) {
            return;
          }
          
          (pressed = this) && $(this).addClass('active');
        },
        mouseover: function (e) {
          (pressed === this) && $(this).addClass('active');
        },
        mouseup: function (e) {
          var amp = $(this).amp();
          amp && !amp.val() && $(this).removeClass('active');
        },
        mouseout: function (e) {
          var amp = $(this).amp();
          amp && !amp.val() && $(this).removeClass('active');
        }
      })
      .delegate('.amp.checkbox', {
        click: function(e){
          if(e.which !== 1) {
            return;
          }

          var amp = $(this).amp();
          amp.val(!amp.val());
        }
      })
      .delegate('.amp.radio', {
        click: function(e){
          $(this).amp().val(true);
        }
      });
  });


  Amp.controls.button   = Button;
  Amp.controls.checkbox = Checkbox;
  Amp.controls.radio    = Radio;
})();
/** 
 * Amp Inputs
**/
;(function() {
  var Control = Amp.controls.control;
  
  /**
   * Generic Input.
   * This is an abstract class that extends into Text, Number and Date inputs
  **/
  function Input(element, options) {
    // Inherits from Control
    Control.call(this, element, options);

    // Take care of options
    this.__op_realtime(options.realtime);
    this.__op_validators(options.validators);
  }
  
  Input.prototype = _.extend({}, Control.prototype, {
    super: Control.prototype,
    
    __op_realtime: function(realtime){
      this.options.realtime = !!realtime;
    },
  });


  /**
   * Text Input.
   * Can take any value and the type is 'string'.
  **/
  function TextField(element, options) {
    // Inherits from Input
    Input.call(this, element, options);
    
    if(element instanceof $) {
      element.attr('autocomplete', 'off');
      element.addClass('text input');

      // If value is provided in the options, we override the element's value attribute, otherwise we empty it
      this.value ? element.val(options.value) : element.val("");
    }
  }

  TextField.prototype = _.extend({}, Input.prototype, {
    super: Input.prototype,

    toString: function() {
      return this.value;
    },

    getValue: function() {
      return this.value;
    },

    setValue: function(value, silent, callback, options) {
      // The 'realtime' option is true, if this method was called from the "keyup" DOM event.
      var previous, realtime = !!(options && options.realtime);
      
      // Cast value to string. Text inputs always have string-type values
      value = (value === null || value === undefined) ? "" : "" + value;
      
      // Do something only if the new value is different from the current one
      if( value !== this.value ) {
        previous = this.value;

        this.__lastValue = this.value = value;
        realtime || this.element.val(value);
        silent   || this.trigger('change', { previous: previous, value: value, callback: callback, realtime: realtime });
        
        // Will trigger validationError if any of the validators fail
        this.validate();
      }
    }
  });


  /**
   * Text Input.
   * Can take only numeric strings and auto-formats them in the specified locale.
   * Its data type is Number.
  **/
  function NumberField(element, options) {
    // Inherits from Input
    Input.call(this, element, options);

    // We don't accept non-numeric types.
    this.value === null || (this.value = Number.parse(options.value));

    // Take care of options
    this.__op_format(options.format);

    if(element instanceof $) {
      element.attr('autocomplete', 'off');
      element.addClass('number input');

      // If value is provided in the options we set the elements value property, otherwise we empty it
      this.value === null ? element.val("") : element.val(this.value.format(this.options.format));
    }
    
    this.__lastValue = this.value === null ? "" : this.value.format(this.options.format);

    // The following code performs as-you-type formatting of numbers for jquery elements
    var self              = this;
    var comma             = Amp.settings.thousandsSeparator;
    var allowedKeys       = [37, 38, 39, 40, 27, 8, 46, 9];

    (element instanceof $) && element.on('keydown', function(e){
      // This keydown event was not invoked by typing
      if(!e || typeof e !== 'object' || !e.which) {
        return;
      }

      // This will allow arrow keys, cut, copy, paste actions.
      // It will also allow any input for browsers < IE8 that don't support the selection api.
      if(_.include(allowedKeys, e.which) || !('selectionStart' in this && 'selectionEnd' in this) || e.metaKey) {
        return;
      }

      // 96-105 are numpad numbers
      if(e.which >= 96 && e.which <= 105) {
        e.which -= 48;
      }

      // 110 is the numpad decimal point, 190 is the period.
      if(e.which === Amp.keys.NUMPAD_DECIMAL || e.which === Amp.keys.PERIOD) {
        e.which = 46;
      }
      
      // 188 is the comma key, but the charcode for the comma in ASCII is 44
      if(e.which == Amp.keys.COMMA) {
        e.which = 44;
      }
      
      var dot               = self.options.format > 0 ? Amp.settings.decimalPoint : '';
      var regexLeadingZeros = new RegExp("^0[^" + dot + "]");
      var regexValidChar    = new RegExp('[0-9' + dot + ']');

      var ch = e.which === Amp.keys.PERIOD ? '.' : String.fromCharCode(e.which);
      if(regexValidChar.test(ch)){
        var i, tmpStart, parts, whole, decimal, highOrder,
            newValue    = "",
            caretOffset = 1,
            start       = this.selectionStart,
            newStart    = this.selectionStart,
            end         = this.selectionEnd,
            value       = this.value.substr(0, start) + this.value.substr(end);

        // Disallow more than one dot   
        if(ch === dot && value.indexOf(ch) !== -1){
          e.preventDefault();
          return;
        }

        // Auto-prepend zeros when the user hits '.' on an empty field
        if(ch === dot && value.length === 0){
          ch = '0' + dot;
          caretOffset += 1;
        }

        // Compensate caret position for removed commas
        tmpStart = start;
        for(i=0; i < start; i++){
          if( value[i] == comma ){
            tmpStart -= 1;
          }
          start = tmpStart;
        }

        // Disallow leading zeros for the whole number part.
        if( ch === '0' ){
          var testval = value.replace(Amp.settings.thousandsSepRegexp, '');
          testval = testval.substr( 0, start ) + ch + testval.substr( start );
          if( regexLeadingZeros.test( testval ) ){
            e.preventDefault();
            return;
          }
        }

        // Change the value of the field (add commas)
        value     = value.replace(Amp.settings.thousandsSepRegexp, '');
        value     = value.substr(0, start) + ch + value.substr(start);
        parts     = value.split(dot);
        whole     = parts[0];
        if(self.options.format > 0 && parts[1] && parts[1].length > self.options.format){
          e.preventDefault();
          return;
        }
        decimal   = parts[1] === undefined ? "" : dot + parts[1];
        highOrder = whole.length % 3;
        for(i=0; i<whole.length; ++i){
          if( i && ((i - highOrder) % 3 == 0) ){
            newValue += comma;
            if( i < start + 1 )
              caretOffset += 1;
          }
          newValue += whole[i];
        }

        newValue += decimal;
      
        // We need to programatically limit the length since the input is value changes programatically
        if( (self.options.maxlength && newValue.length > self.options.maxlength) ) {
          return false;
        }
      
        this.value = newValue;
        this.selectionStart = this.selectionEnd = start + caretOffset;
      }

      e.preventDefault();
    });
  }


  NumberField.prototype = _.extend({}, Input.prototype, {
    super: Input.prototype,

    // Sets the format option 
    __op_format: function(format) {
      this.options.format = isNaN(format) ? 0 : parseInt(format, 10);
    },

    getValue: function() {
      return this.value;
    },

    setValue: function(value, silent, callback, options) {
      // The 'realtime' option is true if this method was called from the "keyup" DOM event.
      // The 'reformat' option is true if this method was called from the "blur" DOM event.
      //    We don't care about resetting the value attribute since on "blur" the caret is no longer in the field.
      var previous, realtime = !!(options && options.realtime), reformat = !!(options && options.reformat);
      
      // Cast value to number;
      value = Number.parse(value);

      // Do something only if the new value is different from the current one
      if(value !== this.value) {
        previous = this.value;

        this.value = value;
        this.__lastValue = value === null ? "" : value.format(this.options.format);

        realtime || this.element.val(this.__lastValue);
        silent   || this.trigger('change', { previous: previous, value: value, callback: callback, realtime: realtime });
        
        // Will trigger validationError if any of the validators fail
        this.validate();
      }
      else if(reformat) {
        this.element.val( this.__lastValue = this.value === null ? "" : this.value.format(this.options.format) );
      }
    },

    toString: function(){
      return this.value === null ? "" : this.value.format(this.options.format);
    }
  });
  
  
  /**
   * Date Input.
   * Can take only numbers and "-", "/" or "." depending on the locale.
   * Its data type is Date.
  **/
  function DateField(element, options){
    // Inherits from Input
    Input.call(this, element, options);
        
    // Take care of options
    this.__op_format(options.format);

    // We don't accept non-dates or strings that can't be parsed.
    this.value === null || (this.value = Date.parse(this.value, this.options.format));
    
    if(element instanceof $) {
      element.attr('autocomplete', 'off');
      element.addClass('date input ' + options.format);

      // If value is provided in the options we set the elements value property, otherwise we empty it
      this.value === null ? element.val("") : element.val(this.value.format(this.options.format));
    }
    
    this.__lastValue = this.value === null ? "" : this.value.format(this.options.format);
    
    // The following code performs as-you-type formatting of numbers for jquery elements
    var self              = this;
    var allowedKeys       = [37, 38, 39, 40, 27, 8, 46, 9];
        
    (element instanceof $) && element.on('keydown', function(e){
      
      // This keydown event was not invoked by typing
      if(!e || typeof e !== 'object' || !e.which) {
        return;
      }

      // This will allow arrow keys, cut, copy, paste actions.
      // It will also allow any input for browsers < IE8 that don't support the selection api.
      if(_.include(allowedKeys, e.which) || e.metaKey) {
        return;
      }
      
      // Allow delimiter characters
      if(self.options.format === "ISO" && e.which == Amp.keys.DASH ||
         self.options.format === "US" && e.which === Amp.keys.SLASH || 
         self.options.format === "EU" && (e.which === Amp.keys.NUMPAD_DECIMAL || e.which === Amp.keys.PERIOD)) {
        return;
      }
      
      // 96-105 are numpad numbers
      if(e.which >= 96 && e.which <= 105) {
        e.which -= 48;
      }
      
      var ch = String.fromCharCode(e.which);
      if(!(/[0-9]/).test(ch) || (this.selectionStart !== undefined && this.selectionEnd - this.selectionStart === 0 && this.value.length === 10)) {
        e.preventDefault();
      }
    });
  }


  DateField.prototype = _.extend({}, Input.prototype, {
    super: Input.prototype,

    __op_format: function(format) {
      // The date format can be ISO, EU or US
      if(format !== "US" && format !== "EU" && format !== "ISO"){ 
        format = Amp.settings.date.format;
      }
      if(this.element instanceof $) {
        this.element.removeClass("EU US ISO").addClass(format);
      }

      this.options.format = format;
    },
    
    getValue: function(){
      return this.value;
    },
    
    setValue: function(value, silent, callback, options) {
      // The 'realtime' option is true if this method was called from the "keyup" DOM event.
      // The 'reformat' option is true if this method was called from the "blur" DOM event.
      //    We don't care about resetting the value attribute since on "blur" the caret is no longer in the field.
      var previous, realtime = !!(options && options.realtime), reformat = !!(options && options.reformat);
      
      // Cast value to number;
      value = Date.parse(value, this.options.format);

      // Do something only if the new value is different from the current one
      // Casting null to integer gets us 0. Casting dates to integer gets us something != 0, except for 1970-01-01 01:00;
      // If we do get the same int values, we need to check if the toString() of both objects will return the same.
      if(+value !== +this.value || ("" + value) !== ("" + this.value)) {
        previous = this.value;

        this.value       = value;
        this.__lastValue = value === null ? "" : value.format(this.options.format);

        realtime || this.element.val(this.__lastValue);
        silent   || this.trigger('change', { previous: previous, value: value, callback: callback, realtime: realtime });
        
        // Will trigger validationError if any of the validators fail
        this.validate();
      }
      else if(reformat) {
        this.element.val( this.__lastValue = value === null ? "" : value.format(this.options.format) );
      }
    }
    
  });
  

  /**
   * jQuery Bindings 
  **/
  $(function() {
    $(document.body)
    .delegate('input.amp.input', {
      keyup: function(e) {
        var self = $(this), amp = self.amp(), value = self.val();

        if(amp.options.realtime) {
          amp.setValue(value, false, null, { realtime: true });
        }
        else if(amp.__lastValue !== value) {
          amp.trigger('type', { previous: amp.__lastValue, value: value });
        }

        amp.__lastValue = value;
      },

      focus: function(e) {
        var self = $(this);
        self.amp().__lastValue = self.val();
      },

      blur: function(e) {
        var self = $(this);
        self.amp().setValue(self.val(), false, null, { reformat: true });
      }
    })
    .delegate('input.amp.input.date', {
      focus: function(){
        var format = $(this).amp().options.format;
        
        $(this).data('placeholder', this.placeholder);
        this.placeholder = format === 'ISO' ? 'YYYY-MM-DD' : format === "US" ? 'MM/DD/YYYY' : 'DD.MM.YYYY';
      },
      blur: function(){
        this.placeholder = $(this).data('placeholder') || "";
      }
    })
    .delegate('input.amp.date, input.amp.combo', {
      mousemove: function(e){
        // Shows the pointer when we mouse over the small icon on the right
        var self = $(this), o = self.offset(), width = self.outerWidth(true);
        if (o.left + width >= e.pageX && o.left + width - 20 <= e.pageX && o.top <= e.pageY && o.top + self.outerHeight(true) >= e.pageY){
          this.style.cursor = 'pointer';
        }
        else {
          this.style.cursor = '';
        }
      }
    })
  });

  Amp.controls.text   = TextField;
  Amp.controls.number = NumberField;
  Amp.controls.date   = DateField;
})();/**
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
})();;(function(){
  var DateField = Amp.controls.date;
  var floor = Math.floor;
  var ceil  = Math.ceil;
  var daysI = [ 'M', 'T', 'W', 'T', 'F', 'S', 'S' ];
  var currentInstance = null;
    
  /* The global Datepicker div */
  var datepicker = $(_.template("\
<div class='amp-datepicker'>\
  <div class='datepicker-years'></div>\
  <div class='datepicker-months'></div>\
  <div class='datepicker-calendar'></div>\
</div>")());
  
  // Creates a year range from the decade the current year is in.
  function createYearRange(current){
    var i, j, result = [];
    for(i = floor(current / 10) * 10, j = floor(current / 10 + 1) * 10; i < j; ++i) {
      result.push(i);
    }
    return result;
  }

  var months   = datepicker.find('.datepicker-months');
  var years    = datepicker.find('.datepicker-years');
  var calendar = datepicker.find('.datepicker-calendar');

  _.each(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], function(name, ix){
    months.append('<div value="' + ix + '">' + name + '</div>');
  });


  function Datepicker(element, options){
    DateField.call(this, element, options);
    
    element.addClass('picker');
    
    this.__op_dateFilter(options.dateFilter);
    this.__op_showMonth(options.showMonth);

    this.__shownYear  = null;
    this.__shownMonth = null;
  }

  Datepicker.prototype = _.extend({}, DateField.prototype, {
    super: DateField.prototype,

    __op_dateFilter: function(dateFilter) {
      if(_.isFunction(dateFilter)) {
        this.options.dateFilter = dateFilter;
      }
    },

    __op_showMonth: function(showMonth) {
      if(showMonth instanceof Date) {
        this.options.showMonth = showMonth;
      }
    },

    __renderDay: function(date, val, day){
      var disabled;
      var active = val && (date.getFullYear() === val.getFullYear()) && (date.getMonth() === val.getMonth()) && (val.getDate() === day);
      var filter = this.options.dateFilter || null

      if(day > 0 && filter) {
        disabled = !filter.call(this, new Date(date.getFullYear(), date.getMonth(), day));
      }

      return "<td class='" + (active ? "active" : "") + (disabled ? " disabled" : "") + (day > 0 ? '' : 'empty') + "'>" + (day > 0 ? day : '') + "</td>";
    },

    __renderCalendar: function(date){
      var val   = this.getValue(), dim = date.getDaysInMonth();
      var i     = 2 - ((new Date(date.getFullYear(), date.getMonth(), 1)).getDay() || 7);
      var extra = Array(7 - ((dim - i)  % 7)).join("<td class='empty'></td>");
      var html  = "<table cellspacing='0' cellpadding='0' border='0' class='amp-dptable'><tr><th>" + daysI.join("</th><th>") + "</th></tr><tr>";

      for(o = 1; i <= dim; ++i, ++o) {
        html += this.__renderDay(date, val, i);
        o % 7 === 0 && (html += "</tr>" + i === dim ? "" : "<tr>");
      }
      calendar.html(html + extra + "</table>");
    },
    
    __updateView: function(d){
      var date  = d || this.getValue() || this.options.showMonth || new Date();
      var month = date.getMonth();
      var year  = date.getFullYear();
      var range = createYearRange(year);

      years.html(
        "<div class='way-back'></div>" +
        _.map(range, function(name){ return '<div value="' + name + '">' + name + '</div>'; }).join("") +
        "<div class='way-ahead'></div>"
      );

      years.children().eq(range.indexOf(year) + 1).addClass('active');
      months.children().removeClass('active').eq(month).addClass('active');
      this.__renderCalendar(date);
      this.__shownMonth = date.getMonth();
      this.__shownYear = date.getFullYear();
    },

    goToYear: function(year) {
      this.__updateView(this.__shownMonth !== null && new Date(year, this.__shownMonth, 1));
    },

    goToMonth: function(month) {
      this.__updateView(this.__shownYear && new Date(this.__shownYear, month, 1));
    },

    selectDate: function(date) {
      this.setValue(new Date( this.__shownYear, this.__shownMonth, date ));
      this.close();
    },

    open: function(){
      if(this.__open) {
        return;
      }

      this.__open = true;
      this.__updateView();
      currentInstance = this;
      
      var w, w2, h2, o, p, h, dfb;

      p  = this.element.position();
      o  = this.element.offset();
      w  = this.element.outerWidth(true);
      h  = this.element.outerHeight();
      w2 = datepicker.outerWidth(true);
      h2 = datepicker.outerHeight(true) || 216;
      
      if((dfb = $(window).height() - (h - $(window.document).scrollTop() + o.top)) - 20 < h2) {
        datepicker.css({ top: p.top - h2 - 7, left: p.left - 2 });
        datepicker.detach().insertBefore(this.element);
      }
      else {
        datepicker.css({ top: p.top + this.element.outerHeight(true) + 5, left: p.left - 2 });
        datepicker.detach().insertAfter(this.element);
      }

      return this;
    },
    
    close: function(){
      if(this.__open) {
        this.__open = false;
        datepicker.detach();
      }
    }
  });

  datepicker.delegate('.datepicker-years div', {
    click: function(){
      if(currentInstance) {
        if( $(this).hasClass('way-back') ) {
          currentInstance.goToYear(currentInstance.__shownYear - 10);
        }
        else if( $(this).hasClass('way-ahead') ) {
          currentInstance.goToYear(currentInstance.__shownYear + 10);
        }
        else {
          currentInstance.goToYear(parseInt($(this).attr('value'), 10));
        }
      }
    }
  })
  .delegate('.datepicker-months div', {
    click: function(){
      currentInstance && currentInstance.goToMonth(parseInt($(this).attr('value'), 10));
    }
  })
  .delegate('td:not(.empty):not(.disabled)', {
    click: function(){
      currentInstance && currentInstance.selectDate(parseInt($(this).html(), 10));
    }
  });

  datepicker.on('mousedown', function(e){
    e.preventDefault();
  });

  $(document.body).delegate('.amp.input.date.picker', {
    focus: function(){
      $(this).amp().open();
    },
    blur: function(){
      $(this).amp().close();
    },
    click: function(){
      if(this.style.cursor === 'pointer') {
        $(this).amp().open();
      }
    }
  });
  
  Amp.controls.datepicker = Datepicker;
})();
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
/**
 * Amp Framework - Grid Module.
 * Copyright Quipu GmbH (http://www.quipugmbh.com)


The grid is always linked to a Backbone collection. 
Configuration:

{
  headerColumns: [ "name" ],    // Header columns stick to the left when the grid is scrolled sideways so they are always visible
  headerRows: function(row){},  // Header rows stick to the top when the grid is scrolled so they are always visible 
  pagination: {
    
  },
  sorting: {
    
  },
  columns: [
    {
      title:    "Name",         // Column title
      name:     "name",         // Backbone model attr name
      type:     "string",       // Data type
      actions:  function(){},   // Returns a list of predefined action buttons
      sortable: function(){},   // Returns boolean that determines if we can sort the column
      content:  function(){}    // Custom content renderer
    },
    {
      title:    "Cost",         // Column title
      name:     "cost",         // Backbone model attr name
      type:     "number",       // Data type
      format:   4,              // Decimal formatting. See the number field.
      actions:  function(){},   // Returns a list of predefined action buttons
      sortable: function(){},   // Returns boolean that determines if we can sort the column
      content:  function(){}    // Custom content renderer
      width:    function(){}    // Column width in pixels
      hattrs:   function(){}    // Column header HTML attributes
      cattrs:   function(){}    // Column cell HTML attributes
    },
    {
      title:    "Date",         // Column title
      name:     "date",         // Backbone model attr name
      type:     "date",         // Data type
      format:   "ISO/US/EU",    // Choose one of the 3 supported date formats
      widget:   "basic/picker", // The type of the widget displayed
      actions:  function(){},   // Returns a list of predefined action buttons
      sortable: function(){},   // Returns boolean that determines if we can sort the column
      content:  function(){}    // Custom content renderer
    },
    {
      title:    "Color",        // Column title
      name:     "color",        // Backbone model attr name
      type:     "enum",         // Data type
      widget:   "combo/select", // The type of the widget displayed
      items:    function(){},   // Returns a list of items for the enum
      actions:  function(){},   // Returns a list of predefined action buttons
      sortable: function(){},   // Returns boolean that determines if we can sort the column
      content:  function(){}    // Custom content renderer
    }
  ]
}

**/
;(function(){
  var Panel = Amp.controls.panel;

  var guid       = 0;
  var cache      = {};
  var fields     = {};
  var directions = { '38': [0, -1], '40': [0, 1], '9': [1, 0], '37':[-1, 0], '39': [1, 0] };
  
  /** 
   * Creates attributes from a dict
   * If gives an attribute named 'style' a special treatment.
  **/
  function makeAttrs(dict){
    if( _.isObject(dict) ) {
      return _.map(dict, function(val, key){
        if( key === 'style' ) {
          val = _.map(val, function(val, key){ return key + ':' + val; }).join(";");
        }
        return key + '="' + val + '"'; 
      }).join(" ");
    }
    return "";
  }
  
  function Grid(element, options){
    if(!options || !(options.data instanceof Backbone.Collection) || !options.config) {
      throw new Error("Datasource for grid must be a backbone collection and you must supply a config");
    }
    
    // Make this an event listener
    _.extend(this, Backbone.Events);

    this.element = element.addClass('grid-container');
    this.data    = options.data;
    this.panel   = Amp(null, 'panel', {});
    this.element.append(this.panel.element);
    
    this.config(options.config);
    this.__html = "";

    cache[ this.guid = ++guid ] = this;
    
    // Initialize the panel events
    this.panel.parent = this;

    var self = this;
    this.panel.unmute = function(target){
      return !!self.__editedCell;
    };
    
    this.listenTo(this.data, 'change', function(model, field){
      var calc = false;

      _.each(model.changed, function(value, name){
        var cell = self.panel.content.find('td[row=' + self.data.indexOf(model) + '][col=' + name + ']');
        var w = cell.width(), h = cell.height();

        cell.html( self.cellData(model, name) );
        
        // Cell size may change when the content is changed. 
        // In that case we will recalculate the panel size, but only once.
        calc = calc || (w !== cell.width() || h != cell.height());
      });

      calc && this.panel.calc();
    });
  }

  Grid.prototype = {
    __editedCell: null,
    __editField: null,
    
    header: function(){
      var self = this; 
      var html = "<thead><tr>";
            
      _.each(this.__order, function(name){
        var column = self.__columns[name];
        var attrs  = (_.isFunction(column.hattrs) ? column.hattrs() : column.hattrs) || {};
        
        if(column.sortable) {
          attrs['class'] = "sortable " + (self.__sortCol === name ? (self.__sortDir || 'desc') : '');
        }
        
        html += "<th data-col='" + name + "' data-grid='" + self.guid + "' " + makeAttrs(attrs) + ">" + column.title + "</th>";
      });

      return html + "</tr></thead>";
    },
    
    footer: function(){
      var i, max, html, active, footer, links;

      if(!this.__pageTotal) {
        return "";
      }
      
      html  = "<tfoot><tr><td class='paginator'>";
      html += "Page <input data-grid='" + this.guid + "' value='" + this.__pageCurrent + "'> of <b>" + this.__pageTotal + "</b> &nbsp; ";
      
      links = Math.min(this.__pageLinks, this.__pageTotal);
      i     = Math.min(Math.max(1, this.__pageCurrent - Math.floor(links / 2)), this.__pageTotal - links + 1);
      max   = i + links;

      for(; i < max; i++){
        active = (i === this.__pageCurrent) ? " active" : "";
        html += "<a data-grid='" + this.guid + "' data-page='" + i + "' class='amp-grid-page" + active + "'>" + i + "</a>";
      }

      return html + "</td></tr></tfoot>";      
    },
    
    row: function(model, index) {
      var self = this;

      this.__html += "<tr row='" + index + "'>";
      _.each(this.__order, function(name){ 
        self.cell(model, index, name); 
      });
      this.__html += "</tr>";
    },

    cell: function(model, index, col){
      var attrs = "", column = this.__columns[col];
      
      if(_.isFunction(column.cattrs)) {
        attrs = makeAttrs(column.cattrs(model));
      }
      else if(_.isObject(column.cattrs)) {
        attrs = makeAttrs(column.cattrs);
      }

      this.__html += "<td " + attrs + " grid='" + this.guid + "' row='" + index + "' col='" + col + "'>" + this.cellData(model, col) + "</td>";
    },

    cellData: function(model, col) {
      var actions, items;
      var column = this.__columns[col];
      var raw = model.get(col);

      if(column.actions) {
        actions = _.isFunction(column.actions) ? column.actions(model) : column.actions;
      }

      if(column.type === 'date' && raw instanceof Date) {
        raw = raw.format(column.format);
      }
      else if(column.type === 'number') {
        raw = typeof raw === 'number' ? raw.format(column.format) : "";
      }
      else if(column.type === 'enum') {
        if( _.isFunction(items = model.get(col + ':items') || column.itemcache || column.items || []) ) {
          items = items() || []; // We CAN'T ever pull items over ajax while rendering
        }
        raw = (_.find(items, function(item){ return item.value === raw; }) || {}).label || "";
      }

      return raw;
    },

    render: function(){
      var self = this; 
      var header = this.header();
      var footer = this.footer();

      this.__html = header + "<tbody>";
      this.data.each(function(model, index){ self.row(model, index); });
      this.__html += "</tbody>";

      this.panel.content.html("<table class='amp-grid'>" + this.__html + "</table>");
      this.__body = this.panel.content.find('table');
      footer && this.__body.addClass('footer');

      this.panel.calc({ vbar: { top: this.__body.find('thead').outerHeight(), bottom: parseInt(this.__body.css('margin-bottom'), 10) - 5 }});

      this.__head && this.__head.remove();
      this.__head = $("<div class='amp-header-grid'><table>" + header + "</table></div>").prependTo(this.panel.element);
      this.__head.find('table').css({ width: this.panel.__contentW });
      
      this.__foot && this.__foot.remove();
      this.__foot = footer && $("<div class='amp-footer-grid'><table>" + footer + "</table></div>").appendTo(this.panel.element);
    },

    /**
     * Takes care of setting up the configuration
    **/
    config: function(name, config){
      var cfg, self = this;
      
      if(config === undefined){
         config = name;
         name = null;
      }
      
      if(config.columns) {
        this.__columns = {};
        this.__order   = [];

        _.each(config.columns, function(col){
          self.__order.push(col.name);
          self.__columns[col.name] = col;
        });
      }
      
      name === 'pagination' && (config.pagination = config);
      name === 'sorting' && (config.sorting = sorting);
      
      if('loader' in config) {
        this.__loader = config.loader || null;
      }

      if('pagination' in config) {
        this.__pageLinks = this.__pageCurrent = this.__pageTotal = this.isPagingEnabled = null;

        if(cfg = config.pagination) {
          this.isPagingEnabled = true;
          this.__pageLinks     = cfg.links || 7;
          this.__pageCurrent   = 1;
          this.__pageTotal     = Math.ceil(cfg.dataSize / cfg.pageSize);
          this.__pageSize      = cfg.pageSize;
        }
      }

      if('sorting' in config) {
        this.__sortCol = this.__sortDir = this.isSortingEnabled = null;
        
        if(cfg = config.sorting) {
          this.isSortingEnabled = true;
          this.__sortCol        = cfg.column || null;
          this.__sortDir        = cfg.direction || 'asc';
        }
      }

    },
    
    paginate: function(page){
      if(!this.isPagingEnabled || page < 1 || page > this.__pageTotal || !this.__loader) {
        return this;
      }
      
      var sort  = this.isSortingEnabled ? { c: this.__sortCol, d: this.__sortDir } : {};

      this.__pageCurrent = page;
      this.data[this.__loader](_.extend({ p: page, s: this.__pageSize }, sort), this);
    },
    
    sort: function(column, direction){   
      if(!this.isSortingEnabled || !this.__columns[column].sortable) {
        return;
      }
      
      // Sort by provided column and direction
      // If direction is not provided, then toggle 'asc' and 'desc'
      if( this.__sortCol === column ){
        this.__sortDir = direction ? (direction === 'asc' ? 'asc' : 'desc') : (this.__sortDir === 'asc' ? 'desc' : 'asc');
      }
      else {
        this.__sortDir = direction === 'asc' ? 'asc' : 'desc';
        this.__sortCol = column;
      }

      var page = this.isPagingEnabled ? { p: this.__pageCurrent = 1, s: this.__pageSize } : {};
      
      this.data[this.__loader](_.extend({ c: this.__sortCol, d: this.__sortDir }, page), this);
    },
    
    action: function(name, model, column, cell){
      // Preset actions
      if(name === 'edit') {
        if( this.isEditable(model, column) ){
          this.editBegin(model, column, cell);
        }
      }
      // Custom actions are defined in the model
      else {
        model[name] && model[name]( this, column.name );
      }
    },
    
    editBegin: function(model, column, cell) {      
      var offset = cell.offset();
      var pos    = cell.position();
      var ch     = cell.outerHeight();
      var cw     = cell.outerWidth();
      var hh     = this.__head.outerHeight(true);
      var fh     = this.__foot ? this.__foot.outerHeight(true) : 0;
      var panel  = this.panel;
      var val    = model.get(column.name);
      var pos    = cell.position(), h = cell.outerHeight(), w = cell.outerWidth(); 
      var field  = fields[column.type] || fields.text;
      
      // The edited cell is outside the panel view. We need to scroll it back into view.
      if( pos.top + ch > panel.__contentTop + panel.__wrapperH - fh ) {
        panel.scrollTo('v', pos.top + ch + 2 - panel.__wrapperH + fh);
        offset = cell.offset(); // We scrolled, we need to take new measurements
      }
      else if( pos.top < panel.__contentTop + hh + 5 ) {
        panel.scrollTo('v', pos.top - hh - 5 );
        offset = cell.offset(); // We scrolled, we need to take new measurements
      }
      
      // Lock the panel to prevent accidental scrolling
      panel.lock();
      
      // References to the currently edited cell
      this.__editedCell = { model: model, column: column, cell: cell };
      this.__editField = field;
      this.__editField.__grid = this;
            
      // Move the field in the correct position
      field.element.css({ 
        top: Math.ceil(offset.top + (ch - field.element.outerHeight(true)) / 2),
        left: Math.ceil(offset.left + (w - field.element.outerWidth(true)) / 2)
      });
            
      if(column.type === 'text') {
        field.val(val);
      }
      else if(column.type === 'number'){
        field.option('format', column.format);
        field.val(val);
      }
      else if(column.type === 'date'){
        field.option('format', column.format);
        field.val(val);
      }
      else if(column.type === 'boolean'){
        
      }
      else if(column.type === 'enum'){
        field.disable();
        field.val(null);
        field.element.addClass('shown loading');

        function next(items){
          field.reset(items);
          field.val(val);
          field.enable();
          field.element.removeClass('loading').focus().select();
        }

        _.isFunction(column.items) ? column.items(model, next) : _.defer(next, model, column.items);
        return;
      }

      _.defer(function(){ 
        field.element.addClass('shown').focus().select();
      });
    },

    editEnd: function() {
      var ec   = this.__editedCell;
      var ef   = this.__editField;
      var type = ec.column.type;
      
      // We are caching the selected item for the enum
      // because it could be fetched with ajax.
      if( type === 'enum' ) {
        ec.model.attributes[ ec.column.name + ':items' ] = ef.getItems();
      }
      ec.model.set(ec.column.name, ef.val());

      this.__editedCell = null;
      this.__editField.__grid = null;
      this.__editField.__labk = false;
      this.__editField.element.removeClass('shown');
      this.__editField = null;
      this.panel.unlock();      
    },
    
    
    isEditable: function(model, column) {
      return 'editable' in column 
        ? _.isFunction(column.editable) 
          ? column.editable(model)
          : column.editable
        : _.isFunction(column.actions)
          ? column.actions(model).indexOf('edit') > -1
          : false;
    },
    
    /**
     * Returns the `cid` of the row and the column name
     * that's supposed to be edited next after a navigation button is pressed.
     * It is determined relative to the currently edited cell.
    **/
    getOffsetField: function(model, column, direction) {
      var order = this.__order;
      var col   = column.name;
      var f, i, c = column;

      if(direction[0]){
        i = this.__order.indexOf( column.name ) + direction[0];
        
        if(i === this.__order.length) {
          i = 0;
        }
        else if(i < 0) {
          i = this.__order.length - 1;
        }
        
        while( (c = this.__columns[ this.__order[ i ] ]) !== column ) { 
          if(this.isEditable(model, c)) {
            break;
          }
          
          i += direction[0];
          if(i === this.__order.length) {
            i = 0;
          }
          else if(i < 0) {
            i = this.__order.length - 1;
          }
        }
      }

      if(direction[1]){
        while(1){
          i = this.data.indexOf(model) + direction[1];
          i = i >= this.data.length ? 0 : i < 0 ? this.data.length - 1 : i;
          model = this.data.at(i);

          if( this.isEditable(model, c) ){
            break;
          }
          if(!model) {
            model = direction[1] > 0 ? this.src.first() : this.src.last();
            if( this.isEditable(model, c) ){
              break;
            }
          }
        }
      }

      return { model: model, column: c };
    }
  }

  var actionPanel   = $('<div class="amp-grid-actions"></div>');
  var direction     = false;

  fields.text   = $("<input class='amp-grid-field' tabindex='-1'>").amp('text', { validator: {} });
  fields.number = $("<input class='amp-grid-field' tabindex='-1'>").amp('number', { validator: {} });
  fields.date   = $("<input class='amp-grid-field' tabindex='-1'>").amp('datepicker', { validator: {} });
  fields.enum   = $("<input class='amp-grid-field' tabindex='-1'>").amp('combo', { items: [] });

  _.each(fields, function(field){

    field.element.on({
      blur: function(e){
        var next, grid, cell;
        
        if( grid = field.__grid ) {
          next = direction && grid.getOffsetField(grid.__editedCell.model, grid.__editedCell.column, direction);
          grid.editEnd();

          if(next) {
            cell = grid.panel.content.find('td[row=' + grid.data.indexOf(next.model) + '][col=' + next.column.name + ']');
            grid.editBegin(next.model, next.column, cell)
          }

          return direction = false;
        }
      },

      keydown: function(e){
        var sel, tlen, caretPos, self = $(this);
        var len = this.value.length;
        
        // Get Caret Position
        if ('selectionStart' in this) {   // Standards-compliant browsers
          caretPos = this.selectionStart;
        }
        else if (document.selection) {    // IE
          this.focus();
          sel  = document.selection.createRange();
          tlen = document.selection.createRange().text.length;
          sel.moveStart('character', -len);
          caretPos = sel.text.length - tlen;
        }
        
        if( e.which === Amp.keys.ESCAPE ) {
          field.__grid.editEnd();
        }
        if( e.which !== Amp.keys.ENTER ) {
          if( !(direction = directions[ e.which ]) ) return;
          if( e.which === 39 && caretPos !== len ) return;
          if( e.which === 37 && caretPos !== 0 ) return;
          if( e.which === 37 && caretPos === 0 && !field.__labk ) {
            // The __labk property indicates that we're at the edge of the selection. 
            // Pressing the arrow once more will change the edited field.
            field.__labk = true; 
            return;
          }
          if( e.shiftKey && e.which === 9 ) {
            direction = [-1, 0];
          }
        }
        else {
          return;
        }

        // Can't allow up/down navigation for lists
        if(field === fields.enum && direction && direction[1]) {
          direction = false;
          return;
        }

        self.trigger('blur', direction);
        return false;
      }
    });

    $(document.body).prepend(field.element);
  });


  $(function(){

    $(document.body)

    .delegate('table.amp-grid td', {
      dblclick: function(){
        var cell = $(this);
        var grid = cache[ cell.attr('grid') ];
        var model = grid.data.at(cell.attr('row'));
        var column = grid.__columns[cell.attr('col')];
        grid.action('edit', model, column, cell);
      }
    })

    .delegate('td.paginator a.amp-grid-page', 'click', function(){
      var self = $(this);
      cache[ self.data('grid') ].paginate( self.data('page') );
    })

    .delegate('td.paginator input', 'keydown', function(e){
      if(e.which !== 13) {
        return;
      }

      var self = $(this);
      var page = parseInt(self.val(), 10);
      var grid = cache[self.data('grid')];

      (isNaN(page) || page < 1 || page > grid.__pageTotal) && (page = grid.__pageCurrent);
      (page === grid.__pageCurrent) ? self.val(page) : grid.paginate(page);
    })

    .delegate('div.amp-header-grid th.sortable', 'click', function(){
      var self = $(this);
      console.log("ASD", self.data('col'))
      cache[ self.data('grid') ].sort( self.data('col') );
    })
  });

  Amp.controls.grid = Grid;
})();