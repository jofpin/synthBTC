/**
 * Bitcoin Analysis for synthBTC Research
 * 
 * This script is part of the synthBTC research project, focusing on comprehensive analysis 
 * of Bitcoin's price volatility and market trends. It automates the process of data 
 * collection, analysis, and prediction generation to provide valuable insights for 
 * synthBTC development and strategy.
 * 
 * Key functionalities:
 * - Fetches historical Bitcoin price data from Yahoo Finance
 * - Processes raw data to extract meaningful metrics
 * - Generates various predictive models and market indicators, including:
 *   • Volatility calculations across multiple time scales
 *   • Price movement probabilities
 *   • Future price projections
 *   • Market sentiment analysis based on news
 *   • Technical indicators like RSI
 *   • Data-driven buy/sell recommendations
 * 
 * The insights derived from this analysis play a crucial role in refining synthBTC 
 * algorithms, risk management strategies, and overall market approach.
 * 
 * 
 * @author Jose Pino
 * @contact jose@pino.sh (https://x.com/jofpin)
 * @version 1.0.0
 * @date 2024-08-02
 * 
 */
const fs = require("fs");
const axios = require("axios");
const csv = require("csv-parser");
const math = require("mathjs");
const moment = require("moment");
const Sentiment = require("sentiment");
const sentiment = new Sentiment();

const bitcoinAnalysis = {
  /**
   * Analyzes Bitcoin volatility from a CSV file
   * @param {string} filePath - Path to the CSV file
   */
  analyze: async function(config) {
    const filePath = config.PATH;
    const NEWS_API_KEY = config.NEWS_API_KEY || "";
    const results = [];

    /**
     * Reads the CSV file and returns a Promise with the results
     */
    const readCSV = (csvFilePath) => {
      return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv())
          .on("data", (data) => {
            if (Object.values(data).some(value => value === null || value === 'null')) {
              return;
            }
            results.push(data);
          })
          .on("end", () => resolve(results))
          .on("error", (error) => reject(error));
      });
    };

    /**
     * Calculates volatility metrics
     */
    const calculateVolatility = (returns, scale, stdDev) => {
      const scaledStdDev = stdDev * Math.sqrt(scale);
      return {
        worst: (math.quantileSeq(returns, 0.01) * Math.sqrt(scale) * 100).toFixed(2) + "%",
        low: (math.quantileSeq(returns, 0.25) * Math.sqrt(scale) * 100).toFixed(2) + "%",
        average: (scaledStdDev * 100).toFixed(2) + "%",
        high: (math.quantileSeq(returns, 0.75) * Math.sqrt(scale) * 100).toFixed(2) + "%",
        extreme: (math.quantileSeq(returns, 0.99) * Math.sqrt(scale) * 100).toFixed(2) + "%"
      };
    };

    /**
     * Predicts future prices based on historical returns
     */
    const predictFuturePrices = (initialPrice, returns, numDays, startDate) => {
      const futurePrices = [];
      let currentPrice = initialPrice;
      for (let i = 0; i < numDays; i++) {
        const randomReturn = returns[Math.floor(Math.random() * returns.length)];
        const nextPrice = currentPrice * (1 + randomReturn);
        const nextDate = moment(startDate).add(i + 1, "days").format("MMM D, YYYY");
        futurePrices.push({ date: nextDate, price: Math.round(nextPrice) });
        currentPrice = nextPrice;
      }
      return futurePrices;
    };

    /**
     * Projects Bitcoin price for a given number of years
     */
    const projectPriceForYears = (initialPrice, avgReturn, stdDev, years) => {
      const annualReturn = Math.pow(1 + avgReturn, 365) - 1;
      const annualStdDev = stdDev * Math.sqrt(365);
    
      const optimisticReturn = annualReturn + annualStdDev;
      const pessimisticReturn = Math.max(annualReturn - annualStdDev, -0.99);
    
      let optimisticPrice = initialPrice * Math.pow(1 + optimisticReturn, years);
      let pessimisticPrice = initialPrice * Math.pow(1 + pessimisticReturn, years);
      let averagePrice = initialPrice * Math.pow(1 + annualReturn, years);
    
      const currentDate = moment();
      const projectionYear = currentDate.clone().add(years, 'years').year();
    
      return {
        optimistic: Math.round(optimisticPrice),
        pessimistic: Math.round(pessimisticPrice),
        average: Math.round(averagePrice),
        year: projectionYear
      };
    };

    /**
     * Fetches the Bitcoin Fear and Greed Index
     */
    const fetchFearAndGreedIndex = async () => {
      try {
        const response = await axios.get("https://api.alternative.me/fng/");
        const data = response.data.data[0];
        return {
          value: parseInt(data.value),
          valueClassification: data.value_classification
        };
      } catch (error) {
        console.error("Error fetching Fear and Greed Index:", error);
        return null;
      }
    };

    /**
     * Fetches and analyzes sentiment from recent Bitcoin-related news articles
     */
    const fetchNewsSentiment = async () => {
      if (!NEWS_API_KEY) {
        console.log("News API key not provided. Market sentiment analysis will be skipped.");
        return null;
      }
    
      try {
        const url = `https://newsapi.org/v2/everything?q=bitcoin&apiKey=${NEWS_API_KEY}&language=en`;
        const response = await axios.get(url);
        const articles = response.data.articles;
    
        let totalScore = 0;
        let articleCount = 0;
    
        articles.forEach(article => {
          const content = article.title + " " + article.description;
          const result = sentiment.analyze(content);
          totalScore += result.score;
          articleCount++;
        });
    
        const averageScore = totalScore / articleCount;
        // Normalize the score to a 0-100 scale, similar to the Fear and Greed Index
        const normalizedScore = Math.round(((averageScore + 5) / 10) * 100);
        
        return Math.max(0, Math.min(100, normalizedScore)); // Ensure the score is between 0 and 100
      } catch (error) {
        console.error("Error fetching news sentiment:", error);
        return null;
      }
    };

    /**
     * Determines a descriptive sentiment category based on a numerical score
     */
    const getSentimentType = (score) => {
      if (score === null) return "Not Available";
      if (score >= 75) return "Extreme Greed";
      if (score >= 60) return "Greed";
      if (score > 40) return "Neutral";
      if (score > 25) return "Fear";
      return "Extreme Fear";
    };

    /**
     * Interprets the market sentiment based on a numerical score.
     */
    const getMarketSentiment = (score) => {
      if (score === null) return "Not Available";
      if (score <= 25) return "Extreme Fear";
      if (score <= 40) return "Fear";
      if (score <= 60) return "Neutral";
      if (score <= 75) return "Greed";
      return "Extreme Greed";
    };

    /**
     * Combines sentiment analysis with Fear and Greed Index
     * @param {number} sentimentScore - The sentiment score from news analysis
     * @param {Object} fearAndGreedData - The Fear and Greed Index data
     * @returns {Object} Combined market mood data
     */
    const getCombinedMarketMood = (sentimentScore, fearAndGreedData) => {
      if (fearAndGreedData === null) {
        return {
          mood: "Not Available",
          explanation: "Fear & Greed Index data is not available."
        };
      }
    
      const fngScore = fearAndGreedData.value;
      const combinedScore = sentimentScore !== null ? (fngScore + sentimentScore) / 2 : fngScore;
      const mood = getMarketSentiment(combinedScore);
      
      let explanation = `Based on the Fear & Greed Index (${fearAndGreedData.valueClassification})`;
      if (sentimentScore !== null) {
        explanation += ` and news sentiment analysis (${getMarketSentiment(sentimentScore)})`;
      }
      explanation += `, the overall market mood appears to be ${mood}.`;
    
      if (Math.abs(fngScore - sentimentScore) > 20) {
        explanation += " There's a significant discrepancy between market indicators and news sentiment, which might indicate a shifting market mood or potential opportunities.";
      }
    
      return { mood, explanation };
    };

    /**
     * Calculates the Relative Strength Index (RSI) for a given set of close prices
     */
    const calculateRSI = (closePrices, period = 14) => {
      if (closePrices.length < period + 1) {
        return null; 
      }
    
      const changes = [];
      for (let i = 1; i < closePrices.length; i++) {
        changes.push(closePrices[i] - closePrices[i - 1]);
      }
    
      let gains = changes.map(change => change > 0 ? change : 0);
      let losses = changes.map(change => change < 0 ? -change : 0);
    
      let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
      let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
      const rsiValues = [];
    
      for (let i = period; i < changes.length; i++) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
    
        rsiValues.push(rsi);
      }
    
      return rsiValues[rsiValues.length - 1];
    };

    /**
     * Generates a detailed buy/sell/hold recommendation based on various market indicators
     * @param {number} currentPrice - The current price of Bitcoin
     * @param {number} avgRecentPrice - The average price over recent period
     * @param {number} rsi - The current RSI value
     * @param {string} marketMood - The current market mood
     * @param {number} volumeRatio - The ratio of current volume to average volume
     * @returns {Object} An object containing the recommendation, explanation, and reasons
     */
    const generateDetailedRecommendation = (currentPrice, avgRecentPrice, rsi, newsSentiment, fearAndGreedData, volumeRatio) => {
      let buyScore = 0;
      let reasons = [];

      // Price analysis
      if (currentPrice < avgRecentPrice * 0.9) {
        buyScore += 2;
        reasons.push("The current price is significantly below the recent average (potential buying opportunity).");
      } else if (currentPrice < avgRecentPrice) {
        buyScore += 1;
        reasons.push("The current price is slightly below the recent average.");
      } else if (currentPrice > avgRecentPrice * 1.1) {
        buyScore -= 2;
        reasons.push("The current price is significantly above the recent average (potential selling opportunity).");
      } else {
        buyScore -= 1;
        reasons.push("The current price is slightly above the recent average.");
      }

      // RSI analysis
      if (rsi < 30) {
        buyScore += 2;
        reasons.push("The RSI indicates that the asset might be oversold.");
      } else if (rsi > 70) {
        buyScore -= 2;
        reasons.push("The RSI indicates that the asset might be overbought.");
      } else if (rsi < 45) {
        buyScore += 1;
        reasons.push("The RSI is in a slightly oversold range.");
      } else if (rsi > 55) {
        buyScore -= 1;
        reasons.push("The RSI is in a slightly overbought range.");
      } else {
        reasons.push("The RSI is in a neutral range.");
      }

      // News sentiment and Fear and Greed Index analysis
      if (newsSentiment !== null && fearAndGreedData !== null) {
        reasons.push(`The news sentiment is ${getSentimentType(newsSentiment)}.`);
        
        if (newsSentiment <= -5) {
          buyScore += 2;
          reasons.push("Extremely negative news sentiment often presents good buying opportunities.");
        } else if (newsSentiment <= -2) {
          buyScore += 1;
          reasons.push("Negative news sentiment might present buying opportunities.");
        } else if (newsSentiment >= 5) {
          buyScore -= 2;
          reasons.push("Extremely positive news sentiment might signal a market top.");
        } else if (newsSentiment >= 2) {
          buyScore -= 1;
          reasons.push("Positive news sentiment might precede a market correction.");
        }

        reasons.push(`The Fear and Greed Index is at ${fearAndGreedData.value} (${fearAndGreedData.valueClassification}).`);
        
        if (fearAndGreedData.value <= 20) {
          buyScore += 2;
          reasons.push("This extreme fear often presents good buying opportunities.");
        } else if (fearAndGreedData.value <= 40) {
          buyScore += 1;
          reasons.push("This fear in the market might present buying opportunities.");
        } else if (fearAndGreedData.value >= 80) {
          buyScore -= 2;
          reasons.push("This extreme greed might signal a market top.");
        } else if (fearAndGreedData.value >= 60) {
          buyScore -= 1;
          reasons.push("This greed in the market might precede a correction.");
        }
      } else {
        reasons.push("Market sentiment data is not available.");
      }

      // Volume analysis
      if (volumeRatio > 2) {
        buyScore += 1;
        reasons.push("Trading volume is exceptionally high, indicating strong market interest.");
      } else if (volumeRatio > 1.5) {
        buyScore += 0.5;
        reasons.push("Trading volume is higher than average, showing increased market activity.");
      } else if (volumeRatio < 0.5) {
        buyScore -= 1;
        reasons.push("Trading volume is significantly lower than average, indicating weak market interest.");
      } else {
        reasons.push("Trading volume is around average levels.");
      }

      let recommendation, explanation;
      if (buyScore >= 4) {
        recommendation = "Strong Buy";
        explanation = "Multiple indicators suggest very favorable buying conditions.";
      } else if (buyScore >= 2) {
        recommendation = "Buy";
        explanation = "Several indicators suggest it might be a good time to buy, but exercise some caution.";
      } else if (buyScore > 0) {
        recommendation = "Weak Buy";
        explanation = "Some indicators are positive, but the overall signal is not strong. Consider buying small amounts.";
      } else if (buyScore === 0) {
        recommendation = "Hold";
        explanation = "Current indicators are mixed. Consider holding your position and monitoring the market closely.";
      } else if (buyScore > -2) {
        recommendation = "Weak Sell";
        explanation = "Some indicators are negative, but the overall signal is not strong. Consider selling small amounts.";
      } else if (buyScore > -4) {
        recommendation = "Sell";
        explanation = "Several indicators suggest it might be a good time to sell, but exercise some caution.";
      } else {
        recommendation = "Strong Sell";
        explanation = "Multiple indicators suggest very unfavorable market conditions for holding.";
      }

      return { recommendation, explanation, reasons: reasons.join(" ") };
    };
    
    /**
     * Performs the main analysis on the CSV data
     */
    const performAnalysis = async (results) => {
      // Extract close prices and dates from results
      const closePrices = results.map(row => parseFloat(row["Close"]));
      const dates = results.map(row => row["Date"]);
      const rsi = calculateRSI(closePrices);
      
      // Calculate daily returns
      const dailyReturns = closePrices.slice(1).map((price, i) => (price - closePrices[i]) / closePrices[i]);
      
      // Calculate standard deviation of daily returns
      const stdDev = math.std(dailyReturns);

      // Calculate average daily return
      const avgReturn = math.mean(dailyReturns);

      // Calculate volatility for different time scales
      const dailyVolatility = calculateVolatility(dailyReturns, 1, stdDev);
      const weeklyVolatility = calculateVolatility(dailyReturns, 7, stdDev);
      const monthlyVolatility = calculateVolatility(dailyReturns, 30, stdDev);
      const annualVolatility = calculateVolatility(dailyReturns, 365, stdDev);

      // Calculate number of days, months, and years
      const numDays = dates.length;
      const numYears = (numDays / 365).toFixed(2);
      const numMonths = (numDays / 30).toFixed(2);

      // Format start and end dates
      const startDate = moment(dates[0]).format("MMM D, YYYY");
      const endDate = moment(dates[dates.length - 1]).format("MMM D, YYYY");

      // Find maximum increase and decrease
      const maxIncrease = dailyReturns.reduce((max, ret, i) => ret > max.value ? { date: dates[i + 1], value: ret } : max, { date: null, value: -Infinity });
      const maxDecrease = dailyReturns.reduce((min, ret, i) => ret < min.value ? { date: dates[i + 1], value: ret } : min, { date: null, value: Infinity });

      // Find highest and lowest prices
      const maxPrice = Math.max(...closePrices);
      const minPrice = Math.min(...closePrices);
      const maxPriceDate = dates[closePrices.indexOf(maxPrice)];
      const minPriceDate = dates[closePrices.indexOf(minPrice)];

      // Predict today's volatility
      const today = moment().format("MMM D");
      const historicalReturnsToday = dailyReturns.filter((_, i) => moment(dates[i]).format("MMM D") === today);
      const predictedVolatilityToday = calculateVolatility(historicalReturnsToday, 1, stdDev);

      // Calculate probability of increase and decrease
      const numIncreases = dailyReturns.filter(ret => ret > 0).length;
      const numDecreases = dailyReturns.filter(ret => ret < 0).length;
      const numNoChange = dailyReturns.filter(ret => ret === 0).length;
      const probabilityIncrease = ((numIncreases / dailyReturns.length) * 100).toFixed(2) + "%";
      const probabilityDecrease = ((numDecreases / dailyReturns.length) * 100).toFixed(2) + "%";
      const probabilityNoChange = ((numNoChange / dailyReturns.length) * 100).toFixed(2) + "%";
      
      // Calculate today's price movements
      const todayIncreases = historicalReturnsToday.filter(ret => ret > 0).length;
      const todayDecreases = historicalReturnsToday.filter(ret => ret < 0).length;

      // Predict future prices for the next 365 days
      const initialPrice = closePrices[closePrices.length - 1];
      const futurePrices = predictFuturePrices(initialPrice, dailyReturns, 365, dates[dates.length - 1]);

      // Project prices for 3, 5, and 10 years
      const threeYearsPrediction = projectPriceForYears(initialPrice, avgReturn, stdDev, 3);
      const fiveYearsPrediction = projectPriceForYears(initialPrice, avgReturn, stdDev, 5);
      const tenYearsPrediction = projectPriceForYears(initialPrice, avgReturn, stdDev, 10);    

      // Segment future prices into daily, weekly, and monthly without dates
      const segmentedFuturePrices = {
        daily: futurePrices.map(futurePrice => futurePrice.price),
        weekly: futurePrices.filter((_, index) => index % 7 === 0).map(futurePrice => futurePrice.price),
        monthly: futurePrices.filter((_, index) => index % 30 === 0).map(futurePrice => futurePrice.price)
      };

      // Extract volume data from the results
      const volumes = results.map(row => parseFloat(row["Volume"]));

      // Get the last 30 closing prices for recent price analysis
      const recentPrices = closePrices.slice(-30);
      // Calculate the average of recent prices
      const avgRecentPrice = math.mean(recentPrices);
      // Get the most recent (current) price
      const currentPrice = closePrices[closePrices.length - 1];
      // Check if the current price is higher than the recent average
      const isPriceHigherThanAverage = currentPrice > avgRecentPrice;
      // Get the last 30 volume data points for recent volume analysis
      const recentVolumes = volumes.slice(-30);
      // Calculate the average of recent volumes
      const avgRecentVolume = math.mean(recentVolumes);
      // Get the most recent (current) volume
      const currentVolume = volumes[volumes.length - 1];
      // Check if the current volume is higher than the recent average
      const isVolumeHigherThanAverage = currentVolume > avgRecentVolume;
      // Calculate the ratio of current volume to average volume: This helps in understanding if the current trading activity is higher or lower than usual
      const volumeRatio = currentVolume / avgRecentVolume;

      let newsSentiment = null;
      let fearAndGreedData = null;
    
      if (NEWS_API_KEY) {
        newsSentiment = await fetchNewsSentiment();
        fearAndGreedData = await fetchFearAndGreedIndex();
      }
    
      const { recommendation, explanation, reasons } = generateDetailedRecommendation(
        currentPrice, 
        avgRecentPrice, 
        rsi, 
        newsSentiment,
        fearAndGreedData,
        volumeRatio
      );

      const combinedMood = getCombinedMarketMood(newsSentiment, fearAndGreedData);

      const formatPrice = (price) => `$${price.toLocaleString()}`;
      const formatVolume = (volume) => `$${(volume / 1e9).toFixed(2)} billion`;       
      
      // Structure the results
      const volatilityData = {
        // Information about the analysis period
        analysisPeriod: {
          startDate: startDate,
          endDate: endDate,
          totalDays: numDays,
          totalMonths: numMonths,
          totalYears: numYears
        },
        // Current market metrics
        currentMetrics: {
          // Price information
          price: {
            current: formatPrice(currentPrice),
            averageRecent: formatPrice(avgRecentPrice),
            comparison: isPriceHigherThanAverage 
              ? "The current price is higher than the recent average."
              : "The current price is lower than the recent average."
          },
          // Volume information
          volume: {
            current: formatVolume(currentVolume),
            averageRecent: formatVolume(avgRecentVolume),
            comparison: isVolumeHigherThanAverage
              ? "Trading volume is higher than usual."
              : "Trading volume is lower than usual."
          },
          // Relative Strength Index (RSI)
          rsi: {
            value: rsi.toFixed(2),
            interpretation: rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral"
          },
          // Predicted volatility for today
          predictedVolatilityToday: predictedVolatilityToday,
          // Probabilities of price changes for today
          priceChangeProbabilitiesToday: {
            increase: probabilityIncrease,
            decrease: probabilityDecrease,
            noChange: probabilityNoChange
          },
          // Actual price movements for today
          todayPriceMovements: {
            increases: todayIncreases,
            decreases: todayDecreases
          }
        },
        // Sentiment analysis (only included if NEWS_API_KEY is provided)
        sentimentAnalysis: NEWS_API_KEY ? {
          // News sentiment analysis
          newsSentiment: newsSentiment !== null ? {
            score: newsSentiment,
            interpretation: getMarketSentiment(newsSentiment)
          } : "News sentiment data not available.",
          // Fear and Greed Index
          fearAndGreedIndex: fearAndGreedData ? {
            value: fearAndGreedData.value,
            classification: fearAndGreedData.valueClassification
          } : "Fear and Greed Index data not available.",
          // Combined market mood based on news sentiment and Fear and Greed Index
          combinedMarketMood: combinedMood
        } : {},
        // Volatility metrics for different time periods
        volatilityMetrics: {
          daily: dailyVolatility,
          weekly: weeklyVolatility,
          monthly: monthlyVolatility,
          annual: annualVolatility
        },
        // Significant dates in the analysis period
        significantDates: {
          maxIncrease: {
            date: moment(maxIncrease.date).format("MMM D, YYYY"),
            percentage: (maxIncrease.value * 100).toFixed(2) + "%"
          },
          maxDecrease: {
            date: moment(maxDecrease.date).format("MMM D, YYYY"),
            percentage: (maxDecrease.value * -100).toFixed(2) + "%"
          },
          highestPrice: {
            date: moment(maxPriceDate).format("MMM D, YYYY"),
            price: maxPrice.toFixed(2)
          },
          lowestPrice: {
            date: moment(minPriceDate).format("MMM D, YYYY"),
            price: minPrice.toFixed(2)
          }
        },
        // Future price projections
        futurePriceProjections: {
          daily: segmentedFuturePrices.daily,
          weekly: segmentedFuturePrices.weekly,
          monthly: segmentedFuturePrices.monthly,
          // Long-term price predictions
          longTerm: {
            in3Years: {
              optimistic: formatPrice(threeYearsPrediction.optimistic),
              pessimistic: formatPrice(threeYearsPrediction.pessimistic),
              average: formatPrice(threeYearsPrediction.average),
              year: threeYearsPrediction.year
            },
            in5Years: {
              optimistic: formatPrice(fiveYearsPrediction.optimistic),
              pessimistic: formatPrice(fiveYearsPrediction.pessimistic),
              average: formatPrice(fiveYearsPrediction.average),
              year: fiveYearsPrediction.year
            },
            in10Years: {
              optimistic: formatPrice(tenYearsPrediction.optimistic),
              pessimistic: formatPrice(tenYearsPrediction.pessimistic),
              average: formatPrice(tenYearsPrediction.average),
              year: tenYearsPrediction.year
            }
          }
        },
        // Overall recommendation based on the analysis
        recommendation: {
          action: recommendation,
          explanation: explanation,
          factors: reasons
        }
      };

      // Log the structured data as JSON
      console.log(JSON.stringify(volatilityData, null, 2));
    };

    /**
     * Downloads the Bitcoin price dataset CSV from Yahoo Finance
     */
    const downloadDatasetCSV = async () => {
      try {
        const endDateTimestamp = Math.floor(Date.now() / 1000);
        const url = `https://query1.finance.yahoo.com/v7/finance/download/BTC-USD?period1=1410912000&period2=${endDateTimestamp}&frequency=1d`;
        const response = await axios.get(url, { responseType: "stream" });
        return new Promise((resolve, reject) => {
          response.data.pipe(fs.createWriteStream(filePath))
            .on("finish", () => resolve())
            .on("error", (error) => reject(error));
        });
      } catch (error) {
        console.error("Error downloading the CSV file:", error);
        throw error;
      }
    };

    // Execute the download and analysis
    try {
      await downloadDatasetCSV();
      const csvResults = await readCSV(filePath);
      performAnalysis(csvResults);
    } catch (error) {
      console.error("Error in download or analysis process:", error);
    }
  }
};

// Call the analysis function with the CSV file path
bitcoinAnalysis.analyze({
  PATH: "YahooFinance/BTC-USD.csv", // This is the path CSV of the Bitcoin price dataset
  NEWS_API_KEY: "b0e29658504e4178bdd5ae90e075f7ef" // News API key: This Api is functional, but in case it doesn't work for you, I recommend creating one, just by entering the https://newsapi.org/ site, it is totally free.
});