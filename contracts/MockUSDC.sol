// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC ERC20 token implementation for local testing and development.
 * @dev Enforces fixed 6 decimals matching standard USDC precision.
 */
contract MockUSDC is ERC20 {
    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @notice Initializes the MockUSDC token with a name and symbol.
     * @param name_ Name of the token.
     * @param symbol_ Symbol of the token.
     */
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    // =========================================================================
    // METADATA & MINTING
    // =========================================================================

    /**
     * @notice Returns the number of decimals used to get its user representation.
     * @dev Overrides ERC20 default (18) to return fixed 6 decimals for USDC compliance.
     * @return Number of decimals (6).
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mints new tokens to the specified recipient address.
     * @dev Public minting function provided strictly for testing and testnet setups.
     * @param to Account address receiving the minted tokens.
     * @param amount Amount of tokens to mint in smallest units (6 decimals).
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
