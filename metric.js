
/*

  Design Decisions :
  Decided to keep unordered list for metric vals. Reasoning is as follows :
    - we are likely gonna push values more than we are gonna request statistics.
      thus, we want pushes to be "faster".
      - ordered lists have pushes running at O(n), but O(1) statistics.
      - unordered lists have pushes running at O(1), but O(n) statistics.
*/

var express = require('express');
var bodyParser = require('body-parser'); // for parsing application/json
var app = express();

var port = 3000;

app.use(bodyParser.json());
app.listen(port);

var db = {};
var lastID = 0;

app.get('/', function (req, res) {
  res.send('<h1>Welcome to Metric.js</h1>');
});

/*

~ GET (/api/metrics) : Retrieve all metrics

~ No input expected

~ JSON output
  - "status" : http result status code (int)
  - "metrics" : collection of all metrics (dictionary)

~ Expected Runtime : O(n)
  - printing dictionary of size n

~ Expected Space : N/A
  - memory is unaltered when this function is called

*/

app.get('/api/metrics', function (req, res, next) {
  res.json({status:"200", metrics: db});
  return next();
});

/*

~ POST (/api/metrics) : Creates new metrics

~ Expected JSON input
  - name (string)
  - (optional) values ([numbers])

~ JSON output
  - "status" : http result status code (int)
  - "id"     : id of newly created metric (string)

~ Expected Runtime : O(n)
  - input of size n is parsed (max/min/sum are computed in one pass),
    and then inserted into a dictionary (a constant time operation)

~ Expected Space : O(n)
  - input of size n is stored

*/

app.post('/api/metrics', function (req, res, next) {
  if (!("name" in req.body)) {
    res.status(400).json({"status": 400 , "message" : "Bad request ; missing \"name\""});
    return next();
  }

  var body = req.body;

  var name = body.name;
  var values = [];
  var max = null;
  var min = null;
  var sum = null;
  var med = null;
  var isValid = false;

  if ("values" in body && body.values.length !== 0) {
    values = body.values;

    if (values.constructor !== Array) {
      res.status(400).json({"status": 400 , "message" : "Bad request ; values should be of type Array"});
      return next();
    }

    if (values.some(isNaN)) {
      res.status(400).json({"status": 400 , "message" : "Bad request ; values should all be numeric"});
      return next();
    }

    max = values[0];
    min = values[0];
    sum = 0;
    med = values[0];

    for (var i = 0; i < values.length; i++) {
      sum += values[i];
      if (max < values[i]) max = values[i];
      if (min > values[i]) min = values[i];
    }
  }

  var metric = {
    'name'    : name,       // name of metric
    'values'  : values,     // list of values
    'max'     : max,        // max metric value
    'min'     : min,        // min metric value
    'sum'     : sum,        // sum of values (for avg computation)
    'med'     : {
      'val' : med,          // median metric value
      'isValid' : isValid   // is median valid?
    }
  };

  var id = lastID.toString();
  db[id] = metric;

  lastID += 1;

  res.status(200).json({ "status": 200 , "id" : id});
  return next();
});

function idParamIsValid(id) {
  if (isNaN(id)) {
    return false;
  } else { // know its a number, but is it an int?
    if (id % 1 !== 0) { // does it have remainder?
      return false;
    }
  } return true;
}


function calculateMedian(values) {
  if (values.length === 0) {
    return null;
  }

  var median = null;
  var midpoint = values.length/2;
  values = values.sort();

  if (values.length % 2 === 0) {
    median = (values[midpoint] + values[midpoint-1])/2;
  } else {
    midpoint = Math.floor(midpoint);
    median = values[midpoint];
  }

  return median;
}

/*

~ GET (/api/metrics/:id) : gets summary statistics for metric with id == :id

~ No input expected

~ JSON output
  - status : http result status code (int)
  - summary_statistics : dictionary containing min, max, median, and mean

~ Expected Runtime : O(n)
  - the only calculation is the median computation, which uses
    Array.sort(). The impl. by Mozilla (presumably used in Node), relies on
    mergesort (source : http://stackoverflow.com/a/234808/2465644), which
    has expected runtime O(n log n)

~ Expected Space : O(n)
  - assuming mergesort, the median computation requires another array of
    size n to sort the initial array.

*/

app.get('/api/metrics/:id', function (req, res, next) {
  var id = req.params.id;

  if (!idParamIsValid(id)) {
    res.status(400).json({"status" : 400, "message" : "Bad Request ; id should be int"});
    return next();
  }

  id = id.toString();

  if (!(id in db)) {
    res.status(400).json({"status" : 400, "message" : "Bad Request ; id not in db"});
    return next();
  }

  var metric = db[id];

  if (metric.values.length === 0) {
    res.status(400).json({"status" : 400, "message" : "Metric is empty ; Insert some values first."});
    return next();
  }

  var min = metric.min;
  var max = metric.max;
  var med = metric.med.val;
  var mean = metric.sum/metric.values.length;

  if (!metric.med.isValid) {
    med = calculateMedian(metric.values);
    db[id].med.isValid = true;
  }

  var resObj = {
    "status": 200,
    "summary_statistics" :
    {
      "min" : min,
      "max" : max,
      "med" : med,
      "mean" : mean
    }
  };

  res.status(200).json(resObj);
  return next();
});

/*

~ POST (/api/metrics/:id) : post value to metric with id == :id

~ Expected JSON input
  - value (number)

~ JSON output
  - "status" : http result status code (int)
  - 400 : push failed (read message for details)
  - 200 : push successful

~ Expected Runtime : O(1)
  - when inserting a new value, we check its relationship with the min,
    the max, and add it to the sum, all of which are constant time ops.

~ Expected Space : O(1)
  - only one new element is added, so we need one more array slot for said
    element.

*/

app.post('/api/metrics/:id', function (req, res, next) {

  if (!("value" in req.body)) {
    res.status(400).json({"status": 400 , "message" : "Bad request ; missing \"value\""});
    return next();
  }

  var val = req.body.value;
  var id = req.params.id;

  if (!idParamIsValid(id)) {
    res.status(400).json({"status" : 400, "message" : "Bad Request ; id should be int."});
    return next();
  }

  if (!(id in db)) {
    res.status(400).json({"status" : 400, "message" : "Bad Request ; id not in db"});
    return next();
  }

  var metric = db[id];

  metric.values.push(val);

  metric.sum += val;

  if (metric.min === null) { // first val being added, so min is null
    metric.min = val;
  } else {
    if (metric.min > val) {
      metric.min = val;
    }
  }

  if (metric.max === null) { // first val being added, so max is null
    metric.max = val;
  } else {
    if (metric.max < val) {
      metric.max = val;
    }
  }

  if (metric.med.isValid) { // median is no longer valid
    metric.med.isValid = false;
  }

  db[id] = metric;

  var resObj = {"status": 200};

  res.status(200).json(resObj);
  return next();
});
