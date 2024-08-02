const fs = require("fs");
const path = require("path");

const CSVHandler = {
    /**
     * Writes data to a CSV file. If the file already exists, it will be overwritten.
     * 
     * @param {string} filePath - The path to the CSV file.
     * @param {string} header - The header row for the CSV file.
     * @param {string} data - The data to be written to the CSV file.
     */
    writeCSV(filePath, header, data) {
        fs.writeFileSync(filePath, header); // Write the header to the file
        fs.writeFileSync(filePath, data, { flag: "a" }); // Append the data to the file
    },

    /**
     * Appends data to an existing CSV file.
     * 
     * @param {string} filePath - The path to the CSV file.
     * @param {string} data - The data to be appended to the CSV file.
     */
    appendCSV(filePath, data) {
        fs.writeFileSync(filePath, data, { flag: "a" }); // Append the data to the file
    },

    /**
     * Reads data from a CSV file.
     * 
     * @param {string} filePath - The path to the CSV file.
     * @returns {string|null} The content of the CSV file as a string, or null if the file does not exist.
     */
    readCSV(filePath) {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, "utf8"); // Read and return the file content
        }
        return null; // Return null if the file does not exist
    },

    /**
     * Retrieves a list of CSV files in a directory that match a given prefix.
     * 
     * @param {string} directory - The directory to search for CSV files.
     * @param {string} prefix - The prefix that the CSV files should start with.
     * @returns {string[]} An array of matching CSV file names.
     */
    getCSVFiles(directory, prefix) {
        return fs.readdirSync(directory).filter(file => file.startsWith(prefix) && file.endsWith(".csv"));
    },

    /**
     * Reads and parses the core simulation data from a CSV file.
     * 
     * @param {string} coreFilePath - The path to the directory containing the core CSV file.
     * @param {string} coreFileName - The name of the core CSV file.
     * @returns {Object} An object containing the parsed simulation records.
     * @throws Will throw an error if the core CSV file does not exist.
     */
    readCoreSimulations(coreFilePath, coreFileName) {
        const coreLogFile = path.join(coreFilePath, coreFileName);
        if (!fs.existsSync(coreLogFile)) {
            throw new Error("Core log file does not exist.");
        }

        const data = fs.readFileSync(coreLogFile, "utf8");
        const lines = data.trim().split("\n");
        const headers = lines[0].split(",");
        const records = lines.slice(1).map(line => {
            const values = line.split(",");
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });

        return { simulations: records };
    },

    /**
     * Calculates the total number of simulated data entries across multiple CSV files.
     * 
     * @param {string} directory - The directory containing the CSV files.
     * @param {string} prefix - The prefix that the CSV files should start with.
     * @returns {number} The total number of simulated data entries.
     */
    calculateSimulatedData(directory, prefix) {
        const csvFiles = this.getCSVFiles(directory, prefix);
        return csvFiles.reduce((acc, file) => {
            const filePath = path.join(directory, file);
            const data = this.readCSV(filePath);
            const lines = data.split("\n").slice(1); // Exclude the header line
            return acc + lines.length - 1; // Subtract 1 to account for the header line
        }, 0);
    }
};

module.exports = CSVHandler;