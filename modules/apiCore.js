const CSVHandler = require("./csvHandler");

const APICore = (synthBTC) => ({
    /**
     * Retrieves the most recent simulation data, including key statistics and execution details.
     * If the latest simulation data is not available, it triggers a new simulation.
     */
    getOverview: async (req, res) => {
        try {
            if (!synthBTC.latestOutput) {
                synthBTC.latestOutput = await synthBTC.getSimulationData(synthBTC.simulationConfig);
            }
            synthBTC.latestOutput.details.executionTime = synthBTC.Utils.defineExecutionTime(synthBTC.serverStartTime);
            synthBTC.latestOutput.status = synthBTC.simulationStatus;
            res.json(synthBTC.latestOutput);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Returns a comprehensive list of all historical simulation records stored in core.csv.
     */
    getSimulations: async (req, res) => {
        try {
            const simulations = await CSVHandler.readCoreSimulations(synthBTC.coreFilePath, synthBTC.coreFileName);
            res.json(simulations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Fetches specific simulation records by their unique identifiers from core.csv.
     * The IDs are provided as a comma-separated string in the request parameters.
     */
    getSimulationsByIds: async (req, res) => {
        try {
            const simulations = await CSVHandler.readCoreSimulations(synthBTC.coreFilePath, synthBTC.coreFileName);
            const ids = req.params.ids.split(",").map(id => parseInt(id, 10));
            const results = ids.map(id => {
                if (id > 0 && id <= simulations.simulations.length) {
                    return simulations.simulations[id - 1];
                } else {
                    return { error: `Simulation ${id} not available` };
                }
            });
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Provides an index of available API endpoints with descriptions.
     */
    getApiIndex: (req, res) => {
        res.json({
            message: "Welcome to the synthBTC API",
            endpoints: {
                "/api/overview": "Retrieves the most recent simulation data, including key statistics and execution details.",
                "/api/simulations": "Returns a comprehensive list of all historical simulation records stored in core.csv.",
                "/api/simulations/:id": "Fetches a specific simulation record by its unique identifier from core.csv.",
                "/api/simulations/:ids": "Retrieves multiple simulation records by their IDs (comma-separated) from core.csv."
            }
        });
    },

    /**
     * Handles requests to routes that are not available.
     */
    handleNotFound: (req, res) => {
        res.status(404).json({ error: "Route not available" });
    },

    /**
     * Handles internal server errors.
     */
    handleServerError: (err, req, res, next) => {
        res.status(500).json({ error: "Internal server error" });
    },

    /**
     * Sets up the API routes and error handling for the application.
     */
    setupRoutes: function(app) {
        app.get("/api/overview", (req, res) => this.getOverview(req, res));
        app.get("/api/simulations", (req, res) => this.getSimulations(req, res));
        app.get("/api/simulations/:ids", (req, res) => this.getSimulationsByIds(req, res));
        app.get("/api/prediction-performance", (req, res) => this.getPredictionPerformance(req, res));
        app.get("/api", (req, res) => this.getApiIndex(req, res));

        // Error handling
        app.use(this.handleNotFound);
        app.use(this.handleServerError);
    }
});

module.exports = APICore;