var request = require('request'),
   moment = require('moment'),
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
 */
function fetchLast10K(ticker) {
   return fetchFilingsList(ticker, "10-K", 0, 1).then(function(info) {
      // we have a list of filings now
      var filing10K = info.filings.find(function(filing) {
         return filing.type == "10-K";
      });
      
      if(filing10K) {
         var xbrlURL = filing10K.filingHREF.replace('index.htm', 'xbrl.zip');
         return fetchAndParseXBRL(xbrlURL);
      };
      
      return Promise.reject("no 10-K found");
   });
}

function fetchFilings(ticker) {
   return fetchFilingsList(ticker).then(function(info) {
      // we have a list of filings now
      var promises = Info.filings.filter(function(filing) {
         return filing.type == "10-Q" || filing.type == "10-K";
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
 * @param  {string} ticker
 * @param  {number} start=0
 * @param  {number} count=100
 * @param  {Date} priorTo=null
 * @param  {string} filingType=null
 */
function fetchFilingsList(ticker, filingType, start, count, priorTo) {
   
   start = start || 0;
   count = count || 100;
   
   var uri = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&start=${start}&count=${count}&output=xml`;
   
   if (priorTo && priorTo instanceof Date && !isNaN(priorTo.valueOf())) {
      var date = moment(priorTo).format('YYYYMMDD')
      uri += `&dateb=${date}`;
   }
   
   if (filingType ) {
      if(filingType.indexOf(',') > 0) {
         return Promise.all(filingType.split(',').map(type => {
            return fetchFilingsList(ticker, type, start, count, priorTo);
         })).then(typesData => {
            return {
               companyInfo: typesData[0].companyInfo,
               filings: typesData.reduce((prev, curr, currIdx) => {
                     return prev.concat(curr.filings);
                  }, []).sort((a, b) => {
                     return moment(b.dateFiled).diff(moment(a.dateFiled)); 
                  })
            }
         });
      } else {
         uri += `&type=${filingType}`;
      }
   }
   
   return fetchFilingsRaw(uri);
}

function fetchFilingsRaw(uri) {
   return new Promise(function(resolve, reject) {
      var r = request({
         uri: uri,
         headers: {
            'User-Agent': 'Request-Promise',
            'Accept': 'application/xml'
         },
         gzip: true
      }, (error, response, body) => {
         if(error) {
            reject(error);
            return;
         }
         
         if(response.headers['content-type'] === 'text/html') {
            reject("No matching Ticker Symbol.")
            return;
         }
         
         parser.parseString(body, function (err, result) {
            if (err) {
               reject(err);
               return;
            }
            
            var data = {
               companyInfo: {
                  CIK: result.companyFilings.companyInfo[0].CIK[0],
                  CIKHREF: result.companyFilings.companyInfo[0].CIKHREF[0],
                  Location: result.companyFilings.companyInfo[0].Location[0],
                  SIC: result.companyFilings.companyInfo[0].SIC[0],
                  SICDescription: result.companyFilings.companyInfo[0].SICDescription[0],
                  SICHREF: result.companyFilings.companyInfo[0].SICHREF[0],
                  businessAddress: {
                     city: result.companyFilings.companyInfo[0].businessAddress[0].city[0],
                     phoneNumber: result.companyFilings.companyInfo[0].businessAddress[0].phoneNumber[0],
                     state: result.companyFilings.companyInfo[0].businessAddress[0].state[0],
                     street: result.companyFilings.companyInfo[0].businessAddress[0].street[0],
                     zipCode: result.companyFilings.companyInfo[0].businessAddress[0].zipCode[0],
                  },
                  mailingAddress: {
                     city: result.companyFilings.companyInfo[0].mailingAddress[0].city[0],
                     state: result.companyFilings.companyInfo[0].mailingAddress[0].state[0],
                     street: result.companyFilings.companyInfo[0].mailingAddress[0].street[0],
                     zipCode: result.companyFilings.companyInfo[0].mailingAddress[0].zipCode[0],
                  },
                  fiscalYearEnd: result.companyFilings.companyInfo[0].fiscalYearEnd[0],
                  name: result.companyFilings.companyInfo[0].name[0],
                  stateOfIncorporation: result.companyFilings.companyInfo[0].stateOfIncorporation[0],
               },
               filings: result.companyFilings.results[0].filing.map(val => {
                  return {
                     dateFiled: val.dateFiled[0],
                     filingHREF: val.filingHREF[0],
                     formName: val.formName[0],
                     type: val.type[0]
                  };
               })
               
            };
            
            resolve(data);
         });
      });
   });
}

module.exports = {
   fetchFilings: fetchFilings,
   fetchFilingsList: fetchFilingsList,
   fetchLast10K: fetchLast10K
};