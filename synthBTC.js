/**
 * @file synthBTC.js
 * @name synthBTC
 * @description A tool that uses advanced Monte Carlo simulations and Turbit parallel processing to create possible Bitcoin prediction scenarios.
 * 
 * @version 1.0.0
 * @license MIT
 * 
 * @author Jose Pino
 * @contact jose@pino.sh (https://x.com/jofpin)
 * 
 * Find the project on GitHub:
 * https://github.com/jofpin/synthBTC
 * 
 * ===============================
 * Copyright (c) 2024 by Jose Pino
 * ===============================
 * 
 * Released on: August 2, 2024
 * Last update: August 2, 2024
 * 
 */

// External dependencies
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Internal modules
const Utils = require("./modules/utils");
const CSVHandler = require("./modules/csvHandler");
const PriceFetcher = require("./modules/priceFetcher");
const MonteCarloEngine = require("./modules/monteCarloEngine");
const ServerCore = require("./modules/serverCore");

// Configuration main (json)
const Config = require("./config.json");

/**
 * synthBTC class
 * Handles Bitcoin price simulations and server initialization
 */
class synthBTC {
    // Static properties
    static lastKnownPrice = null;
    static connectionLost = false;
    static coreFilePath = "private";
    static coreFileName = "core.csv";
    static dataPrivateDir = path.join(__dirname, "private/data");
    static clientPublicDir = "public";
    static outputFileSources = "source_simulation";
    static fileIndex = 1;
    static simulatedData = 0;
    static simulationCounter = 0;
    static simulationStatus = "OK";
    static serverStartTime = Date.now();
    static latestOutput = null;

    /**
     * Fetch the current price of BTC
     */
    static async currentPriceBTC() {
        try {
            this.lastKnownPrice = await PriceFetcher.getCurrentPrice();
            this.connectionLost = false;
        } catch (error) {
            console.warn(error.message);
            this.connectionLost = true;
        }

        return this.lastKnownPrice;
    }
    
    /**
     * Get updated overview data.
     */
    static async getUpdatedOverview(currentPrice, highestPrice, targetPrice, averagePrice, lowestPrice) {
        return {
            current: {
                price: Math.round(currentPrice)
            },
            highest: {
                price: Math.round(highestPrice),
                changePercentage: Utils.calculateChangePercentage(highestPrice, currentPrice)
            },
            target: {
                price: Math.round(targetPrice),
                changePercentage: Utils.calculateChangePercentage(targetPrice, currentPrice)
            },
            average: {
                price: Math.round(averagePrice),
                changePercentage: Utils.calculateChangePercentage(averagePrice, currentPrice)
            },
            lowest: {
                price: Math.round(lowestPrice),
                changePercentage: Utils.calculateChangePercentage(lowestPrice, currentPrice)
            }
        };
    }

    /**
     * Generate simulations and save to file
     * @param {Object} params - Simulation parameters
     * @param {number} params.totalSimulations - Total number of simulations to run
     * @param {number} params.volatilityPercentage - Volatility percentage for simulations
     * @param {number} params.simulationDays - Number of days to simulate
     * @param {number} params.turbitPower - Turbit power for simulations
     * @returns {Promise<Object>} Simulation results
     * @description This method generates Bitcoin price simulations using the MonteCarloEngine module. 
     * It calculates various statistics such as the lowest, highest, average, and target prices, and logs the simulation details. 
     * The results are saved to a CSV file, and an overview of the simulation data is returned.
     */
    static async generateSimulations({ totalSimulations, volatilityPercentage, simulationDays, turbitPower }) {
        this.simulationStatus = "PROCESSING";
    
        const currentPrice = await this.currentPriceBTC();
        const decimalVolatility = volatilityPercentage / 100;
    
        const startTime = Date.now();
        const allPrices = await MonteCarloEngine.executeFullSimulation({ currentPrice, totalSimulations, decimalVolatility, simulationDays, turbitPower });
        const processingTime = Date.now() - startTime;
    
        const lowestPrice = allPrices.reduce((min, p) => p < min ? p : min, allPrices[0]);
        const highestPrice = allPrices.reduce((max, p) => p > max ? p : max, allPrices[0]);
        const averagePrice = allPrices.reduce((acc, p) => acc + p, 0) / allPrices.length;
    
        const targetPrice = Utils.calculateTargetPrice(allPrices);
    
        this.simulatedData += totalSimulations;
        this.simulationCounter++;
    
        // Log the simulation details
        console.log(`\x1b[0m- SIMULATION \x1b[32m#${this.simulationCounter}\x1b[0m | \x1b[37mTotal Simulations:\x1b[33m ${totalSimulations.toLocaleString()}\x1b[0m | \x1b[37mBTC Price:\x1b[33m $${Math.round(currentPrice)}\x1b[0m | \x1b[37mProcessing Time:\x1b[33m ${Utils.defineProcessingTime(processingTime)}\x1b[0m`);
    
        // Determine the next file index based on existing files
        this.fileIndex = Utils.determineNextFileIndex(this.dataPrivateDir, this.outputFileSources);
        
        const file = path.join(this.dataPrivateDir, `${this.outputFileSources}_${this.fileIndex}.csv`);
        const csvHeader = "simulation_id,price,percentage_change\n";
        CSVHandler.writeCSV(file, csvHeader, "");
    
        for (let i = 0; i < Math.ceil(totalSimulations / 5000); i++) {
            let csvContent = "";
            const slicedPrices = allPrices.slice(i * 5000, (i + 1) * 5000);
            slicedPrices.forEach((price, index) => {
                csvContent += `${index + 1},${Math.round(price)},${Utils.calculateChangePercentage(price, currentPrice)}\n`;
            });
            CSVHandler.appendCSV(file, csvContent);
        }
    
        const coreLogFile = path.join(this.coreFilePath, this.coreFileName);
        const logHeader = "simulation_id,timestamp,current_price,highest_price,target_price,average_price,lowest_price,simulated_data,total_simulated,processing_time,data_source\n";
        const logEntry = `${this.simulationCounter},${Date.now()},${Math.round(currentPrice)},${Math.round(highestPrice)},${Math.round(targetPrice)},${Math.round(averagePrice)},${Math.round(lowestPrice)},${totalSimulations},${this.simulatedData},${Utils.defineProcessingTime(processingTime)},${this.outputFileSources}_${this.fileIndex}.csv\n`;
    
        if (!fs.existsSync(coreLogFile)) {
            CSVHandler.writeCSV(coreLogFile, logHeader, logEntry);
        } else {
            CSVHandler.appendCSV(coreLogFile, logEntry);
        }
    
        this.simulationStatus = "OK";
    
        return {
            status: this.simulationStatus,
            overview: await this.getUpdatedOverview(currentPrice, highestPrice, targetPrice, averagePrice, lowestPrice),
            details: {
                simulatedData: this.simulatedData,
                processingTime: Utils.defineProcessingTime(processingTime),
                executionTime: Utils.defineExecutionTime(this.serverStartTime),
                currentYear: new Date().getFullYear(),
                totalSimulations: this.simulationCounter,
                totalSimulationDays: simulationDays,
                dataSource: `${this.outputFileSources}_${this.fileIndex}.csv`,
                dataSize: Utils.defineDataSize(Utils.calculateDataSize(this.dataPrivateDir))
            }
        };
    }

    /**
     * Get simulation data
     * @description This method generates new simulation data based on the provided configuration. 
     * It updates the latestOutput property with the new simulation results and returns the results.
     */
    static async getSimulationData(simulationConfig) {
        const output = await this.generateSimulations(simulationConfig);
        this.latestOutput = output;
        return output;
    }

    /**
     * Check for missing dependencies
     * @description This method checks for the required dependencies (express, cheerio, axios and turbit :) ) and returns a list of any missing dependencies.
     */
    static async checkDependencies() {
        const dependencies = [
            "express",
            "cheerio",
            "axios",
            "turbit"
        ];

        const missingDependencies = [];

        for (const dep of dependencies) {
            try {
                require.resolve(dep);
            } catch (e) {
                missingDependencies.push(dep);
            }
        }

        return missingDependencies;
    }

    /**
     * Install missing dependencies
     * @description This method installs any missing dependencies using npm. 
     */
    static async installDependencies(missingDependencies) {
        for (let i = 0; i < missingDependencies.length; i++) {
            const dep = missingDependencies[i];
            console.log(`\x1b[0m- \x1b[34mINFO\x1b[0m | \x1b[37mInstalling dependency (${i + 1}/${missingDependencies.length}): ${dep}\x1b[0m`);
    
            await Utils.animateLoading(`Installing dependency: ${dep}`, 3000, async () => {
                return new Promise((resolve, reject) => {
                    // Check if the package exists in npm
                    exec(`npm view ${dep} version`, (viewError, viewStdout, viewStderr) => {
                        if (viewError) {
                            console.error(`\x1b[0m- \x1b[31mERROR\x1b[0m | \x1b[37mPackage ${dep} does not exist in npm.\x1b[0m`);
                            console.error(`\x1b[0m- \x1b[31mDETAILS\x1b[0m | \x1b[37m${viewStderr}\x1b[0m`);
                            reject(`\x1b[0m- \x1b[31mERROR\x1b[0m | \x1b[37mPackage ${dep} does not exist in npm.\x1b[0m`);
                        } else {
                            console.log(`\x1b[0m- \x1b[34mINFO\x1b[0m | \x1b[37mPackage ${dep} found in npm: ${viewStdout.trim()}\x1b[0m`);
                            // Install the package
                            exec(`npm install ${dep}`, (installError, installStdout, installStderr) => {
                                if (installError) {
                                    console.error(`\x1b[0m- \x1b[31mERROR\x1b[0m | \x1b[37mError installing ${dep}: ${installStderr}\x1b[0m`);
                                    reject(`\x1b[0m- \x1b[31mERROR\x1b[0m | \x1b[37mError installing ${dep}: ${installError.message}\x1b[0m`);
                                } else {
                                    console.log(`\x1b[0m- \x1b[32mSUCCESS\x1b[0m | \x1b[37m${dep} installed successfully.\x1b[0m`);
                                    console.log(`\x1b[0m- \x1b[34mDETAILS\x1b[0m | \x1b[37m${installStdout}\x1b[0m`);
                                    resolve(`\x1b[0m- \x1b[32mSUCCESS\x1b[0m | \x1b[37m${dep} installed successfully.\x1b[0m`);
                                }
                            });
                        }
                    });
                });
            });
        }
    }
    
    /**
     * Initialize the server
     * @description This method initializes the server by checking for and installing any missing dependencies, 
     * setting up the necessary directories, and starting the server using the ServerCore module.
     */
    static async init({ simulationConfig, webConfig }) {
        console.clear();
        const missingDependencies = await this.checkDependencies();

        if (missingDependencies.length > 0) {
            await this.installDependencies(missingDependencies);
        } else {
            console.log("🟢 All dependencies are already installed.");
        }

        this.simulationConfig = simulationConfig;
        this.serverStartTime = Date.now();
        this.Utils = Utils;

        Utils.ensureDirectoryExists(this.dataPrivateDir);
        this.fileIndex = Utils.getLastFileIndex(this.dataPrivateDir, this.outputFileSources);

        // Calculate existing statistics
        this.simulatedData = CSVHandler.calculateSimulatedData(this.dataPrivateDir, this.outputFileSources);
        this.simulationCounter = CSVHandler.getCSVFiles(this.dataPrivateDir, this.outputFileSources).length;

        // Initialize the server using ServerCore
        ServerCore.init(this, { simulationConfig, webConfig });
    }
}

// Initialize the server with configuration from config.json
synthBTC.init(Config);
