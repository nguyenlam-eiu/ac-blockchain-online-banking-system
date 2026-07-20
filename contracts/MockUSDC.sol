// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @dev Simple ERC20 token with customizable decimals and public minting for testing.
 */
contract MockUSDC is ERC20 {
    uint8 private immutable _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    /**
     * @dev Overrides ERC20 decimals to return the custom decimals (6 for USDC).
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Public minting function to facilitate testing.
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
