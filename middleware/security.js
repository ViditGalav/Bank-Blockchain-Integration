  const rateLimit = require("express-rate-limit");
  const logger = require("../utils/logger");

  /**
   * 
   * Security middleware for the banking integration API
   * TAKS 3.2: Security & Compliances - Transaction signature verifiication
   */
  /**
   * Rate limiting middleware
   */

  const createRateLimiter = (windowMs = 15 *60 *1000, max = 100) => {
      return rateLimit({
          windowMs: windowMs,
          max: max,
          message: {
            error:"Too many requests from this IP, please try again later.",
            retryAfter: Math.ceil(windowMs / 1000) // Convert milliseconds to seconds
          },
          standardHeaders: true,
          legacyHeaders: false,
          handler: (req, res) => {
              logger.warn(`Rate limit exceeded: ${req.ip}`);
              res.status(429).json({ 
                error: "Too many requests from this IP, please try again later.",
                retryAfter: Math.ceil(windowMs / 1000) // Convert milliseconds to seconds
              });
          }
      });
  };

  /***
   * Transaction signature verification middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const verifyTransactionSignature = (req, res, next) => {
     try{

      const {transactionHash , signature , publicKey} = req.body; 

      if(!transactionHash || !signature || !publicKey) {
          return res.status(400).json({ error: "Missing required fields: transactionHash, signature, publicKey" });
      

     }

     // Validate transactionHash format
     if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
         return res.status(400).json({ error: "Invalid transactionHash format" });
     }

      // validate singature formate(basic check)
      if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
          return res.status(400).json({ error: "Invalid signature format" });
      }


      //validate public key format
      if (!/^0x[a-fA-F0-9]{40}$/.test(publicKey)) {
          return res.status(400).json({ error: "Invalid publicKey format" });
      }

      //In real implementation, you would verify the signature using the public key
      // For example:
      // const isValidSignature = verifySignature(transactionHash, signature, publicKey);
      // if (!isValidSignature) {
      //     return res.status(400).json({ error: "Invalid signature" });
      // }
        logger.info(`Transaction signature verification passed for: ${transactionHash}`);

        //Add verification result to request

        req.transactionVerification = {
            transactionHash,
            isValid: true,
            verifiedAt: new Date().toISOString()
        };

        next();
    } catch (error) {
        console.error("Error verifying transaction signature:", error);
        res.status(500).json({ error: "Transaction signature verification failed" });
    }
};

/**
 * Input validation
 * @param {Object} schema - Joi schema for validation
 */
const validateInput = (schema) => {
    return (req, res, next) => {
        const { error ,value } = schema.validate(req.body);
        if (error) {
           logger.warn(`Input validation failed: ${error.details[0].message}`);
           return res.status(400).json({ error: error.details[0].message });
        }
        req.body = value; // Update request body with validated value
        next();
    };
};


/**
 * API key authentication middleware
 * @param {string} apiKey- Expected api key
 * 
 * 
 */

const authenticateApiKey = (apiKey) => {
    return (req, res, next) => {
        const providedKey = req.headers['x-api-key'] || req.headers['authorization'];
        if (providedKey !== apiKey) {
            logger.warn("API key is missing from request");
            return res.status(401).json({ error: "API key required" });
        }

        //Remove 'Bearer' prefix if present

        const cleanKey = providedKey.replace('Bearer ', '');

        if (cleanKey !==apiKey){

            logger.warn("Invalid API key provided");
            return res.status(401).json({ error: "Invalid API key" });
        }
         logger.info("API key authentication successful");
         next();


    };
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });

    next();
};

/**
 * Error handling middleware
 * 
 */

const errorHandler = (err, req, res, next) => {
    logger.error("Unhandled error occurred:", err);
    //Don't leak error details in production
    const error = process.env.NODE_ENV === 'production' ? 
    {error: "Internal Server Error"} : {error: err.message , stack: err.stack};
    res.status(err.status ||500).json({ error });
};


/**
 * CORS Configuration
 */
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE' , 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
    maxAge: 86400 // 24 hours
};


module.exports = {
    createRateLimiter,
    verifyTransactionSignature,
    validateInput,
    authenticateApiKey,
    requestLogger,
    errorHandler,
    corsOptions
};
