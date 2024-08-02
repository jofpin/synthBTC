const express = require("express");
const path = require("path");
const APICore = require("./apiCore");
const Utils = require("./utils");

const ServerCore = {
    latestOutput: null,

    /**
     * Initializes the server with the given configuration.
     * Sets up the Express application, serves static files, sets up API routes,
     * schedules simulation generation, and starts the server.
     * 
     * @param {Object} synthBTC - The main synthBTC object containing core functionalities.
     * @param {Object} config - The configuration object.
     * @param {Object} config.simulationConfig - The simulation configuration.
     * @param {Object} config.webConfig - The web server configuration.
     */
    init: function(synthBTC, { simulationConfig, webConfig }) {
        const app = express();
        let port = webConfig.serverPort;

        // Serve static files from the clientPublicDir directory
        app.use("/assets", express.static(path.join(__dirname, "..", synthBTC.clientPublicDir)));

        // Serve the home page
        app.get(webConfig.homeEndpoint, async (req, res) => {
            try {
                res.sendFile(path.join(__dirname, "..", synthBTC.clientPublicDir, webConfig.htmlFilePath));
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Setup API routes
        const api = APICore(synthBTC);
        api.setupRoutes(app);
        
        // Schedule simulation generation based on the interval in minutes
        const defineIntervalConfig = simulationConfig.simulationInterval;
        
        setInterval(async () => {
            this.latestOutput = await synthBTC.getSimulationData(simulationConfig);
        }, defineIntervalConfig * 60 * 1000); 

        /**
         * Starts the server on the given port.
         * If the port is already in use, it increments the port number and tries again.
         * 
         * @param {number} port - The port number to start the server on.
         */
        function runServer(port) {
            const server = app.listen(port);
        
            server.on("error", (error) => {
                if (error.code === "EADDRINUSE") {
                    runServer(port + 1);
                } else {
                    console.error(`\x1b[0m- \x1b[31mERROR\x1b[0m | \x1b[37mServer error: ${error.message}\x1b[0m`);
                    process.exit(1);
                }
            });
        
            server.on("listening", async () => {
                console.clear();
                const steps = [
                    { message: "Initializing synthBTC", duration: 250 },
                    { message: "Loading configuration", duration: 1000 },
                    { message: "Setting up API routes", duration: 1200 },
                    { message: "Preparing Simulation Engine", duration: 1800 },
                    { message: "Starting Server", duration: 4000 }
                ];

                // Display loading animation for each step
                for (const step of steps) {
                    await Utils.animateLoading(step.message, step.duration);
                }
        
                setTimeout(async () => {
                    console.clear();
                    console.log("\x1b[32m%s\x1b[0m", "🟢 synthBTC Server is now running!");
                    console.log("\x1b[37m%s\x1b[0m", "----------------------------------------");
                    console.log("\x1b[36m%s\x1b[0m", `🏠 Home (Endpoint): \x1b[4mhttp://localhost:${port}${webConfig.homeEndpoint}\x1b[0m`);
                    console.log("\x1b[36m%s\x1b[0m", `🌐 API (Endpoint): \x1b[4mhttp://localhost:${port}/api\x1b[0m`);
                    console.log("\x1b[37m%s\x1b[0m", "----------------------------------------");
                    console.log("\x1b[32m%s\x1b[0m", "Welcome to synthBTC!");
                    console.log("\x1b[37m%s\x1b[0m", "Enjoy your simulation experience.");
                    console.log("\x1b[37m%s\x1b[0m", "---------------------------");
                    console.log("\x1b[37m%s\x1b[0m", "2024 Created by Jose Pino ©");
                    console.log("\x1b[37m%s\x1b[0m", "---------------------------");

                    // Generate initial simulations if not already generated
                    if (!this.latestOutput) {
                        this.latestOutput = await synthBTC.getSimulationData(simulationConfig);
                    }
                }, 6000); 
            });
        }
        
        // Start the server with the initial port
        runServer(port);
    }
};

module.exports = ServerCore;