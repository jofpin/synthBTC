// Try to import the installed version of Turbit
const Turbit = require("turbit");
// Create a Turbit instance for parallel processing
const turbit = Turbit();

const MonteCarloEngine = {
    /**
     * Validates the input parameters for the simulation.
     */
    validateInputs({ currentPrice, totalSimulations, decimalVolatility, simulationDays }) {
        if (currentPrice <= 0) throw new Error("Current price must be greater than 0");
        if (totalSimulations <= 0) throw new Error("Simulations must be greater than 0");
        if (decimalVolatility <= 0) throw new Error("Volatility must be greater than 0");
        if (simulationDays <= 0) throw new Error("Days must be greater than 0");
    },

    /**
     * Simulates the prices using Monte Carlo simulation.
     * This function performs the core logic of the Monte Carlo simulation. It uses the Turbit library
     * to run the simulation in parallel, which significantly speeds up the computation.
     * 
     * The simulation generates random price changes for a given number of days, based on the provided
     * volatility and current price. It uses a Gaussian distribution to model the random changes.
     * 
     * @param {number} currentPrice - The current price of the asset.
     * @param {number} totalSimulations - The total number of simulations to run.
     * @param {number} decimalVolatility - The volatility of the asset as a decimal.
     * @param {number} simulationDays - The number of days to simulate.
     * @param {number} turbitPower - The power setting for Turbit parallel processing.
     * @returns {Promise<number[]>} A promise that resolves to an array of simulated prices.
     */
    async simulatePrices(currentPrice, totalSimulations, decimalVolatility, simulationDays, turbitPower) {
        // Validate the input parameters to ensure they are within acceptable ranges
        this.validateInputs({ currentPrice, totalSimulations, decimalVolatility, simulationDays });

        // Using Turbit for parallel processing
        // Turbit allows us to run the simulation in parallel, distributing the workload across multiple processes
        const result = await turbit.run(function ({ data, args }) {
            /**
             * Generates a random number following a Gaussian distribution.
             * This function uses the Box-Muller transform to generate a normally distributed random number.
             */
            const gaussianRandom = function () {
                let u = 0, v = 0;
                while (u === 0) u = Math.random();
                while (v === 0) v = Math.random();
                return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            }

            const { currentPrice, decimalVolatility, simulationDays } = args;

            // Simulate the price changes over the given number of days
            // For each simulation, we start with the current price and apply daily changes
            // The daily change is calculated using the exponential of the product of volatility and a Gaussian random number
            return Array.from({ length: data.length }, () => {
                let price = currentPrice;
                for (let i = 0; i < simulationDays; i++) {
                    const dailyChange = Math.exp(decimalVolatility * gaussianRandom() / Math.sqrt(simulationDays));
                    price *= dailyChange;
                }
                return price;
            });
        }, {
            type: "extended", // Specifies the type of processing to be used by Turbit
            data: Array(totalSimulations), // An array representing the number of simulations to run
            args: { currentPrice, decimalVolatility, simulationDays }, // Arguments to be passed to the simulation function
            power: turbitPower // The power setting for Turbit, controlling the level of parallelism
        });

        // Return the array of simulated prices
        return result.data;
    },
    
    /**
     * Executes the full simulation in batches.
     * This function divides the total number of simulations into smaller batches to manage memory usage
     * and improve performance. It calls the simulatePrices function for each batch and combines the results.
     * 
     * @param {Object} params - The input parameters.
     * @param {number} params.currentPrice - The current price of the asset.
     * @param {number} params.totalSimulations - The total number of simulations to run.
     * @param {number} params.decimalVolatility - The volatility of the asset as a decimal.
     * @param {number} params.simulationDays - The number of days to simulate.
     * @param {number} params.turbitPower - The power setting for Turbit parallel processing.
     * @returns {Promise<number[]>} A promise that resolves to an array of all simulated prices.
     */
    async executeFullSimulation({ currentPrice, totalSimulations, decimalVolatility, simulationDays, turbitPower }) {
        const desiredBatchSize = 5000; 
        const batchCount = Math.ceil(totalSimulations / desiredBatchSize);

        let allPrices = [];
        for (let i = 0; i < batchCount; i++) {
            // Determine the size of the current batch
            const batchSize = i === batchCount - 1 ? totalSimulations - (i * desiredBatchSize) : desiredBatchSize;
            // Run the simulation for the current batch
            const batchPrices = await this.simulatePrices(currentPrice, batchSize, decimalVolatility, simulationDays, turbitPower);
            // Combine the results of the current batch with the previous results
            allPrices = allPrices.concat(batchPrices);
        }
        // Return the combined results of all batches
        return allPrices;
    }
};

module.exports = MonteCarloEngine;