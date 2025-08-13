//finbank-blockchain-integration/mock-banking-api/server.js

  const express = require("express");
  const cors = require("cors");
  const helmet = require("helmet");
  const dotenv = require("dotenv");


  //Load environment variables
  dotenv.config();

  const app = express();
  const PORT = process.env.MOCK_BANKING_PORT || 3001;

  //MOCK data storage

  const accounts = new Map();
  const transactions = new Map();
  const oauthTokens = new Map();

  //Initialize mock data

  function initializeMockData(){

  // Mock accounts

  accounts.set("1234567890", {
    accountNumber: "1234567890",
    balance: 10000.00,
    currency: "USD",
    customerId: "CUST001",
    status: "ACTIVE",
    createdAt: new Date("2025-08-13").toISOString(),
  });

  accounts.set("0987654321", {
    accountNumber: "0987654321",
    balance: 5000.00,
    currency: "USD",
    customerId: "CUST002",
    status: "ACTIVE",
    createdAt: new Date("2025-08-13").toISOString(),
  });

  //MOCK OAUTH Token

  oauthTokens.set("mock-access-token", {
    access_token: "mock-access-token",
    token_type: "Bearer",
    expires_in: 3600,
    scope: "read write",
    created_at: Date.now()
  });



  console.log("Mock data initialized successfully");

  }


  //Middleware


  app.use(cors());
  app.use(helmet());
  app.use(express.json());

  //OAuth2 token endpoint

  app.post("/oauth/token", (req, res) => {
    const { grant_type, client_id, client_secret } = req.body;

    if (grant_type === "client_credentials" && 
        client_id === process.env.BANKING_CLIENT_ID &&
        client_secret === process.env.BANKING_CLIENT_SECRET) {
        
        const token = {

            access_token: "mock-access-token-" + Date.now(),
            token_type: "Bearer",
            expires_in: 3600,
            scope: "read write"
        };

        oauthTokens.set(token.access_token, {
            ...token,
            created_at: Date.now()
        });

        res.json(token);
    } else {
        res.status(401).json({ error: "Invalid client credentials" });
    }
});


//validate oauth token middleware

const validateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authorization header missing or invalid" });
    }

    const token = authHeader.substring(7);
    const tokenData = oauthTokens.get(token);

    if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

   //Chekc if token is expired

   const now = Date.now();
   const tokenAge = now - tokenData.created_at;

   if (tokenAge > (tokenData.expires_in * 1000)) {
    oauthTokens.delete(token);
       return res.status(401).json({ error: "Token has expired" });
   }

   
   next();


};


//Account validation endpoint 

app.get("/api/accounts/:accountNumber/validate", validateToken, (req, res) => {
    const { accountNumber } = req.params;

   const account  = accounts.get(accountNumber);

   res.json({
    isValid: !!account,
    accountNumber: accountNumber,
    status: account ? account.status : "NOT_FOUND"

   });  

});


// Account Balance endpoint

app.get("/api/accounts/:accountNumber/balance", validateToken, (req, res) => {
    const { accountNumber } = req.params;

    const account = accounts.get(accountNumber);

    if (!account) {
        return res.status(404).json({ error: "Account not found" });
    }

    res.json({
        accountNumber: account.accountNumber,
        balance: account.balance,
        currency: account.currency,
        lastUpdated: new Date().toISOString()
    });
});

//Credit account endpoint

app.post("/api/accounts/credit", validateToken, (req, res) => {
    const {accountNumber, amount , currency , description , reference , metadata} = req.body;

    const account = accounts.get(accountNumber);

    if (!account) {
        return res.status(404).json({ error: "Account not found" });
    }


    if (account.status !== "ACTIVE") {
        return res.status(400).json({ error: "Account is not active" , accountNumber: accountNumber , status: account.status });
    }

    // Update account balance
    account.balance += parseFloat(amount);

    // Create Transaction record

    const transactionId = "TXN" + Date.now() + Math.random().toString(36).substring(2, 5);
    const transaction ={
        transactionId: transactionId,
        accountNumber: accountNumber,
        type: "CREDIT",
        amount: parseFloat(amount),
        currency: currency,
        description: description,
        reference: reference,
        metadata: metadata,
        timestamp: new Date().toISOString(),
        status: "COMPLETED"
    };

    transactions.set(transactionId, transaction);


    //Update amount

    accounts.set(accountNumber, account);

    res.json({
        transactionId: transactionId,
        accountNumber: accountNumber,
        creditedAmount:parseFloat(amount),
        currency: currency,
        newBalance: account.balance,
        timestamp: transaction.timestamp,
        status: 'SUCCESS'
    });

});

// Transaction history endpoint

app.get("/api/accounts/:accountNumber/transactions", validateToken, (req, res) => {
    const { accountNumber } = req.params;

    const limit = parseInt(req.query.limit) || 10;

    const account = accounts.get(accountNumber);

    if (!account) {
        return res.status(404).json({ error: "Account not found" });
    }

    const accountTransactions = Array.from(transactions.values()).filter(tx => tx.accountNumber === accountNumber)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);

    res.json({
        accountNumber: accountNumber,
        transactions: accountTransactions,
        count: accountTransactions.length
    });
});

//Root endpoint

app.get("/", (req, res) => {
    res.json({
        message: "Mock Banking API",
        version: "1.0.0",
        description: "This is a mock banking API for testing  Blockchain Integration",
        endpoints: {
         
            health: "/health",
            oauth: "/oauth/token",
            accounts:{

            validate: "GET /api/accounts/:accountNumber/validate",
            balance: "GET /api/accounts/:accountNumber/balance",
            credit: "POST /api/accounts/credit",
            transactions: "GET /api/accounts/:accountNumber/transactions"

            }


        }
        
    });
});

//Initialize mock data
initializeMockData();

//Start server

app.listen(PORT, () => {
    console.log(`Mock Banking API server started on port ${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
});


module.exports = app; 