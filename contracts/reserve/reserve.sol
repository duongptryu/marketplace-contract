//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Reserve is Ownable {
    uint256 public unlockTime;
    IERC20 public immutable token;

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
        unlockTime = block.timestamp + 24 weeks;
    }

    modifier checkTimestamp() {
        require(block.timestamp > unlockTime, "Reserve: Can Not Trade");
        _;
    }

    function withDrawTo(address _to, uint256 _amount)
        public
        onlyOwner
        checkTimestamp
    {
        require(_to != address(0), "Reserve: Transfer to zero address");
        require(
            token.balanceOf(address(this)) >= _amount,
            "Reserve: Exceeds contract balance"
        );

        token.transfer(_to, _amount);
    }
}
