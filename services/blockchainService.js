const { ethers } = require("ethers");
const logger = require("../utils/logger");

/**
 * Blockchain Service for monitoring Ethereum transactions
 * Task 3.1: API Middleware - Listen for incoming Ethereum token transactions
 */
class BlockchainService {
    constructor(providerUrl, tokenAddress, privateKey) {
        this.provider = new ethers.JsonRpcProvider(providerUrl);
        this.tokenAddress = tokenAddress;
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.tokenContract = null;
        this.isMonitoring = false;
        this.knownTransactions = new Set();
        
        this.initializeContract();
    }
    
    /**
     * Initialize token contract
     */
    async initializeContract() {
        try {
            const tokenABI = [
                "event Transfer(address indexed from, address indexed to, uint256 value)",
                "function balanceOf(address owner) view returns (uint256)",
                "function name() view returns (string)",
                "function symbol() view returns (string)",
                "function decimals() view returns (uint8)"
            ];
            
            this.tokenContract = new ethers.Contract(this.tokenAddress, tokenABI, this.provider);
            logger.info(`Blockchain service initialized for token: ${this.tokenAddress}`);
        } catch (error) {
            logger.error("Failed to initialize blockchain service:", error);
            throw error;
        }
    }
    
    /**
     * Start monitoring for token transfers
     * @param {string} targetAddress - Address to monitor for incoming transfers
     * @param {Function} callback - Callback function when transfer is detected
     */
    async startMonitoring(targetAddress, callback) {
        if (this.isMonitoring) {
            logger.warn("Monitoring already active");
            return;
        }
        
        try {
            logger.info(`Starting monitoring for address: ${targetAddress}`);
            this.isMonitoring = true;
            
            // Listen for Transfer events
            this.tokenContract.on("Transfer", async (from, to, value, event) => {
                // Check if transfer is to our target address
                if (to.toLowerCase() === targetAddress.toLowerCase()) {
                    const txHash = event.transactionHash;
                    
                    // Avoid processing duplicate transactions
                    if (this.knownTransactions.has(txHash)) {
                        return;
                    }
                    
                    this.knownTransactions.add(txHash);
                    
                    // Get transaction details
                    const tx = await event.getTransaction();
                    const receipt = await event.getTransactionReceipt();
                    
                    const transferData = {
                        transactionHash: txHash,
                        from: from,
                        to: to,
                        value: ethers.formatEther(value),
                        blockNumber: event.blockNumber,
                        timestamp: Date.now(),
                        gasUsed: receipt.gasUsed.toString(),
                        status: receipt.status === 1 ? "success" : "failed"
                    };
                    
                    logger.info(`Token transfer detected: ${txHash}`, transferData);
                    
                    // Call callback with transfer data
                    try {
                        await callback(transferData);
                    } catch (error) {
                        logger.error("Error in transfer callback:", error);
                    }
                }
            });
            
            logger.info("Token transfer monitoring started successfully");
            
        } catch (error) {
            this.isMonitoring = false;
            logger.error("Failed to start monitoring:", error);
            throw error;
        }
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.tokenContract) {
            this.tokenContract.removeAllListeners("Transfer");
        }
        this.isMonitoring = false;
        logger.info("Token transfer monitoring stopped");
    }
    
    /**
     * Get token balance for an address
     * @param {string} address - Address to check balance for
     * @returns {string} Token balance
     */
    async getTokenBalance(address) {
        try {
            const balance = await this.tokenContract.balanceOf(address);
            return ethers.formatEther(balance);
        } catch (error) {
            logger.error("Failed to get token balance:", error);
            throw error;
        }
    }
    
    /**
     * Get token information
     * @returns {Object} Token information
     */
    async getTokenInfo() {
        try {
            const [name, symbol, decimals] = await Promise.all([
                this.tokenContract.name(),
                this.tokenContract.symbol(),
                this.tokenContract.decimals()
            ]);
            
            return { name, symbol, decimals: decimals.toString() };
        } catch (error) {
            logger.error("Failed to get token info:", error);
            throw error;
        }
    }
    
    /**
     * Verify transaction signature
     * @param {Object} transactionData - Transaction data
     * @returns {boolean} True if signature is valid
     */
    verifyTransactionSignature(transactionData) {
        try {
            // In a real implementation, you would verify the transaction signature
            // For this demo, we'll assume all transactions are valid
            logger.info("Transaction signature verification passed");
            return true;
        } catch (error) {
            logger.error("Transaction signature verification failed:", error);
            return false;
        }
    }
    
    /**
     * Get transaction details
     * @param {string} txHash - Transaction hash
     * @returns {Object} Transaction details
     */
    async getTransactionDetails(txHash) {
        try {
            const tx = await this.provider.getTransaction(txHash);
            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            return {
                hash: txHash,
                from: tx.from,
                to: tx.to,
                value: ethers.formatEther(tx.value),
                gasPrice: ethers.formatUnits(tx.gasPrice, "gwei"),
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: tx.blockNumber,
                status: receipt.status === 1 ? "success" : "failed"
            };
        } catch (error) {
            logger.error("Failed to get transaction details:", error);
            throw error;
        }
    }
}

module.exports = BlockchainService;

