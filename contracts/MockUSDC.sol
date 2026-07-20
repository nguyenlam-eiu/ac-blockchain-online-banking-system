// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @dev Simple ERC20 token with customizable decimals and public minting for testing.
 */
contract MockUSDC is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    /**
     * @dev Overrides ERC20 decimals to return the custom decimals (6 for USDC).
     */
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    /**
     * @dev Public minting function to facilitate testing.
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
