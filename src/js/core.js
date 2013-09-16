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
