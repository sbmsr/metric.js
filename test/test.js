var request = require('supertest');
var data = require('./data');

/*

  Webserver does 4 things :
    1) Create metrics
    2) Retrieve Metrics
    2) Push values to metrics
    3) Calculate summary statistics

  Each test suite examines the functionality
  of each of these attributes above.

*/

beforeEach(function () {
  app = require('../metric_testable')();
});

afterEach(function (done) {
  app.close(done);
});

// 1. Metric Creation (POST ~ api/metrics)

describe('verifying metric instantiation', function() {

  data.invalidInitMetricQueries.forEach(function(query){
    var queryString = JSON.stringify(query.jsonInput)
    it('fails on invalid query : ' + queryString, function() {
      request(app)
      .post('/api/metrics')
      .send(query.jsonInput)
      .expect(query.expected)
    })
  })

  data.validInitMetricQueries.forEach(function(query){
    var queryString = JSON.stringify(query.jsonInput)
    it('passes on valid query : ' + queryString, function() {
      request(app)
      .post('/api/metrics')
      .send(query.jsonInput)
      .expect(query.expected)
    })
  })

  it('responds with proper json header', function(done) {
    request(app)
    .get('/')
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(200, done);
  })
})

// 2. Retrieve Metrics (GET ~ api/metrics)

describe('verifying metric retrieval', function() {

  it('retrieves {} for empty db', function(done) {
    request(app)
      .get('/api/metrics')
      .expect(200, data.emptyMetric, done)
  })

  data.validGetAllMetricsQueries.forEach(function(query){
    var queryString = JSON.stringify(query.jsonInput)
    it('obtains correct db after init query : ' + queryString, function(done) {
      request(app)
      .post('/api/metrics')
      .send(query.jsonInput)
      .end(function(err, res) {
        if(err) done(err)
        request(app)
        .get('/api/metrics')
        .expect(200, query.expectedResult, done)
      })
    })
  })
})

// 3. Pushing values (POST ~ api/metrics/{:id})

describe('verifying insertion for metrics', function() {

  it('fails to insert for nonexistent metrics', function () {
    for(var i = 0; i < 10; i++) {
      request(app)
      .post('/api/metrics/:i')
      .send({"value" : i})
      .expect(400)
    }
  });

  data.invalidInputValues.forEach(function(invalidInput){
    var invalidInputString = JSON.stringify(invalidInput);
    it('fails to insert invalid value \'' + invalidInputString + '\' into non-empty app', function (done) {
      request(app)
      .post('/api/metrics')
      .send(data.validInitMetricQueries[0].jsonInput)
      .end(function(err, res) {
        if(err) done(err)
        request(app)
        .post('/api/metrics/0')
        .send({"value" : invalidInput})
        .expect(400, done)
      })
    })
  })

  data.validInputValues.forEach(function(validInput){
    var validInputString = JSON.stringify(validInput);
    it('successfully insert valid value \'' + validInputString + '\' into non-empty app', function (done) {
      request(app)
      .post('/api/metrics')
      .send(data.validInitMetricQueries[0].jsonInput)
      .end(function(err, res) {
        if(err) done(err)
        request(app)
        .post('/api/metrics/0')
        .send({"value" : validInput})
        .expect(200, done)
      })
    })
  })
});

// 3. Summary statistic calculations

describe('verifying summary statistic calculations for metrics', function() {
  it('');
});
