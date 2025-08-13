 const axios = require("axios");
const logger = require("../utils/logger");


/**
 * Banking Service for integrating with mock banking APIs
 * Task 3.1 API Middleware - Call mock banking API to credit USD value
 */
class BankingService {
    constructor(baseUrl , clientId , clientSecret) {
        this.baseUrl = baseUrl;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = null;
        this.tokenExpiry = null;

        //Mock exchange rate (in real implementation, we will fetch it from external API)
        this.tokenToUsdRate = 0.5;// 1 FBT = 0.5 USD
    }


    /**
     * Get OAuth2 access token
     * @returns {string} Access token
     */

    async getAccessToken() {
        try{
        //Check if current Token is still valid
        if(this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        logger.info("Requesting new OAuth2 access token...");


        const response = await axios.post(`${this.baseUrl}/oauth/token`, null, {
            grant_type: "client_credentials",
            client_id: this.clientId,
            client_secret: this.clientSecret
        },
        {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000); // Convert seconds to milliseconds
        logger.info("OAuth2 access token obtained Successfully");
        return this.accessToken;
    } catch(error){


        logger.error("Failed to obtain OAuth2 access token:", error.response?.data || error.message);
        throw new Error("Authentication failed");
    }

}

/**
 * Credit USD  to bank account
 * @params {string} accountNumber - Bank account number
 * @params {number} usdAmount - Amount in USD to credit
 * @params {Object} transactionData - Blockchain transaction data
 * @returns {Object} - Response from the banking API
 */


async creditUsdToAccount(accountNumber, usdAmount, transactionData) {
    try {
        const accessToken = await this.getAccessToken();
        logger.info(`Crediting ${usdAmount} USD to account ${accountNumber}`);
        const response = await axios.post(`${this.baseUrl}/api/accounts/credit`, {
            accountNumber: accountNumber,

            amount: usdAmount,
            currency: 'USD',
            description: `Token transfer credit - ${transactionData.transactionHash}`,
            reference: transactionData.transactionHash,
            metadata:{
            
                blockchainTransaction: transactionData.transactionHash,
                toekenAmount: transactionData.value,
                tokenSymbol: 'FBT',
                fromAddress: transactionData.from,
                toAddress: transactionData.to,
                blockNumber: transactionData.blockNumber,
            }
    }, {
        headers:{


            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }


    });
     
    logger.info(`Successfully credited ${usdAmount} USD to account ${accountNumber}`);

    return {
         success:true,
         transactionId: response.data.transactionId,
         accountNumber: accountNumber,
         creditAmount: usdAmount,
         currency: "USD",
         timestamp: new Date().toISOString(),
         blockchainReference: transactionData.transactionHash
    };
     } catch (error) {
        logger.error("Failed to credit USD to account:", error.response?.data || error.message);
        throw new Error(`Failed to credit USD: ${error.response?.data?.message || error.message}`);
    }

}

/**
 * Convert token amount to USD
 * @param {string} tokenAmount - Amount of tokens to convert
 * @returns {number} - Equivalent amount in USD
 */

convertTokenToUsd(tokenAmount) {
    const tokenValue = parseFloat(tokenAmount);
    return tokevalue * this.tokenToUsdRate;
}
/**
 * Get account Balance
 * @param {string} accountNumber - The bank account number
 * @returns {Object} - Account balance details 
 */



async getAccountBalance(accountNumber) {
    try{
        const accessToken = await this.getAccessToken();
        const response = await axios.get(`${this.baseUrl}/api/accounts/${accountNumber}/balance`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                
            }
        });
        return response.data;
    } catch (error) {
        logger.error("Failed to get account balance:", error.response?.data || error.message);
        throw new Error(`Failed to get account balance: ${error.response?.data?.message || error.message}`);
    }
}

/**
 * Validate account Number
 * @param {string} accountNumber - The bank account number to validate
 * @returns {boolean} - Whether the account number is valid
 */

async validateAccount(accountNumber) {
    try{

        const accessToken = await this.getAccessToken();
        const response = await axios.get(`${this.baseUrl}/api/accounts/${accountNumber}/validate`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
               
            }
        });
        return response.data.isValid;
    } catch (error) {
        logger.error("Failed to validate account number:", error.response?.data || error.message);
        return false;
    }
}

/***
 * Get Transaction history
 * @param {string} accountNumber - The bank account number
 * @param {number} limit - Number of transactions to retrieve
 * @returns {Array} - List of transactions
 */




async getTransactionHistory(accountNumber, limit = 10) {


try{
 const accessToken = await this.getAccessToken();

 const response = await axios.get(`${this.baseUrl}/api/accounts/${accountNumber}/transactions`, {
     headers: {
         'Authorization': `Bearer ${accessToken}`
     },
     params: {
         limit: limit
     }
 });

 return response.data.transactions;
} catch (error) {
    logger.error("Failed to get transaction history:", error.response?.data || error.message);
    throw new Error(`Failed to get transaction history: ${error.response?.data?.message || error.message}`);
}
}


}



module.exports = BankingService;
