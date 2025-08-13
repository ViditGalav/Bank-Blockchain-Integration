 const {ethers} = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy Finbank token to private blockchain
 * Task 2: Private blockchain integratioh
 */

async function main() {
    console.log("Started FinBank Token Dpleoyment....");

    try{
     //Get Deployer account
     const [deployer] =await ethers.getSigners();
     console.log('Deploying Contract with Account: ${deployer.address}');
     console.log('Account Balnce: ${ethers.formatEther(await deployer.getBalance(deployer.address))} ETH');


     //Deploy FinBank Token

     console.log("Deploying FinBank Token...");
     const FinBankToken = await ethers.getContractFactory("FinBankToken");
     const finBankToken = await FinBankToken.deploy(deployer.address);

     
     await finBankToken.waitForDeployment();
     const tokenAddress = await finBankToken.getAddress();

     console.log("FinBank Token deployed Successfully !");
     console.log('Token Address: ${tokenAddress}');

     // Get Token Information

     const tokenInfo = await finBankToken.getTokenInfo();
     console.log("Token Information:");
     console.log('Name: ${tokenInfo[0]}');
     console.log(' Symbol: ${tokenInfo[1]}');
     console.log('Decimals: ${tokenInfo[2]');
     console.log('Total Suppply: ${ethers.formatEther(tokenInfo[3])} FBT');


     //Cheeck deployer Balance
     const deployerBalance = await finBankToken.balanceOf(deployer.address);
     console.log(' Deployer Balance: ${ethers.formatEther(deployerBalance)} FBT');
     
     //Save Deployment Info
     const deploymentInfo ={

        network: "ganache",
        tokenAddress: tokenAddress,
        deployerAddress: deployer.address,
        deployerBalance: ethers.formatEther(deployerBalance),
        deploymentTime: new Date().toDateString(),

        tokenInfo: {

            name: tokenInfo[0],
            symbol: tokenInfo[1],
            decimals: tokenInfo[2].toString(),
            totalSupply: ethers.formatEther(tokenInfo[3])
        }
     };

     //Create developemtn directory if it doesn't exist 
     const deploymentDir = path.join(__dirname, "../deployments");
     if(!fs.existsSync(deploymentDir)){

        fs.mkdirSync(deploymentDir, {recursive: true});
     }
    

     //Save deployment ifo to a file

     const deploymentPath = path.join(deploymentDir , "ganache-deployment.json");
     fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null ,2));
     console.log('Deployment info saved to ${deploymentPath}');

     return{

        tokenAddress,
        deployerAddress: deployer.address,
        deploymentInfo
     };

    } catch (error){

        console.error("Deployment Failed:", error);
        process.exit(1);
    }
}

//Execute deployemnt

if (require.main ===module){

 main()
     .then(()=>{
        console.log("Deployment completed succesfully !");
        process.exit(0);
     })
     .catch((error)=>{

        console.log("Deployment failed:", error);
        process.exit(1);
     });

}

module.exports = { main };