// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Funder {
        address addr;
        uint256 amount;
    }

    IERC20 immutable TOKEN;
    // Funder's Array
    Funder[] public funder;
    // mapping from user wallet address to ID in Funder array;
    mapping(address => uint256) public id;

    constructor(address _TOKEN) {
        TOKEN = IERC20(_TOKEN);

        // No meaning
        // id mapping will maintain zero value for not mapped variables.
        // So, we keep the first element in funder array with no meaning.
        funder.push(Funder(address(0), 0));
    }

    function deposit(uint256 _amount) external nonReentrant {
        uint256 _id = id[_msgSender()];
        if (_id == 0) {
            // This user never deposited before.
            // So, we will create a new element in array
            funder.push(Funder(_msgSender(), _amount));
            id[_msgSender()] = funder.length - 1;
        } else {
            funder[_id].amount += _amount;
        }
        IERC20(TOKEN).safeTransferFrom(_msgSender(), address(this), _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        uint256 _id = id[_msgSender()];
        require(_id > 0, "user doesn't exist");
        require(funder[_id].amount >= _amount, "Withdrawal amount too big");

        // To prevent Reentrancy Attack,
        // It's a good practice to reduce balance amount before token transfer.
        funder[_id].amount -= _amount;
        IERC20(TOKEN).safeTransfer(_msgSender(), _amount);
    }

    function top2() external view returns (address, address) {
        require(funder.length >= 3, "Less than two depositors");

        uint256[2] memory max_ids;
        // max_ids[0] is the richest
        // max_ids[1] is second richest
        max_ids[0] = 1;
        max_ids[1] = 2;

        if (funder[1].amount < funder[2].amount) {
            max_ids[0] = 2;
            max_ids[1] = 1;
        }

        for (uint256 i = 3; i < funder.length; i++) {
            if (funder[max_ids[0]].amount < funder[i].amount) {
                max_ids[1] = max_ids[0];
                max_ids[0] = i;
            } else if (funder[max_ids[1]].amount < funder[i].amount) {
                max_ids[1] = i;
            }
        }
        return (funder[max_ids[0]].addr, funder[max_ids[1]].addr);
    }
}
