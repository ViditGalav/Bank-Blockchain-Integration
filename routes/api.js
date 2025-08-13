const express = require("express");
const Joi = require("joi");
const BlockchainService = require("../services/blockchainService");
const BankingService = require("../services/bankingService");
const KYCService = require("../services/kycService");
const { 
    createRateLimiter, 
    verifyTransactionSignature, 
    validateInput, 
    authenticateApiKey,
    requestLogger 
} = require("../middleware/security");
const logger = require("../utils/logger");

const router = express.Router();

// Initialize services
const blockchainService = new BlockchainService(
    process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545",
    process.env.TOKEN_ADDRESS,
    process.env.PRIVATE_KEY
);

const bankingService = new BankingService(
    process.env.BANKING_API_URL || "http://localhost:3001",
    process.env.BANKING_CLIENT_ID,
    process.env.BANKING_CLIENT_SECRET
);

const kycService = new KYCService();

// Rate limiting
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
router.use(apiLimiter);

// Request logging
router.use(requestLogger);

// Validation schemas
const kycVerificationSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    idNumber: Joi.string().min(5).max(50).required(),
    dateOfBirth: Joi.date().iso().required(),
    address: Joi.string().min(10).max(200).required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
    email: Joi.string().email().required()
});

const linkAddressSchema = Joi.object({
    customerId: Joi.string().required(),
    blockchainAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const creditAccountSchema = Joi.object({
    accountNumber: Joi.string().required(),
    transactionHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
    signature: Joi.string().pattern(/^0x[a-fA-F0-9]{130}$/).required(),
    publicKey: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

/**
 * Health check endpoint
 */
router.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
            blockchain: "connected",
            banking: "connected",
            kyc: "active"
        }
    });
});

/**
 * KYC Verification endpoint
 * POST /api/kyc/verify
 */
router.post("/kyc/verify", 
    authenticateApiKey(process.env.API_KEY),
    validateInput(kycVerificationSchema),
    async (req, res) => {
        try {
            const result = await kycService.performKYCVerification(req.body);
            
            if (result.success) {
                logger.info(`KYC verification successful for customer: ${result.customerId}`);
                res.status(200).json({
                    success: true,
                    customerId: result.customerId,
                    status: result.status,
                    riskLevel: result.riskLevel,
                    timestamp: result.timestamp
                });
            } else {
                logger.warn(`KYC verification failed: ${result.reason}`);
                res.status(400).json({
                    success: false,
                    reason: result.reason,
                    timestamp: result.timestamp
                });
            }
        } catch (error) {
            logger.error("KYC verification error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    }
);

/**
 * Link blockchain address to customer
 * POST /api/kyc/link-address
 */
router.post("/kyc/link-address",
    authenticateApiKey(process.env.API_KEY),
    validateInput(linkAddressSchema),
    async (req, res) => {
        try {
            const { customerId, blockchainAddress } = req.body;
            
            const result = await kycService.linkBlockchainAddress(customerId, blockchainAddress);
            
            if (result.success) {
                logger.info(`Blockchain address linked successfully: ${blockchainAddress} -> ${customerId}`);
                res.status(200).json({
                    success: true,
                    customerId: result.customerId,
                    blockchainAddress: result.blockchainAddress,
                    timestamp: result.timestamp
                });
            } else {
                logger.warn(`Failed to link blockchain address: ${result.reason}`);
                res.status(400).json({
                    success: false,
                    reason: result.reason,
                    timestamp: result.timestamp
                });
            }
        } catch (error) {
            logger.error("Link address error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    }
);

/**
 * Credit USD to bank account from token transfer
 * POST /api/banking/credit
 */
router.post("/banking/credit",
    authenticateApiKey(process.env.API_KEY),
    validateInput(creditAccountSchema),
    verifyTransactionSignature,
    async (req, res) => {
        try {
            const { accountNumber, transactionHash } = req.body;
            
            // Get transaction details from blockchain
            const transactionDetails = await blockchainService.getTransactionDetails(transactionHash);
            
            if (!transactionDetails) {
                return res.status(404).json({
                    success: false,
                    error: "Transaction not found"
                });
            }
            
            // Verify transaction is to our monitored address
            const monitoredAddress = process.env.MONITORED_ADDRESS;
            if (transactionDetails.to.toLowerCase() !== monitoredAddress.toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    error: "Transaction not to monitored address"
                });
            }
            
            // Get customer by blockchain address
            const customer = kycService.getCustomerByBlockchainAddress(transactionDetails.from);
            if (!customer) {
                return res.status(400).json({
                    success: false,
                    error: "Sender address not linked to any customer"
                });
            }
            
            // Convert token amount to USD
            const usdAmount = bankingService.convertTokenToUsd(transactionDetails.value);
            
            // Credit USD to bank account
            const creditResult = await bankingService.creditUsdToAccount(
                accountNumber, 
                usdAmount, 
                transactionDetails
            );
            
            logger.info(`USD credit successful: ${usdAmount} USD to account ${accountNumber}`);
            
            res.status(200).json({
                success: true,
                transactionId: creditResult.transactionId,
                accountNumber: creditResult.accountNumber,
                creditedAmount: creditResult.creditedAmount,
                currency: creditResult.currency,
                blockchainTransaction: transactionHash,
                customerId: customer.id,
                timestamp: creditResult.timestamp
            });
            
        } catch (error) {
            logger.error("Credit account error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to credit account"
            });
        }
    }
);

/**
 * Get token balance for an address
 * GET /api/blockchain/balance/:address
 */
router.get("/blockchain/balance/:address",
    authenticateApiKey(process.env.API_KEY),
    async (req, res) => {
        try {
            const { address } = req.params;
            
            // Validate address format
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid address format"
                });
            }
            
            const balance = await blockchainService.getTokenBalance(address);
            const tokenInfo = await blockchainService.getTokenInfo();
            
            res.json({
                success: true,
                address: address,
                balance: balance,
                tokenInfo: tokenInfo,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error("Get balance error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get balance"
            });
        }
    }
);

/**
 * Get customer information by blockchain address
 * GET /api/kyc/customer/:address
 */
router.get("/kyc/customer/:address",
    authenticateApiKey(process.env.API_KEY),
    async (req, res) => {
        try {
            const { address } = req.params;
            
            // Validate address format
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid address format"
                });
            }
            
            const customer = kycService.getCustomerByBlockchainAddress(address);
            
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    error: "Customer not found for this address"
                });
            }
            
            // Remove sensitive information
            const { idNumber, dateOfBirth, ...safeCustomer } = customer;
            
            res.json({
                success: true,
                customer: safeCustomer,
                blockchainAddress: address,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error("Get customer error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get customer information"
            });
        }
    }
);

/**
 * Start blockchain monitoring
 * POST /api/blockchain/start-monitoring
 */
router.post("/blockchain/start-monitoring",
    authenticateApiKey(process.env.API_KEY),
    async (req, res) => {
        try {
            const { targetAddress } = req.body;
            
            if (!targetAddress || !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid target address"
                });
            }
            
            // Start monitoring with callback to credit USD
            await blockchainService.startMonitoring(targetAddress, async (transferData) => {
                try {
                    logger.info(`Processing transfer: ${transferData.transactionHash}`);
                    
                    // Get customer by sender address
                    const customer = kycService.getCustomerByBlockchainAddress(transferData.from);
                    if (!customer) {
                        logger.warn(`No customer found for address: ${transferData.from}`);
                        return;
                    }
                    
                    // Convert token amount to USD
                    const usdAmount = bankingService.convertTokenToUsd(transferData.value);
                    
                    // Credit USD to customer's bank account (you would need to store this mapping)
                    // For demo purposes, we'll use a default account
                    const accountNumber = process.env.DEFAULT_ACCOUNT_NUMBER || "1234567890";
                    
                    await bankingService.creditUsdToAccount(accountNumber, usdAmount, transferData);
                    
                    logger.info(`USD credit processed: ${usdAmount} USD for transaction ${transferData.transactionHash}`);
                    
                } catch (error) {
                    logger.error("Error processing transfer:", error);
                }
            });
            
            res.json({
                success: true,
                message: "Blockchain monitoring started",
                targetAddress: targetAddress,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error("Start monitoring error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to start monitoring"
            });
        }
    }
);

module.exports = router;

