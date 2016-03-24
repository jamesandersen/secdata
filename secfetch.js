var rp = require('request-promise'),
   secret = require('./secret.json'),
   indicators = {
      'SalesRevenueNet': 'Total revenue from sale of goods and services rendered during the reporting period, in the normal course of business, reduced by sales returns and allowances, and sales discounts.',
      'CostOfGoodsAndServicesSold': 'The aggregate costs related to goods produced and sold and services rendered by an entity during the reporting period. This excludes costs incurred during the reporting period related to financial services rendered and other revenue generating activities.',
      'GrossProfit': 'Aggregate revenue less cost of goods and services sold or operating expenses directly attributable to the revenue generation activity.',
      'ResearchAndDevelopmentExpense': 'The aggregate costs incurred (1) in a planned search or critical investigation aimed at discovery of new knowledge with the hope that such knowledge will be useful in developing a new product or service, a new process or technique, or in bringing about a significant improvement to an existing product or process; or (2) to translate research findings or other knowledge into a plan or design for a new product or process or for a significant improvement to an existing product or process whether intended for sale or the entity\'s use, during the reporting period charged to research and development projects, including the costs of developing computer software up to the point in time of achieving technological feasibility, and costs allocated in accounting for a business combination to in-process projects deemed to have no alternative future use.',
      'SellingGeneralAndAdministrativeExpense': 'The aggregate total costs related to selling a firm\'s product and services, as well as all other general and administrative expenses. Direct selling expenses (for example, credit, warranty, and advertising) are expenses that can be directly linked to the sale of specific products. Indirect selling expenses are expenses that cannot be directly linked to the sale of specific products, for example telephone expenses, Internet, and postal charges. General and administrative expenses include salaries of non-sales personnel, rent, utilities, communication, etc.',
      'OperatingExpenses': 'Generally recurring costs associated with normal operations except for the portion of these expenses which can be clearly related to production and included in cost of sales or services. Includes selling, general and administrative expense.',
      'OperatingIncomeLoss': 'The net result for the period of deducting operating expenses from operating revenues.',
      'NonoperatingIncomeExpense': 'The aggregate amount of income or expense from ancillary business-related activities (that is to say, excluding major activities considered part of the normal operations of the business).',
      'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest': 'This element represents the income or loss from continuing operations attributable to the economic entity which may also be defined as revenue less expenses from ongoing operations, after income or loss from equity method investments, but before income taxes, extraordinary items, and noncontrolling interest.',
      'IncomeTaxExpenseBenefit': 'Amount of current income tax expense (benefit) and deferred income tax expense (benefit) pertaining to continuing operations.',
      'NetIncomeLoss': 'The portion of profit or loss for the period, net of income taxes, which is attributable to the parent.',
      'EarningsPerShareBasic': 'The amount of net income (loss) for the period per each share of common stock or unit outstanding during the reporting period.',
   };

/*
{
   "ticker": "APPL",
   "quarterly_results": [
      {
         "date": "2015-12-26",
         "SalesRevenueNet": xxxx,
         ....
      }
   ]
}

*/


module.exports = function(ticker) {
   var promises = Object.keys(indicators).map((indicator, index) => {
      return fetchDataset(ticker, indicator);
   }),
   quarterly_results = [];

   return Promise.all(promises).then(responses => {
      responses.forEach(resp => {
         // aggregate the data
         resp.dataset.data.forEach(data => {
            var qResult = quarterly_results.find(res => res.date === data[0]);
            if(!qResult) {
               qResult = { date: data[0] };
               quarterly_results.push(qResult);
            }
            
            qResult[resp.dataset.indicator] = data[1];
         });
      });
      
      var indicatorsCount = Object.keys(indicators).length;
      quarterly_results.forEach(qRes => {
         qRes.complete = Object.keys(qRes).length > indicatorsCount;
      });
      
      return { ticker: ticker, quarterly_results: quarterly_results };
   });
}
/**
 * @param  {any} ticker
 * @param  {any} indicator
 */
function fetchDataset(ticker, indicator) {
   return rp({
      uri: `https://www.quandl.com/api/v3/datasets/SEC/AAPL_${indicator.toUpperCase()}_Q.json`,
      qs: {
         api_key: secret.quandl_api_key //
      },
      headers: {
         'User-Agent': 'Request-Promise'
      },
      json: true // Automatically parses the JSON string in the response
   }).then(function(resp) {
      // add our key back in 
      resp.dataset.indicator = indicator;
      return resp;
   });
}
