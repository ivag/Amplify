/**
 * This is a node.js development server for Amp.
 * It requires Node.js Connect https://github.com/senchalabs/connect
 * 
 * If you want to develop or demo Amp, instead of 
 * opening the index.html file run "node server.js" in your 
 * shell and visit http://localhost:3000.
 * 
 * If you don't/can't have node then just open the index.html file 
 * and remove all "/static" prefixes on included .js and .css files.
**/
var fs      = require('fs');
var path    = require('path');
var connect = require('connect');
var http    = require('http');
var server  = connect();

var countries = JSON.parse( fs.readFileSync("static/data/countries.json") );

server.use(connect.query());
server.use('/static/build', connect.static( path.normalize(path.join(__dirname + '/../build')) ));

server.use('/static', connect.static( path.join(__dirname + '/static')  ));
server.use('/static', function(req, res, next){
  res.writeHead(404, "Not Found");
  return res.end("Page Not Found");
});



var data = [
  { name: "Black Shoes",       date: "2010-11-12", cost: 1199.00, color: "#000", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A" },
  { name: "Red Socks",         date: "2003-01-03", cost: 59.99, color: "#f00", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Blue Sweater",      date: "2015-01-14", cost: 499.00, color: "#00f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Yellow Pants",      date: "2013-11-14", cost: 749.95, color: "#ff0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Green Shorts",      date: "2012-11-15", cost: 1000.00, color: "#0f0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Pink Meat",         date: "2013-06-05", cost: 449.99, color: "#ff9", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Orange Banana",     date: "2013-08-20", cost: 4.13, color: "#fc3", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Peach Apple",       date: "2011-05-23", cost: 5.48, color: "#f49", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Purple Ions",       date: "2003-10-36", cost: 44221012095.95, color: "#f0f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Brown Sugar",       date: "2009-06-30", cost: 0.75, color: "#651", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Red Herring",       date: "2004-11-12", cost: 1199.00, color: "#000", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A" },
  { name: "Blue Monday",       date: "2000-01-03", cost: 59.99, color: "#f00", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Black Death",       date: "2001-01-14", cost: 499.00, color: "#00f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Yellow Underpants", date: "2003-11-14", cost: 749.95, color: "#ff0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Cardinal Red",      date: "2004-11-15", cost: 1000.00, color: "#0f0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Monsanto Grey",     date: "2013-06-05", cost: 449.99, color: "#ff9", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Golden Johnson",    date: "2013-08-20", cost: 4.13, color: "#fc3", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Brown Nose",        date: "2012-05-23", cost: 5.48, color: "#f49", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "White Chocolate",   date: "2009-10-36", cost: 44221012095.95, color: "#f0f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Pink Panther",      date: "2004-06-30", cost: 0.75, color: "#651", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Green Weed",        date: "2011-11-12", cost: 1199.00, color: "#000", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A" },
  { name: "Orange Box",        date: "2012-01-03", cost: 59.99, color: "#f00", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Yellow Banana",     date: "2006-01-14", cost: 499.00, color: "#00f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Aquamarine Marine", date: "2008-11-14", cost: 749.95, color: "#ff0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Rezeda Cupboard",   date: "2013-11-15", cost: 1000.00, color: "#0f0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Apricot Jam",       date: "2013-06-05", cost: 449.99, color: "#ff9", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Green Fig",         date: "2013-08-20", cost: 4.13, color: "#fc3", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Orange Leaf",       date: "2012-05-23", cost: 5.48, color: "#f49", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Bloody Red",        date: "2009-10-36", cost: 44221012095.95, color: "#f0f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Black Ninja",       date: "2000-06-30", cost: 0.75, color: "#651", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Gandalf the Grey",  date: "2011-11-12", cost: 1199.00, color: "#000", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A" },
  { name: "Gandalf the White", date: "2012-01-03", cost: 59.99, color: "#f00", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Blue Mangroup",     date: "2013-01-14", cost: 499.00, color: "#00f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Teal Protoss",      date: "2013-11-14", cost: 749.95, color: "#ff0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Purple Rain",       date: "2013-11-15", cost: 1000.00, color: "#0f0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Dark Matter",       date: "2013-06-05", cost: 449.99, color: "#ff9", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Silver Surfer",     date: "2013-08-20", cost: 4.13, color: "#fc3", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Bronze Monument",   date: "2012-05-23", cost: 5.48, color: "#f49", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Ruby Gem",          date: "2001-10-36", cost: 44221012095.95, color: "#f0f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Sapphire Radeon",   date: "2000-06-30", cost: 0.75, color: "#651", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Orange Reef",       date: "2011-11-12", cost: 1199.00, color: "#000", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A" },
  { name: "White Boat",        date: "2012-01-03", cost: 59.99, color: "#f00", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Transparent Glass", date: "2013-01-14", cost: 499.00, color: "#00f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Blue Deep Sea",     date: "2013-11-14", cost: 749.95, color: "#ff0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Black Widow",       date: "2013-11-15", cost: 1000.00, color: "#0f0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "White Light",       date: "2013-06-05", cost: 449.99, color: "#ff9", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Brown Monkeys",     date: "2013-08-20", cost: 4.13, color: "#fc3", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Metallic Wrench",   date: "2012-05-23", cost: 5.48, color: "#f49", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Mahagony Fox",      date: "2009-10-36", cost: 44221012095.95, color: "#f0f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Cherry Pie",        date: "2000-06-30", cost: 0.75, color: "#651", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Tan Tent",          date: "2011-11-12", cost: 1199.00, color: "#000", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A" },
  { name: "Blue Suede",        date: "2012-01-03", cost: 59.99, color: "#f00", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Yellow Linens",     date: "2013-01-14", cost: 499.00, color: "#00f", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  },
  { name: "Dark Iron",         date: "2013-11-14", cost: 749.95, color: "#ff0", info1: "N/A", info2: "N/A", info3: "N/A", info4: "N/A", info5: "N/A"  }
];

/**
 * Query arguments:
    c - sort column
    d - sort direction
    p - page number
    s - page size
**/
server.use('/grid', function(req, res, next){
  var query = req.query, page = query.p || 1, size = query.s || data.length - 1;
  
  if(query.c && query.d) {
    data.sort(function(a, b){
      return (query.d === 'asc' ? 1 : -1) * (a[query.c] > b[query.c] ? 1 : a[query.c] < b[query.c] ? -1 : 0);
    });
  }
  
  res.end(JSON.stringify( data.slice((page - 1) * size, page * size)));
});

server.use('/ajax', function(req, res, next){
  if(req.query.v) {
    var filter = function(count){
      return count.value == req.query.v;
    }
  }
  else {
    var filter = function(count){
      return ~count.label.toLowerCase().indexOf((req.query.q || "").toLowerCase());
    }
  }
  
  setTimeout(function(){
    res.writeHead(200, {'Content-Type': 'application/json'});    
    res.end( JSON.stringify(countries.filter(filter), 'utf-8') );
  }, 400); // Simulate slow server
});


server.use('/data', function(req, res, next){
  setTimeout(function(){
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(fs.readFileSync('js/data.json'));
  }, 100); // Simulate slow server
});



server.use('/build', function(req, res, next){
  res.writeHead(200, {'Content-Type': 'text/html'});
  fs.createReadStream("index_build.html").pipe(res);
});

server.use('/', function(req, res, next){
  res.writeHead(200, {'Content-Type': 'text/html'});
  fs.createReadStream("index.html").pipe(res);
});

http.createServer(server).listen(3000);
console.log("Development server running at 127.0.0.1:3000. Powered by Node.js " + process.versions.node + ".");
