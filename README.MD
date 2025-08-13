

Solutions 
## **Section 1 – Theoretical & Conceptual**

### **1. Blockchain Fundamentals**

**a) Ethereum mainnet vs testnets vs private networks**

* **Ethereum mainnet** – The live, production blockchain where real ETH and transactions have real monetary value. Immutable and public.
* **Testnets** – Public Ethereum networks (e.g., Sepolia, Holesky) that mimic mainnet but use free, valueless test ETH for development/testing without financial risk.
* **Private networks** – Isolated Ethereum chains (e.g., Ganache, Geth in dev mode) run by an organization for internal development, testing, or enterprise use. Fully controlled, customizable consensus, no public access.

**b) Gas fees & calculation**

* **Gas** = unit of computational work in Ethereum.
* **Fee** = `Gas Used × Gas Price` (pre-EIP-1559) or `Gas Used × (Base Fee + Tip)` (post-London upgrade).
* **Gas Used** depends on transaction complexity; **Base Fee** is algorithmically adjusted per block; **Tip (priority fee)** incentivizes miners/validators.

---

### **2. Token Standards**

**a) ERC-20 vs ERC-721 vs ERC-1155**

* **ERC-20** – Fungible tokens (identical units), e.g., stablecoins, governance tokens.
* **ERC-721** – Non-fungible tokens (unique IDs, distinct metadata), e.g., collectibles, NFTs.
* **ERC-1155** – Multi-token standard; supports both fungible & non-fungible types in one contract; more gas-efficient for batch operations.

**b) Choosing ERC-20 over ERC-777**

* **ERC-20** – Widely adopted, simplest for fungible assets, best compatibility with wallets, exchanges, DeFi protocols.
* **ERC-777** – Adds advanced hooks and operator features, but higher complexity and potential re-entrancy risk.
* **Choose ERC-20** when you need maximum ecosystem support, simplicity, and proven security.



### **3. Banking & Blockchain Integration**

**a) Secure process to integrate Ethereum tx with banking API**

1. **Frontend/Client** – User initiates transaction request.
2. **Backend Service** – Validates request, applies business rules, generates blockchain transaction data.
3. **Blockchain Interaction Layer** – Uses secure wallet/signing service (e.g., HSM, MetaMask, or server-side key vault) to submit Ethereum transaction.
4. **Event Listener** – Monitors confirmations via WebSocket or JSON-RPC.
5. **Banking API Integration** – Once on-chain confirmation is final, trigger payment gateway API call over TLS with proper authentication (OAuth2/API keys).
6. **Audit Logging** – Record blockchain tx hash, API response, and KYC data in secure storage.

**b) KYC/AML compliance challenges**

* **Anonymity/Pseudonymity** – Wallet addresses don’t inherently reveal user identity.
* **Cross-border transfers** – Different jurisdictions with varying crypto regulations.
* **Transaction tracing** – Requires blockchain analytics tools to link addresses to entities.
* **Record keeping** – Need to securely store identity docs alongside transaction records.
* **On/Off-ramp monitoring** – Must verify source/destination of crypto funds when moving to/from fiat.


