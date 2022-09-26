//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BalanceToken is ERC20, Ownable {
    uint256 constant _initial_supply = 10000 * (10**18);

    constructor() ERC20("BalanceToken", "BAL") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
