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
