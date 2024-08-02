# Bitcoin Analysis Script

This script is part of the research conducted for the development of synthBTC. It analyzes Bitcoin price data to calculate volatility metrics, predict future prices, and provide insights into Bitcoin's historical price movements.

## Functionality

The script performs the following key functions:

1. Automatically downloads the most up-to-date BTC-USD historical data from Yahoo Finance.
2. Calculates daily returns and various volatility metrics (daily, weekly, monthly, and annual).
3. Identifies important dates such as maximum price increases and decreases.
4. Predicts volatility for the current date based on historical data.
5. Estimates probabilities of price increases and decreases for the current date.
6. Predicts future prices for the next 365 days using a Monte Carlo simulation approach.
7. Projects long-term price predictions for 3, 5, and 10 years with optimistic, pessimistic, and average scenarios.
8. Analyzes market sentiment using news data from a news API.
9. Calculates RSI (Relative Strength Index) for technical analysis.
10. Generates buy/sell recommendations based on multiple market indicators.
11. Provides a comprehensive market analysis with price and volume comparisons.
12. Outputs a detailed JSON object with all analysis results.
13. Saves predicted future prices to a separate CSV file.

## Data Source

The script automatically downloads the most up-to-date BTC-USD historical data from Yahoo Finance using the following link:
[https://finance.yahoo.com/quote/BTC-USD/history/](https://finance.yahoo.com/quote/BTC-USD/history/)

> This ensures that the analysis is always performed on the latest available data.

## Objective

The main objectives of this script are:

- To provide a deep understanding of Bitcoin's historical price volatility.
- To offer insights into potential future price movements.
- To support the development of synthBTC by providing data-driven analysis of Bitcoin's behavior.

## Usage

To use the script, ensure you have a CSV file with Bitcoin price data in the specified format. Then run:

```shell
node bitcoinAnalysis.js
```

The script expects the CSV file to be located at `YahooFinance/BTC-USD.csv`. Adjust the file path in the script if necessary.

## Output

The script produces one main output, a JSON object logged to the console, containing all analysis results, including:
   - Historical volatility metrics
   - Important dates and price points
   - Predicted volatility for the current date
   - Probability estimates for price movements
   - Short-term future price predictions (365 days)
   - Long-term price projections (3, 5, and 10 years) with optimistic, pessimistic, and average scenarios
   - Market analysis including current price, volume, RSI, and market mood
   - Buy/sell recommendation based on current market conditions

## Dependencies

This script requires the following Node.js packages:

- fs
- axios
- csv-parser
- mathjs
- moment
- json2csv
- sentiment

Ensure these are installed before running the script.

## Note

This script is part of the research phase for **synthBTC** development. The predictions and analysis should be used for informational purposes only and not as financial advice. The accuracy of predictions depends on the quality and representativeness of the historical data used. Long-term projections, in particular, are speculative and should be interpreted with caution.