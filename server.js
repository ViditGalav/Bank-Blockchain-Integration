const express = require("express");
const cors = require("cors");
const helmet =require("helmet");
const compression =require("compression");
const dotenv =require("dotenv");
const fs =require("fs");
const path = require("path");



//Load environment variables
dotenv.config();


//Import middleware and  routes

const {errorHandler , corsOptions} = require("./middleware/security");
const apiRoutes = require("./routes/api");
const logger = require("./utils/logger");

// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

//Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, {recursive: true});
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", " 'unsafe-inline' "],
    },
  },
  crossOriginEmbedderPolicy: false
}));

 //CORS Configuration
 app.use(cors(corsOptions));

 //Compression middleware
 app.use(compression());

 //Body parsing middleware
 app.use(express.json({limit: '10mb'}));
 app.use(express.urlencoded({ extended: true, limit: '10mb'  }));


 // Trust proxy for rate limiting
 app.set("trust proxy", 1);

 //API Routes
 app.use("/api", apiRoutes);

 //Root endpoint
 app.get("/", (req, res) => {
   res.json({

     message: "Welcome to the FinBank Blockchain Integration API",
     version: "1.0.0",
     endpoints: {
        health: "/api/health",
        kyc: {
          verify: "POST /api/kyc/verify",
          linkAddress: "POST /api/kyc/link-address",
          getCustomer: "GET /api/kyc/customer/:address"
        },
        banking:{
          credit: "POST /api/banking/credit"
        },
        blockchain: {
          balance: "GET /api/blockchain/balance/:address",
          startMonitoring: "POST /api/blockchain/start-monitoring"
        }

     },

     documentation: "See README.md for detailed information"

   });



   });

   //404 handler
   app.use("*", (req, res) => {
     res.status(404).json({
       error: "Endpoint Not Found",
       message: `The requested endpoint ${req.originalUrl} was not found`
     });
   });

   //Error handling middleware

   app.use(errorHandler);

   //Graceful shutdown
   process.on('SIGTERM', () => {
     logger.info('SIGTERM received: closing HTTP server');
       process.exit(0);
     });

     process.on('SIGINT', () => {
       logger.info('SIGINT received: closing HTTP server');
       process.exit(0);
     });


     //Start server
     app.listen(PORT, () => {
       logger.info(`FinBank Blockchain Integration API server started on port ${PORT}`);
       logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
       logger.info(`API Base URL: http://localhost:${PORT}/api`);
       logger.info(`Health Check: http://localhost:${PORT}/api/health`);


          //Log Configuration

          logger.info("Configuration:");
          logger.info(` - Blockchain Provider: ${process.env.BLOCKCHAIN_PROVIDER || 'http://localhost:7545'}`);
          logger.info(` - Banking API URL: ${process.env.BANKING_API_URL || 'http://localhost:3001'}`);
          logger.info(` - Token Address: ${process.env.TOKEN_ADDRESS || 'Not Configured'}`);
          logger.info(` - Monitored Addresses: ${process.env.MONITORED_ADDRESSES || 'Not Configured'}`);

       });
     
       module.exports = app; 