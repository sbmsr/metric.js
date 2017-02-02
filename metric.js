var express = require('express')
var bodyParser = require('body-parser');
var app = express()

var port = 3000

app.use(bodyParser.json()); // for parsing application/json

app.listen(port)

/*
  decided to keep unordered list. Reasoning is as follows :
  we are likely gonna push values more than we are gonna request statistics.
  thus, we want pushes to be "faster".
  - ordered lists have O(n) pushes, but O(1) statistics.
  - unordered lists have O(1) pushes, but O(n) statistics.
*/

var db = {}
var lastID = 0

app.get('/', function (req, res) {
  res.send('<h1>Welcome to Metric.js</h1>')
})

/*

      ~ POST (/api/metrics) : Creates new metrics

      ~ Expected JSON input
        - name (string)
        - (optional) values ([numbers])

      ~ JSON output
        - "status" : http result status code (int)
        - "id"     : id of newly created metric (string)

 */

app.post('/api/metrics', function (req, res) {
  if (!("name" in req.body)) {
    res.status(400).json({"status": 400 , "message" : "Bad request ; missing \"name\""});
    return
  }

  var req = req.body

  var name = req["name"]
  var values = []
  var max = null
  var min = null
  var sum = null
  var med = null
  var isValid = false

  if ("values" in req) {
    values = req["values"]

    if (values.constructor !== Array) {
      res.status(400).json({"status": 400 , "message" : "Bad request ; values should be of type Array"});
      return
    }

    if (values.some(isNaN)) {
      res.status(400).json({"status": 400 , "message" : "Bad request ; values should all be numeric"});
      return
    }

    max = values[0]
    min = values[0]
    sum = 0
    med = values[0]

    for (var i = 0; i < values.length; i++) {
      sum += values[i]
      if (max < values[i]) max = values[i]
      if (min > values[i]) min = values[i]
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
  }

  var id = lastID.toString()
  db[id] = metric

  lastID += 1

  console.log(db)

  res.status(200).json({ "status": 200 , "id" : id});
})

/*

      ~ GET (/api/metrics/:id) : gets summary statistics for
                                 metric with id = :id

      ~ No input expected

*/

app.get('/api/metrics/:id', function (req, res) {
  var id = req.params.id

  if (isNaN(id)) {
    res.status(400).json({"status": 400 , "message" : "Bad request ; id should be numeric"});
    return
  } else { // know its a number, but is it an int?
    if (id % 1 !== 0) { // does it have remainder?
      res.status(400).json({"status" : 400, "message" : "Bad Request ; id should be int"})
      return
    }
  }

  id = id.toString()

  if (!(id in db)) {
    res.status(400).json({"status" : 400, "message" : "Bad Request ; id not in db"})
    return
  }

  var metric = db[id]

  if (metric.values.length === 0) {
    res.status(400).json({"status" : 400, "message" : "Metric is empty ; Insert some values first."})
    return
  }

  var min = metric.min
  var max = metric.max
  var med = metric.med.val
  var mean = metric.sum/metric.values.length

  if (!metric.med.isValid) {
    med = calculateMedian(metric.values)
    db[id].med.isValid = true
  }

  var JSONres = {
    "status": 200,
    "summary_statistics" :
    {
      "min" : min,
      "max" : max,
      "med" : med,
      "mean" : mean
    }
  }

  JSONres = JSON.stringify(JSONres)

  res.status(200).json(JSONres)
  return
})

function calculateMedian(values) {
  if (values.length === 0) {
    return null
  }

  var median = null
  var midpoint = values.length/2
  values = values.sort()

  if (values.length % 2 === 0) {
    median = (values[midpoint] + values[midpoint-1])/2
  } else {
    midpoint = Math.floor(midpoint)
    median = values[midpoint]
  }

  return median
}

app.post('/api/metrics/:id', function (req, res) {
  
})
