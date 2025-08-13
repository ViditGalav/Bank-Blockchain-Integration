
const logger = require("../utils/logger");

 /**
  * KYC Service for customer verification and compliance
  * Task 3.2: Security & Compliance  - Basic KYC logic before linking blocxkchain addresses
  */

 class KYCService{

constructor(){
 // Mock customer database (in real implementation, this would be a proper database)
 this.customers = new Map();
 this.blockchainAddresses = new Map();//Maps Blockchain addresses to customer IDs

 //initialize with some mock data

 this.initializeMockData



}
/**
 * 
 * Initialize mcok customer data
 */

initializeMockData(){


    const mockCustomers = [
        {
            id: "CUST001",
            name: "John Doe",
            idNumber: "ID123456789",
            dateOfBirth: "1990-01-01",
            address: "123 Main St, Anytown, USA",
            phone: "+1 555-1234",
            email: "john.doe@example.com",
            kycStatus: "APPROVED",
            blockchainAddress: "0x1234567890abcdef",
            riskLevel: "LOW",
            createdAt: new Date("2025-08-13").toISOString(),
            updatedAt: new Date("2025-08-13").toISOString()

        },
        {

            id: "CUST002",
            name: "Jane Smith",
            idNumber: "ID987654321",
            dateOfBirth: "1985-05-15",
            address: "456 Elm St, Othertown, USA",
            phone: "+1 555-5678",
            email: "jane.smith@example.com",
            kycStatus: "APPROVED",
            blockchainAddress: "0xabcdef1234567890",
            riskLevel: "MEDIUM",
            createdAt: new Date("2025-08-13").toISOString(),
            updatedAt: new Date("2025-08-13").toISOString()

        }

    ];

        mockCustomers.forEach(customer => {
            this.customers.set(customer.id, customer);
            
        });

        logger.info("Mock customer data initialized");
}

/**
 * Perform KYC Verification
 */
async performKYCVerification(customerData) {
    try{


        logger.info(`Performing KYC verification for customer: ${customerData.name}`);

        const validationResult = this.validateCustomerData(customerData);
        if(!validationResult.isValid){


            return{

                success: false,
                customerId:null,
                status:"Rejected",
                reason:validationResult.reason,
                timestamp: new Date().toISOString() 
            };
        }

        //check for existing Customer
        const existingCustomer = this.findCustomerByIdNumber(customerData.idNumber);
        if(existingCustomer){

            return{
                success: true ,
                customerID: existingCustomer.id,
                status: existingCustomer.kycStatus,
                riskLevel: existingCustomer.riskLevel,
                timestamp: new Date().toISOString(),
                message: "Customer already exists"
            };
        }


        //PERFORMS AML CHECKS

        const amlResult = await this.performAMLCheck(customerData);
        if (!amlResult.passed){

            return{
                success: false,
                customerId: null,
                status: "Rejected",
                reason: "AML Check Failed",
                amlDetails: amlResult.details,
                timestamp: new Date().toISOString()
            };
        }


        //Create new customers
        const customerId = this.generateCustomerId();
        const newCustomer = {
            id: customerId,
           name: customerData.name,
           idNumber: customerData.idNumber,
           dateOfBirth: customerData.dateOfBirth,
           address: customerData.address,
           phone: customerData.phone,
           email: customerData.email,
           kycStatus: "APPROVED",
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
        };

        this.customers.set(customerId, newCustomer);
        logger.info(`KYC Verification completed for customer: ${customerId}`);
        
        return {
            success: true,
            customerId: customerId,
            status: "APPROVED",
            riskLevel: amlResult.riskLevel,
            timestamp: new Date().toISOString()
        };

    }catch(error) {
            logger.error("KYC Verification failed: ", error);
            return {
                success: false,
                customerId: null,
                status: "Error",
                reason: "Internal Verification Error",
                timestamp: new Date().toISOString()
            };
        }

    }

    /**
     * Link blockchain address to customer
     * @param {string} customerId - Customer ID
     * @param {string} blockchainAddress - Blockchain address
     * @returns {Object} - Result of the linking operation
     */

    async linkBlockchainAddress(customerId, blockchainAddress) {
        try {
            const customer = this.customers.get(customerId);
            if (!customer) {
                return {
                    success: false,
                    reason: "Customer not found",
                    timestamp: new Date().toISOString()
                };
            }

            // Check if the address is already linked to another customer
            if (this.blockchainAddresses.has(blockchainAddress)) {
                return {
                    success: false,
                    reason: "Blockchain address already linked to another customer",
                    timestamp: new Date().toISOString()
                };
            }

            // Link the address
           this.blockchainAddresses.set(blockchainAddress.toLowerCase(), customerId);

            logger.info(`Linked blockchain address ${blockchainAddress} to customer ${customerId}`);
            return {
                success: true,
                customerId: customerId,
                blockchainAddress: blockchainAddress,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error("Failed to link blockchain address:", error.message);
            return {
                success: false,
                reason: "Internal linking error",
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * GetCustomer by blockchain address
     * @param {string} blockchainAddress - Blockchain address
     * @returns {Object|null} - Customer information or error
     */

    getCustomerByBlockchainAddress(blockchainAddress) {
        
            const customerId = this.blockchainAddresses.get(blockchainAddress.toLowerCase());
            if (customerId) {
                return this.customers.get(customerId);
            }
            return null;
        } 



        /**
         * Validate customer Data
         * @param {Object} customerData - Customer data to validate
         * @returns {Object} - Validation result or null if valid
         */
          validateCustomerData(customerData){

            const requiredFields = ["name", "idNumber", "dateOfBirth", "address", "phone", "email"];
            for (const field of requiredFields) {
                if (!customerData[field]) {
                    return {
                        isValid: false,
                        reason: `Missing required field: ${field}`,
                    };
                    
                }

                //for string fields,  check if they are empty trimming
                if (typeof customerData[field] === "string" && customerData[field].trim() === "") {
                    return {
                        isValid: false,
                        reason: `Field cannot be empty: ${field}`,
                    };
                }
            }

            //validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerData.email)) {
                return {
                    isValid: false,
                    reason: "Invalid email format",
                };
            }

            return {isValid: true};
        }
            /***
             * Perform AML checks
             * @param {Object} customerData - Customer data to check
             * @returns {Object} - AML check result 
             */

            async performAMLCheck(customerData) {
                //Mock AML check (in real implementation, this would call external AML Service)

                const riskFactors = [];

                //check for suspicious patterns

                if (customerData.name.toLowerCase().includes('test')){

                    riskFactors.push("Suspicious name pattern");
                }

                if (customerData.email.includes('temp') || customerData.email.includes('test')) {
                    riskFactors.push("Temporary email address detected");
                }

                //Dtermine risk level

                let riskLevel = "LOW";
                if (riskFactors.length > 0) {
                    riskLevel = riskFactors.length > 2 ? "HIGH" : "MEDIUM";
                }
                return {

                    passed: riskLevel !== "HIGH",
                    riskLevel: riskLevel,
                    details: {
                        riskFactors: riskFactors,
                        score: riskFactors.length * 10
                    }
                };
                
            }


            /**
             * Find customer by id number
             * @param {string} idNumber - Customer ID number
             * @returns {Object|null} - Customer information or null if not found
             */

            findCustomerByIdNumber(idNumber) {
                for (const customer of this.customers.values()) {
                    if (customer.idNumber === idNumber) {
                        return customer;
                    }
                }
                return null;

    }
    /**
     * Generate unique customer ID
     * @returns {string} Customer ID
     */
    generateCustomerId() {
        const timestamp = Date.now().toString();
        const randomPart = Math.random().toString(36).substring(2, 5);
        return `CUST${timestamp}${randomPart}`.toUpperCase();
    }
}

module.exports = KYCService;