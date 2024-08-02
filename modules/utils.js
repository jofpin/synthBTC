const fs = require("fs");
const path = require("path");

const Utils = {
    /**
     * Converts a size in bytes to a human-readable string with appropriate units.
     */
    defineDataSize(bytes) {
        const units = ["Bytes", "KB", "MB", "GB", "TB"];
        const exponent = bytes ? Math.floor(Math.log2(bytes) / 10) : 0;
        const size = bytes ? (bytes / (1 << (exponent * 10))).toFixed(2) : "0";
        return `${size} ${units[exponent]}`;
    },

    /**
     * Calculates the elapsed time since a given start time and returns it as a formatted string.
     */
    defineExecutionTime(startTime) {
        const elapsed = Date.now() - startTime;
        const seconds = Math.floor((elapsed / 1000) % 60);
        const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
        const hours = Math.floor((elapsed / (1000 * 60 * 60)) % 24);
        const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
        const pad = (num) => String(num).padStart(2, "0");
        return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    },

    /**
     * Converts a time duration in milliseconds to a human-readable string.
     */
    defineProcessingTime(timeInMs) {
        if (timeInMs < 1000) {
            return `${timeInMs} ms`;
        } else if (timeInMs < 60000) {
            return `${(timeInMs / 1000).toFixed(2)} sec`;
        } else {
            return `${(timeInMs / 60000).toFixed(2)} min`;
        }
    },

    /**
     * Ensures that a directory exists. If it does not exist, it is created.
     */
    ensureDirectoryExists(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    },

    /**
     * Calculates the total size of all files in a directory.
     * 
     * @param {string} dir - The path to the directory.
     * @returns {number} The total size of all files in the directory in bytes.
     */
    calculateDataSize(dir) {
        const files = fs.readdirSync(dir);
        let totalSize = 0;

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                totalSize += stats.size;
            }
        });

        return totalSize;
    },

    /**
     * Calculates the percentage change between a simulated price and the current price.
     * 
     * @param {number} simulatedPrice - The simulated price.
     * @param {number} currentPrice - The current price.
     * @returns {string} The percentage change formatted as "+X.XX%" or "-X.XX%".
     */
    calculateChangePercentage(simulatedPrice, currentPrice) {
        const change = ((simulatedPrice - currentPrice) / currentPrice) * 100;
        return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    },

    /**
     * Calculates the target price as the mean plus one standard deviation of a list of prices.
     */
    calculateTargetPrice(prices) {
        const mean = prices.reduce((acc, p) => acc + p, 0) / prices.length;
        const variance = prices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        return mean + stdDev; // Target price as mean + 1 standard deviation
    },

    /**
     * Gets the index of the last file in a directory that matches a given prefix.
     * 
     * @param {string} dir - The path to the directory.
     * @param {string} prefix - The prefix that the files should start with.
     * @returns {number} The index of the last file, or 0 if no files match.
     */
    getLastFileIndex(dir, prefix) {
        const files = fs.readdirSync(dir);
        const csvFiles = files.filter(file => file.startsWith(prefix + "_") && file.endsWith(".csv"));
        if (csvFiles.length === 0) return 0;

        const indices = csvFiles.map(file => parseInt(file.match(/_(\d+)\.csv$/)[1], 10));
        return Math.max(...indices) + 1;
    },

    /**
     * Determines the next file index in a directory that matches a given prefix.
     * 
     * @param {string} dir - The path to the directory.
     * @param {string} prefix - The prefix that the files should start with.
     * @returns {number} The next file index.
     */
    determineNextFileIndex(dir, prefix) {
        const existingFiles = fs.readdirSync(dir).filter(file => file.startsWith(prefix + "_") && file.endsWith(".csv"));
        const existingIndices = existingFiles.map(file => parseInt(file.match(/_(\d+)\.csv$/)[1], 10));
        return existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;
    },

    /**
     * Displays a loading animation in the console for a given duration.
     */
    animateLoading(message, duration) {
        return new Promise((resolve) => {
            const frames = ["⠋", "⠙", "⠚", "⠞", "⠖", "⠦", "⠴", "⠲", "⠳", "⠓", "⠒", "⠉"];
            const glitchChars = ["@", "!", "#", "$", "%", "&", "*", "?", "=", "+"];
            let i = 0;
            const startTime = Date.now();
    
            const interval = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                const frameIndex = i % frames.length;
                
                const opacity = Math.floor(128 + 127 * Math.sin(i * 0.2));
                const frame = `\x1b[38;2;0;${opacity};255m${frames[frameIndex]}\x1b[0m`;
    
                const wavePosition = (i % 20) / 20;
                const coloredMessage = message.split("").map((char, index) => {
                    const charPosition = index / message.length;
                    const distance = Math.abs(charPosition - wavePosition);
                    const intensity = Math.floor(255 - (distance * 255 * 2));
                    if (Math.random() < 0.02) {
                        char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    }
                    return `\x1b[38;2;${intensity};${intensity};${intensity}m${char}\x1b[0m`;
                }).join("");
    
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`${frame} ${coloredMessage} \x1b[32m${(progress * 100).toFixed(0)}%\x1b[0m`);
    
                if (progress === 1) {
                    clearInterval(interval);
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                    process.stdout.write(`\x1b[32m✓\x1b[0m ${message} \x1b[32m100%\x1b[0m\n`);
                    resolve();
                }
                i++;
            }, 80);
        });
    }
};

module.exports = Utils;