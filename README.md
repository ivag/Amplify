# Amp v2.0 (alpha)

### Requirements:

- jQuery 1.9.1
- Underscore JS 1.4.1
- Backbone JS 1.0.0

### Examples:

    // Make an Amp control from an existing element
    var myDate = $('#my-date').amp("date", { format: "ISO" });

    // Or an element outside the DOM
    var myNumber = $('<input type="text">').amp("number", { format: 2 });

    // Getting a reference to an existing amp control
    $('#amp-element').amp();
    console.log( myDate === $('#my-date').amp() ); // Prints 'true'

    // Get or set the value of a control
    myDate.val();				    // Returns a date object or `null`
    myDate.val(new Date()); // Sets the date and updates the <input> with the correct format


### Available Controls

- Text input (text)
- Number input (number)
- Simple date input (date)
- Calendar date input (datepicker)
- Simple Button (button)
- Toggle button (checkbox)
- Toggle button (radio)
- Multiple select list (list)
- Single select dropdown (select)
- Single select with autocomplete (combo)
- Data Grid (grid) (non-standard)


### Initializing a control

This is how a jQuery selector can be initialized as an Amp control.

    var handle = $('#selector').amp(type, options);

### Common options, methods and events

The following options and events are applicable to all controls except for the grid:

#### Options

- **value** - the starting value of the control
- **disabled** - the starting state of the control
- **validators** - an array of functions to validate the value

#### Methods

- **enable** - enables the control
- **disable** - disables the control
- **val** - gets or sets the value
- **option** - gets or sets options after initialization
- **validate** - runs the validators and triggers 'validationError' if not silenced
- **on** - binds an event listener
- **off** - unbinds an event listener
- **trigger** - triggers an event

#### Events

- **change** - triggers when the control's value changes
- **validationError** - triggers when the controls validators fail. Always after the **change** event



### Simple Button

### Checkbox Button

### Radio Button

### Text Input

### Date Input

### Datepicker Input

### List

### Select Dropdown

### Autocomplete Dropdown



### Data Grid

TODOS: 
- Make more actions possible. 
- Make "composite" type
- Mark editable cells with an icon
- Make columns resizable and a horizontal scrollbar


The Data Grid is a different kind of control that links to a Backbone collection 
and is used to display and manipulate it in a tabular way. Each model in the collection
represents a row, and each model's attribute can represent a column.

#### Example Initialization with a Backbone collection
    
    var config = {
      loader:     'getData',
      pagination: { pageSize: 20, dataSize: 60, links: 7 },
      sorting:    { column: 'name', direction: 'asc' },
      columns: [{
        hattrs:   { style: { width: '150px' } },
        cattrs:   { style: { background: '#ededed' } },
        sortable: true,
        title:    "Name",
        name:     "name",
        type:     "text",          
        editable: true,
        sortable: true,
        content:  function(model){ 
          return "The name is: " + model.get('name'); 
        }
      },{
        title:    "Cost",
        name:     "cost",    
        type:     "number",    
        format:   4,
        actions:  function(){ 
          return [ 'edit' ]; // Same as editable: true
        }
      },{
        title:    "Date",
        name:     "date",
        type:     "date",
        format:   "ISO"
      },{
        title:     "Color",
        name:      "color",
        type:      "enum",
        editable:  true,
        itemcache: colors,
        items:     [{ value: "#f00", label: "red" }, { value: "#00f", label: "blue" }],
      },{ 
        title:    "Country", 
        name:     "info1", 
        type:     "enum",
        editable: true
        items:    function(model, callback){
          if(!callback) return [];
          $.ajax('/countries?model_id=' + model.get('id), {
            success: callback,
            error: function(){}
          });
        }          
      }]
    };

    var Items = Backbone.Collection.extend({
      model: Item,
      initialize: function(){
        var grid = $('#grid-container').amp('grid', { data: this, config: config });

        this.on('reset', function(){
          grid.render();
        });

        this.getData({ p: 1, s: 20 });
      },

      getData: function(params, grid){
        var self = this;

        $.ajax("/grid", {
          data: params,
          dataType: 'json',
          success: function(items){
            self.reset(items);
          }
        });
      }
    });

    new Items();

#### Configuration

The grid in the example is initialized with the following line:

    var grid = $('#grid-container').amp('grid', { data: this, config: config });

The options cotained are "data" which is a reference to the Backbone collection, and "config"
which contains the configuration object defined earlier. The configuration object in the example
has a combination all the possible options for the grid.

- **loader** - This is a name of a method of the data collection that is used to fetch more data 
               and reset the collection. It is used mostly for initally loading data via ajax, or
               when the grid is sorted and paginated (for large datasets). The method will be passed
               2 arguments: a reference to the grid and an object of querystring parameters:
   - p: The page requested (1-indexed)
   - s: The page size of the grid
   - c: The column name that the grid is sorted by
   - d: The sorting direction ('asc' or 'desc')

- **pagination** - This is the configuration for the pagination
   - pageSize: The number of rows to show per page
   - dataSize: The number of total rows
   - links: The number of pagination links shown

- **sorting** - This is the sorting configuration
   - column: The default column to sort by
   - direction: The default direction to sort by

- **columns** - This is the main part of the configuration 




## Design Notes

### List scrolling
List scrolling is done using aboslutely positioned elements inside a container with overflow:hidden. 
We use the css "top" and "left" proerties because they seem to be faster than scrollTop and scrollLeft.
See this benchmark http://jsperf.com/translate3d-vs-xy/13


Each control triggers a set of events based on what is happening at the moment.

#### "change" events

The **change** event is triggered whenever the value of the control changes, 
whether by modifying the user interface or by programatically setting a new value for the controls.
If we set the *same* value to a control, no event will be fired. The **change** event is normally triggered when the control blurs.

#### "type" events

The **type** event is triggered whenver a user types into an input control, therefore changing the text contents of the DOM element.
This *does not* trigger a change event (that one is triggered on blur). However, passing `realtime: true` to the initialization options
will prevent the control from firing **type** events, and instead, it will fire **change** events - changing it's value as you type.

#### "open" events

The **open** event is triggered whenver a control that can be figuratively open is open. This goes for select lists, for combo lists and for modal dialogs.

#### "close" events

The **close** event is triggered whenver a control that can be figuratively closed is closed. This goes for select lists, for combo lists and for modal dialogs.