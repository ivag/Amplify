;(function(){
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
