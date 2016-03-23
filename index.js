var MongoClient = require('mongodb').MongoClient,
   rp = require('request-promise'),
   secret = require('./secret.json'),
   assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/myproject';
// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");
  
  insertDocuments(db, function() {
    db.close();
  });
});

var insertDocuments = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('documents');
  // Insert some documents
  collection.insertMany([
    {a : 1}, {a : 2}, {a : 3}
  ], function(err, result) {
    assert.equal(err, null);
    assert.equal(3, result.result.n);
    assert.equal(3, result.ops.length);
    console.log("Inserted 3 documents into the document collection");
    callback(result);
  });
}

var options = {
    uri: 'https://www.quandl.com/api/v3/datasets/SEC/AAPL_SALESREVENUENET_Q.json',
    qs: {
        api_key: secret.quandl_api_key // -> uri + '?access_token=xxxxx%20xxxxx'
    },
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true // Automatically parses the JSON string in the response
};

rp(options)
    .then(function (resp) {
        console.log('Dataset has %d data', resp.dataset.data.length);
    })
    .catch(function (err) {
        console.error(error);
    });