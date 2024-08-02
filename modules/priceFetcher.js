const axios = require("axios");
const cheerio = require("cheerio");

const PriceFetcher = {
    /**
     * Fetches the current price of Bitcoin (BTC) from the CoinGecko API.
     */
    async fetchCoinGeckoPrice() {
        try {
            // Make a GET request to the CoinGecko API to fetch the current price of Bitcoin in USD
            const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
            // Return the price of Bitcoin in USD
            return response.data.bitcoin.usd;
        } catch (error) {
            // Log a warning message if the fetch fails
            console.warn(`\x1b[0m- \x1b[31mWARNING\x1b[0m | \x1b[37mFailed to fetch BTC price from CoinGecko.\x1b[0m`);
            return null;
        }
    },

    /**
     * Fetches the current price of Bitcoin (BTC) from the Etherscan website.
     */
    async fetchEtherscanPrice() {
        try {
            // Make a GET request to the Etherscan website to fetch the page content
            const response = await axios.get("https://etherscan.io/address/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
            // Load the HTML content using Cheerio
            const $ = cheerio.load(response.data);
            // Extract the price value from the specific HTML element
            const value = $("#ContentPlaceHolder1_tr_tokeninfo > div > span").text().trim();
            // Extract the numeric value from the text and remove any commas or dollar signs
            const matches = value.match(/[\d,]+\.?\d*/)[0].replace(/[\$,]/g, "");
            // Return the price as an integer
            return parseInt(matches, 10);
        } catch (error) {
            // Log a warning message if the fetch fails
            console.warn(`\x1b[0m- \x1b[31mWARNING\x1b[0m | \x1b[37mFailed to fetch BTC price from Etherscan.\x1b[0m`);
            return null;
        }
    },

    /**
     * Fetches the current price of Bitcoin (BTC) from both CoinGecko and Etherscan,
     * and returns the average price if both fetches are successful.
     */
    async getCurrentPrice() {
        // Fetch the price from CoinGecko
        const priceCoinGecko = await this.fetchCoinGeckoPrice();
        // Fetch the price from Etherscan
        const priceEtherscan = await this.fetchEtherscanPrice();

        // If both fetches are successful, return the average price
        if (priceCoinGecko !== null && priceEtherscan !== null) {
            return (priceCoinGecko + priceEtherscan) / 2;
        } 
        // If only the CoinGecko fetch is successful, return the CoinGecko price
        else if (priceCoinGecko !== null) {
            return priceCoinGecko;
        } 
        // If only the Etherscan fetch is successful, return the Etherscan price
        else if (priceEtherscan !== null) {
            return priceEtherscan;
        } 
        // If both fetches fail, throw an error
        else {
            throw new Error(`\x1b[0m- \x1b[31mWARNING\x1b[0m | \x1b[37mFailed to fetch BTC price from both sources.\x1b[0m`);
        }
    }
};

module.exports = PriceFetcher;