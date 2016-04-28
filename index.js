var MongoClient = require('mongodb').MongoClient,
   co = require('co'),
   xbrlfetch = require('./xbrlfetch'),
   assert = require('assert');


co(function*() {
  // Connection URL
  var db = yield MongoClient.connect('mongodb://localhost:27017/secdata');
  console.log("Connected correctly to server");

  // Get the symbols collection
  var symbolsCol = db.collection('symbols');
  
  var dropResult = yield symbolsCol.drop();
  
  var nyseSymbols = yield xbrlfetch.fetchNYSESymbols();
  console.log(`successfully got ${nyseSymbols.length}  NYSE symbols`);
  var insertResult = yield symbolsCol.insertMany(nyseSymbols);
  assert.equal(nyseSymbols.length, insertResult.result.n);
  assert.equal(nyseSymbols.length, insertResult.ops.length);
  console.log(`Inserted ${insertResult.result.n} documents into the symbols collection`);
  
  var nasdaqSymbols = yield xbrlfetch.fetchNASDAQSymbols();
  console.log(`successfully got ${nasdaqSymbols.length}  NASDAQ symbols`);
  insertResult = yield symbolsCol.insertMany(nasdaqSymbols);
  assert.equal(nasdaqSymbols.length, insertResult.result.n);
  assert.equal(nasdaqSymbols.length, insertResult.ops.length);
  console.log(`Inserted ${insertResult.result.n} documents into the symbols collection`);
  
  var filingsCol = db.collection("filings");
  var tickers = yield symbolsCol.find({}).skip(0).limit(100).project({ _id: 0, Symbol: 1}).toArray();
  tickers = tickers.map(t => t.Symbol);
  console.log(`Found ${tickers.length} symbols`);
  for(var i = 0; i < tickers.length; i++) {
      
      var deleteResult = yield filingsCol.deleteMany({ "TradingSymbol": tickers[i]});
      try {
          var filing = yield xbrlfetch.fetchLast10K(tickers[i]);
          // turn symbols into an array
          filing.TradingSymbol = filing.TradingSymbol.split(', ')
          var insertResult = yield filingsCol.insert(filing);
          console.log(`Inserted last 10K filing for ${tickers[i]} - ${filing.EntityRegistrantName}`);
      } catch (err) {
          console.error(`Error getting 10K for ${tickers[i]}: ${err}`);
      }
      
  }
  
  db.close();
}).catch(function(err) {
  console.log(err.stack);
});


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
    
    /*fs.readFileAsync('./test/download/goog-20151231.xml').then(function(data) {
        fs.writeFile('parsedXml.json', xmlParser.toJson(data), function(err) {
           console.log(err)
         })
    });*/
    
    
xbrlfetch.fetchLast10K("GOOGL")
   .then(function (filing) {
        console.log(JSON.stringify(filing, null, 2));
    })
    .catch(function (err) {
        console.error(err);
    });
 
/*
 xbrlfetch.fetchFilingsList("MSFT", "10-Q,10-K")
    .then(function (filing) {
        console.log(JSON.stringify(filing, null, 2));
    })
    .catch(function (err) {
        console.error(err);
    });
*/
