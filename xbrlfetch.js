var request = require('request'),
rp = require('request-promise'),
   xml2js = require('xml2js'),
   unzip = require('unzip'),
   ParseXbrl = require('parse-xbrl'),
   fs = require('fs'),
   parser = new xml2js.Parser();;

// https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AAPL&count=100&output=xml
/*
<filing>
        <XBRLREF>http://www.sec.gov/cgi-bin/viewer?action=view&amp;cik=320193&amp;accession_number=0001193125-15-356351&amp;xbrl_type=v</XBRLREF>
        <dateFiled>2015-10-28</dateFiled>
        <filingHREF>http://www.sec.gov/Archives/edgar/data/320193/000119312515356351/0001193125-15-356351-index.htm</filingHREF>
        <formName>Annual report [Section 13 and 15(d), not S-K Item 405]</formName>
        <type>10-K</type>
      </filing>
*/
// http://www.sec.gov/Archives/edgar/data/320193/000119312515356351/0001193125-15-356351-xbrl.zip


/**
 * @param  {any} ticker
 * @param  {any} indicator
 */
function fetchLast10K(ticker) {
   return fetchFilingsList(ticker).then(function(listInfo) {
      // we have a list of filings now
      var filing10K = listInfo.companyFilings.results[0].filing.find(function(filing) {
         return filing.type[0] == "10-K";
      });
      
      if(filing10K) {
         var xbrlURL = filing10K.filingHREF[0].replace('index.htm', 'xbrl.zip');
         return fetchAndParseXBRL(xbrlURL);
      };
      
      return Promise.reject("no 10-K found");
   });
}

function fetchFilings(ticker) {
   return fetchFilingsList(ticker).then(function(listInfo) {
      // we have a list of filings now
      var promises = listInfo.companyFilings.results[0].filing.filter(function(filing) {
         return filing.type[0] == "10-Q" || filing.type[0] == "10-K";
      }).map((filing, index) => {
         var xbrlURL = filing.filingHREF[0].replace('index.htm', 'xbrl.zip');
         return fetchAndParseXBRL(xbrlURL);
      });
      
      return Promise.all(promises);
   });
}

function fetchAndParseXBRL(xbrlURL) {
   
   return new Promise(function(resolve, reject) {
      var r = request(xbrlURL);

      r.on('response',  function (res) {
         res.pipe(unzip.Parse())
         .on('entry', function (entry) {
            var fileName = entry.path;
            var type = entry.type; // 'Directory' or 'File'
            var size = entry.size;
            if (/\d\.xml/.test(fileName)) {
               entry.pipe(fs.createWriteStream('./test/download/' + fileName))
               .on('finish', function(fd) {
                  ParseXbrl.parse('./test/download/' + fileName).then(function(parsedDoc) {
                     resolve(parsedDoc);
                  });
               });
            } else {
               entry.autodrain();
            }
         });
      });
   });
}

/**
 * @param  {any} ticker
 */
function fetchFilingsList(ticker) {
   return rp({
      uri: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&count=100&output=xml`,
      headers: {
         'User-Agent': 'Request-Promise',
         'Accept': 'application/xml'
      }
   }).then(function(resp) {
      return new Promise(function(resolve, reject) {
         parser.parseString(resp, function (err, result) {
            if (err) reject(err);
            resolve(result);
         });
      });
   });
}


module.exports = {
   fetchFilings: fetchFilings,
   fetchFilingsList: fetchFilingsList,
   fetchLast10K: fetchLast10K
};