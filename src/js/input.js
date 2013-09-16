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
})();