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