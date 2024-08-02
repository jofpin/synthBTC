const synthBTCApp  = {
    /**
     * Fetches data from the server's overview API endpoint.
     * On success, it updates the overview and details sections of the UI.
     */
    async fetchData() {
        try {
            // Fetch data from the /api/overview endpoint
            const response = await fetch("/api/overview");
            const data = await response.json();
            // Update the UI with the fetched data
            this.displayOverview(data.overview);
            this.displayDetails(data.details);

            // Check and update the processing status
            this.updateProcessingStatus(data.status);
        } catch (error) {
            // Log an error message if the fetch fails
            console.error("Error fetching data:", error);
        }
    },

    /**
     * Formats a number as a localized string with commas as thousand separators.
     */
    formatCounter(price) {
        return `${Number(price).toLocaleString()}`;
    },

    /**
     * Updates the overview section of the UI with the provided data.
     */
    displayOverview(overview) {
        // Update the price elements with the corresponding data
        this.displayPrice("highest-price", "highest-percentage", overview.highest);
        this.displayPrice("target-price", "target-percentage", overview.target);
        this.displayPrice("average-price", "average-percentage", overview.average);
        this.displayPrice("lowest-price", "lowest-percentage", overview.lowest);
        
        // Update the current price element
        const currentPriceElement = document.getElementById("current-price");
        currentPriceElement.textContent = "$" + this.formatCounter(overview.current.price);
    },

    /**
     * Updates the details section of the UI with the provided data.
     */
    displayDetails(details) {
        // Update the details elements with the corresponding data
        document.getElementById("total-simulations").textContent = details.totalSimulations;
        document.getElementById("total-simulation-days").textContent = details.totalSimulationDays;
        document.getElementById("total-processing-time").textContent = details.processingTime;
        document.getElementById("total-execution-time").textContent = details.executionTime;
        document.getElementById("current-year").textContent = details.currentYear;
        document.getElementById("simulated-data").textContent = this.formatCounter(details.simulatedData);
    },

    /**
     * Updates the price and percentage elements with the provided data.
     * 
     * @param {string} priceElementId - The ID of the price element.
     * @param {string} percentageElementId - The ID of the percentage element.
     * @param {Object} priceData - The price data.
     */
    displayPrice(priceElementId, percentageElementId, priceData) {
        // Get the price and percentage elements by their IDs
        const priceElement = document.getElementById(priceElementId);
        const percentageElement = document.getElementById(percentageElementId);
        
        // Update the text content of the elements with the formatted data
        priceElement.textContent = "$" + this.formatCounter(priceData.price);
        percentageElement.textContent = `${priceData.changePercentage}`;
    },

    /**
     * Handles the loader animation and removal.
     */
    outLoader(className) {
        var element = document.querySelector("[class^='"+className+"']");
        
        element.style.transition = "opacity 3s ease";
        element.style.opacity = 1;

        setTimeout(() => {
            element.parentNode.removeChild(element);
        }, 3300);
    },

    /**
     * Plays the loading sound.
     */
    playLoadingSound() {
        const audio = new Audio("/assets/sounds/loading.mp3");
        audio.loop = true;
        audio.play().catch(error => console.log('Error playing loading sound:', error));
        return audio;
    },

    /**
     * Plays the completion sound.
     */
    playCompletionSound() {
        const audio = new Audio("/assets/sounds/completion.mp3");
        audio.play().catch(error => console.log('Error playing completion sound:', error));
    },

    /**
     * Sets up the API button event listener.
     */
    setupAPIButton() {
        var apiButton = document.querySelector(".synthBTC-App--btnAPI");
        
        apiButton.addEventListener("click", (event) => {
            event.preventDefault();
            
            // Add loading class to start the spin animation
            apiButton.classList.add("loading");
            
            // Start playing the loading sound
            const loadingSound = this.playLoadingSound();
            
            setTimeout(() => {
                // Stop the loading sound
                loadingSound.pause();
                loadingSound.currentTime = 0;
                
                // Remove loading class and add completed class
                apiButton.classList.remove("loading");
                apiButton.classList.add("completed");
                
                // Play the completion sound
                this.playCompletionSound();

                // Change the title
                document.title = "API HAS BEEN OPENED";
                
                // Remove completed class and open link after a short delay
                setTimeout(() => {
                    apiButton.classList.remove("completed");
                    window.open(apiButton.href, "_blank");
                    
                    // Reset the title after a short delay
                    setTimeout(() => {
                        this.updateState(document.hasFocus());
                    }, 5000);
                }, 700);
            }, 2300);
        });
    },
    
    /**
     * Displays a notification message with animation.
     * 
     * This function shows a notification message at the top of the screen with different
     * animations based on the message content. It handles two specific message types:
     * "PROCESSING DATA" and "SIMULATION SUCCESSFUL".
     */
    showNotification(message) {
        const notification = document.querySelector(".synthBTC-App--OverHeader");
        const messageElement = notification.querySelector(".synthBTC-App--OverHeader---message");
        
        messageElement.classList.remove("processing-animation", "success-animation");

        if (message === "PROCESSING DATA") {
            messageElement.classList.add("processing-animation");
        } else if (message === "SIMULATION SUCCESSFUL") {
            messageElement.classList.add("success-animation");
        }
        
        messageElement.textContent = message;
        notification.style.display = "flex";
        notification.style.opacity = "1";
        
        setTimeout(() => {
            notification.style.opacity = "0";
            setTimeout(() => {
                notification.style.display = "none";
                notification.style.opacity = "1";
            }, 800);
        }, 3000);
    },
    
    /**
     * Updates the processing status and changes the title and favicon accordingly.
     */
    updateProcessingStatus(status) {
        const wasProcessing = this.isProcessing;
        this.isProcessing = status === "PROCESSING";
        
        if (this.isProcessing && !wasProcessing) {
            this.showNotification("PROCESSING DATA");
        } else if (!this.isProcessing && wasProcessing) {
            this.showNotification("SIMULATION SUCCESSFUL");
        }
        
        this.updateState(document.hasFocus());
    },

    /**
     * Sets up dynamic favicon and title changes based on window focus.
     */
    setupPageState() {
        const defaultTitle = "synthBTC: Bitcoin Price Prediction Using Synthetic Data";
        const inactiveTitle = "Return to synthBTC";
        const processingTitle = "PROCESSING DATA";
        const activeFaviconPath = "/assets/img/favicon-active.png";
        const inactiveFaviconPath = "/assets/img/favicon-inactive.png";
        const processingFaviconPath = "/assets/img/favicon-processing.png";
    
        this.updateState = (isActive) => {
            if (this.isProcessing) {
                document.title = processingTitle;
                document.querySelector("link[rel='icon']").href = `${processingFaviconPath}?v=${new Date().getTime()}`;
            } else {
                document.title = isActive ? defaultTitle : inactiveTitle;
                const faviconPath = isActive ? activeFaviconPath : inactiveFaviconPath;
                document.querySelector("link[rel='icon']").href = `${faviconPath}?v=${new Date().getTime()}`;
            }
        };
    
        window.addEventListener("blur", () => this.updateState(false));
        window.addEventListener("focus", () => this.updateState(true));
    },

    /**
     * Initializes the application by fetching data, setting up a periodic fetch,
     * handling the loader, and setting up the API button.
     */
    init() {
        this.isProcessing = false;
        // Fetch data immediately
        this.fetchData();
        // Set up a periodic fetch every second
        setInterval(() => this.fetchData(), 1000);
        // Handle the loader
        this.outLoader("synthBTC-App--processingLoader");
        // Set up the API button
        this.setupAPIButton();
        // Set up dynamic favicon and title changes
        this.setupPageState();
    }
};

// Initialize the application when the window loads
window.onload = () => {
    synthBTCApp.init();
};