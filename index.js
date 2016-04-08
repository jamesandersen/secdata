var MongoClient = require('mongodb').MongoClient,
   xbrlfetch = require('./xbrlfetch'),
   assert = require('assert');
 

/*
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
*/

function insertDocuments(db, callback) {
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

// http://stackoverflow.com/questions/25338608/download-all-stock-symbol-list-of-a-market
/*
Promise.all([
      xbrlfetch.fetchLast10K("AAPL"), 
      //xbrlfetch.fetchLast10K("AMZN"), 
      //xbrlfetch.fetchLast10K("GOOG"), 
      xbrlfetch.fetchLast10K("MSFT")])
    .then(function (filing) {
        console.log(JSON.stringify(filing, null, 2));
        console.log(`Name\t\t\t${filing[0].EntityRegistrantName}\t${filing[1].EntityRegistrantName}`);
        console.log(`Revenues\t\t${filing[0].Revenues}\t${filing[1].Revenues}`);
        console.log(`Gross Profit\t\t${filing[0].GrossProfit}\t${filing[1].GrossProfit}`);
        console.log(`Operating Income\t${filing[0].OperatingIncomeLoss}\t${filing[1].OperatingIncomeLoss}`);
        console.log(`Before Tax\t\t${filing[0].IncomeFromContinuingOperationsBeforeTax}\t${filing[1].IncomeFromContinuingOperationsBeforeTax}`);
        console.log(`After Tax\t\t${filing[0].IncomeFromContinuingOperationsAfterTax}\t${filing[1].IncomeFromContinuingOperationsAfterTax}`);
        console.log(`Net Income\t\t${filing[0].NetIncomeLoss}\t${filing[1].NetIncomeLoss}`);
    })
    .catch(function (err) {
        console.error(err);
    });
    */
    
/*xbrlfetch.fetchLast10K("AMZN")
   .then(function (filing) {
        console.log(JSON.stringify(filing, null, 2));
    })
    .catch(function (err) {
        console.error(err);
    });*/
 
/*
 xbrlfetch.fetchFilingsList("MSFT", "10-Q,10-K")
    .then(function (filing) {
        console.log(JSON.stringify(filing, null, 2));
    })
    .catch(function (err) {
        console.error(err);
    });
*/

xbrlfetch.fetchNYSESymbols()
   .then(function(symbolData) {
      console.log(`successfully got NASDAQ ${symbolData.length} symbols`);
   })
   .catch(function() {
      console.error('failed to get NASDAQ symbols');
   });