//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FinBankToken is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 10000000 * 10 ** 18;
    bool public paused;


    event TokenPaused(address indexed by);
    event TokenUnpaused(address indexed by);

    constructor(address initialOwner) ERC20("FinBank Token", "FBT") Ownable(initialOwner) {
        _mint(initialOwner, TOTAL_SUPPLY);
    }


   function pause() external onlyOwner {
        paused = true;
        emit TokenPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit TokenUnpaused(msg.sender);
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        require(!paused, "FinBankToken: Token transfers while paused");
        super._update(from, to, value);
    }

    function getTokenInfo() external view returns (
        string memory tokenName ,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 tokenTotalSupply,
        bool isPaused
    ) {

        return(
        "FinBank Token",
        "FBT",
        18,
        TOTAL_SUPPLY,
        paused

        );
       
    }




}