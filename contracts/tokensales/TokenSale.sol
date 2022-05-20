//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenSale {
    uint256 private investorMinCap = 0.02 ether;
    uint256 private investorMaxCap = 10 ether;
    uint256 private rateWithEth = 100;

    mapping(address => uint256) private contributions;

    IERC20 private storeToken;

    constructor(address _storeToken) {
        storeToken = IERC20(_storeToken);
    }

    function buy() public payable {
        uint256 amount = msg.value * rateWithEth;
        require(
            amount > investorMinCap,
            "TokenSale: value not reached min cap"
        );
        require(
            contributions[msg.sender] + amount <= investorMaxCap,
            "TokenSale: address trade exceeds hard cap"
        );
        require(
            storeToken.balanceOf(address(this)) > amount,
            "TokenSale: contract not enought token"
        );

        contributions[msg.sender] += amount;
        storeToken.transfer(msg.sender, amount);
    }
}
