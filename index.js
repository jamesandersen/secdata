var MongoClient = require('mongodb').MongoClient,
   co = require('co'),
   xbrlfetch = require('./xbrlfetch'),
   assert = require('assert');


function populateSymbols() {
    co(function*() {
        // Connection URL
        var db = yield MongoClient.connect('mongodb://localhost:27017/secdata');
        console.log("Connected correctly to server");

        // Get the symbols collection
        var symbolsCol = db.collection('symbols');
        
        
        try {
            //var dropResult = yield symbolsCol.drop();
        } catch(err) {
            console.warn('Error dropping symbols collection: ' + err);
        }
        
        var existingSymbols = yield symbolsCol.find({}).project({ Symbol: 1}).toArray();
        var symbols = yield Promise.all([xbrlfetch.fetchNYSESymbols(), xbrlfetch.fetchNASDAQSymbols()])
                                .then(results => results[0].concat(results[1]));
        var symbolsCount = symbols.length;
        symbols = symbols.filter(sym => !existingSymbols.find(existing => existing.Symbol == sym.Symbol));
        console.log(`${existingSymbols.length} of ${symbolsCount} total symbols have already been saved.  Will proceed with ${symbols.length} remaining symbols...`);
                             
        var symbolsToSave = [];
        var saveIncrement = 20;
        for(var i = 0; i < symbols.length; i++) {
            try {
                symbols[i].lastFilingFetch = new Date().toISOString();
                var filingList = yield xbrlfetch.fetchFilingsList(symbols[i].Symbol, "10-K,10-Q");
                symbols[i].companyInfo = filingList.companyInfo;
                symbols[i].filings = filingList.filings;
                console.log(`Fetched filing list for ${symbols[i].Symbol}: ${symbols[i].filings.length} filings fetched\t${i} of ${symbols.length} filings`);
            } catch (err) {
                console.warn(`Failed to fetch filing list for ${symbols[i].Symbol}: ${err}`);
                symbols[i].filingFetchError = err.toString();
            }
            
            symbolsToSave.push(symbols[i]);
            if(symbolsToSave.length % saveIncrement === 0 || i == symbols.length - 1) {
                var insertResult = yield symbolsCol.insertMany(symbolsToSave);
                assert.equal(symbolsToSave.length, insertResult.result.n);
                assert.equal(symbolsToSave.length, insertResult.ops.length);
                console.log(`Inserted ${insertResult.result.n} documents into the symbols collection`);
                symbolsToSave = [];
            }
        }
        
        db.close();
    }).catch(function(err) {
        console.error(`${err}: ${err.stack}`);
    });
}

function populateFilings() {
    co(function*() {
        // Connection URL
        var db = yield MongoClient.connect('mongodb://localhost:27017/secdata');
        console.log("Connected correctly to server");

        // Get the symbols collection
        var symbolsCol = db.collection('symbols');
        
        var filingsCol = db.collection("filings");
        var existingFilings = yield filingsCol.distinct('TradingSymbol');
        var tickers = yield symbolsCol.find(
            { $and: [ 
                { filings: { $exists: true } }, 
                { filings: { $not: { $size: 0} } }, 
                { lastFilingDataFetchDate: null }
                ]})
                            .skip(0)
                            .limit(100)
                            .project({ _id: 0, Symbol: 1, filings: 1}).toArray();
        tickers = tickers.filter(t => !existingFilings.find(ef => ef.toLowerCase() == t.Symbol.toLowerCase()));
        
        console.log(`Found ${tickers.length} symbols that need filings`);
        for(var i = 0; i < tickers.length; i++) {
            
            var deleteResult = yield filingsCol.deleteMany({ "TradingSymbol": tickers[i].Symbol});
            var filingData = [];
            var now = new Date();
            for(var j = 0; j < tickers[i].filings.length; j++) {
                var filingDate = new Date();
                filingDate.setTime(Date.parse(tickers[i].filings[j].dateFiled));
                var age = (now - filingDate) / (1000 * 60 * 60 * 24 * 365);
                if (age <= 3 && (tickers[i].filings[j].type == "10-Q" || tickers[i].filings[j].type == "10-K")) {
                    var xbrlURL = tickers[i].filings[j].filingHREF.replace(/index\.html?/, 'xbrl.zip');
                    try {
                        var filing = yield xbrlfetch.fetchAndParseXBRL(xbrlURL);
                        
                        // capture some useful additional data
                        filing.TradingSymbol = tickers[i].Symbol;
                        filing.htmlURL = tickers[i].filings[j].filingHREF;
                        filing.zipURL = xbrlURL;
                        filing.dateFiled = filingDate;
                        
                        filingData.push(filing);
                    } catch (err) {
                        console.error(`Error getting ${tickers[i].filings[j].type} for ${tickers[i].Symbol} 
                        filed on ${tickers[i].filings[j].dateFiled} from ${xbrlURL}:
                         ${err}`);
                    }
                }
            }
            
            if(filingData.length > 0) {
                var insertResult = yield filingsCol.insertMany(filingData);
                assert.equal(filingData.length, insertResult.result.n);
                console.log(`Inserted ${insertResult.result.n} filings for ${tickers[i].Symbol} - ${filing.EntityRegistrantName}`);
            }
            
            var updateResult = yield symbolsCol.update({ Symbol: tickers[i].Symbol }, { $set: { lastFilingDataFetchDate: new Date() }});
            console.log(`Updated ${tickers[i].Symbol} lastFilingDataFetchDate`);
        }
        
        db.close();
    }).catch(function(err) {
        console.log(err.stack);
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
    
    /*fs.readFileAsync('./test/download/goog-20151231.xml').then(function(data) {
        fs.writeFile('parsedXml.json', xmlParser.toJson(data), function(err) {
           console.log(err)
         })
    });*/
    
    
/*xbrlfetch.fetchLast10K("ASX")
   .then(function (filing) {
        console.log(JSON.stringify(filing, null, 2));
    })
    .catch(function (err) {
        console.error(err);
    });*/
 
//populateSymbols();
populateFilings();
