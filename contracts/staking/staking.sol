//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../reserve/reserve.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    using Counters for Counters.Counter;
    address private store;
    IERC20 private gold;

    struct StakingInfo {
        address account;
        uint256 startTime;
        uint256 timePoint;
        uint256 amount;
        uint256 totalProfit;
    }

    struct StakingPackage {
        uint256 lockTime;
        uint256 feeDecimal;
        uint256 feeRate;
        uint256 minStaking;
        bool isOffline;
    }

    Counters.Counter private _stakePackageCount;
    mapping(uint256 => StakingPackage) public _stakingPackage;
    mapping(address => mapping(uint256 => StakingInfo)) public _stakingInfo;

    constructor(address _tokenAddress, address _store) {
        store = _store;
        gold = IERC20(_tokenAddress);
        _stakePackageCount.increment();
    }

    function addPackage(
        uint256 _lockTime,
        uint256 _feeRate,
        uint256 _feeDecimal,
        uint256 _minStaking
    ) public onlyOwner {
        require(
            _lockTime >= 30 days,
            "Staking: lock time must be greater than 1 month"
        );
        require(_minStaking >= 10 ether, "Staking: min staking is 10 ether");

        uint256 packageId = _stakePackageCount.current();
        _stakingPackage[packageId] = StakingPackage(
            _lockTime,
            _feeDecimal,
            _feeRate,
            _minStaking,
            false
        );
        _stakePackageCount.increment();

        emit AddedPackage(
            packageId,
            _lockTime,
            _feeRate,
            _feeDecimal,
            _minStaking
        );
    }

    function removePackage(uint256 _packageId) public onlyOwner {
        StakingPackage storage package = _stakingPackage[_packageId];
        require(
            package.lockTime > 0 && !package.isOffline,
            "Stake: Package is not exist"
        );
        package.isOffline = true;

        emit RemovedPackage(_packageId);
    }

    function stake(uint256 _packageId, uint256 _amount) public {
        StakingPackage memory package = _stakingPackage[_packageId];
        require(
            package.lockTime > 0 && !package.isOffline,
            "Stake: Package is not exist"
        );
        require(
            _amount >= package.minStaking,
            "Stake: Not enought min stake require"
        );

        require(
            gold.allowance(msg.sender, address(this)) >= _amount,
            "Stake: Not enought token approve"
        );
        gold.transferFrom(msg.sender, store, _amount);

        StakingInfo storage stakeInfo = _stakingInfo[msg.sender][_packageId];

        if (stakeInfo.account == address(0) && stakeInfo.amount == 0) {
            _stakingInfo[msg.sender][_packageId] = StakingInfo(
                msg.sender,
                block.timestamp,
                block.timestamp,
                _amount,
                0
            );
            emit Staked(
                msg.sender,
                block.timestamp,
                block.timestamp,
                _amount,
                _packageId
            );
            return;
        }

        uint256 profit = _calculateProfit(
            stakeInfo.timePoint,
            stakeInfo.amount,
            package.lockTime,
            package.feeRate,
            package.feeDecimal
        );

        stakeInfo.totalProfit = profit;
        stakeInfo.amount += _amount;
        stakeInfo.timePoint = block.timestamp;
        emit StakedUpdate(
            msg.sender,
            _packageId,
            stakeInfo.timePoint,
            stakeInfo.amount,
            stakeInfo.totalProfit
        );
    }

    function unStake(uint256 _packageId) public {
        StakingPackage memory package = _stakingPackage[_packageId];
        require(
            package.lockTime > 0 && !package.isOffline,
            "Stake: Package is not exist"
        );

        StakingInfo storage stakeInfo = _stakingInfo[msg.sender][_packageId];
        require(stakeInfo.account != address(0), "Stake: Stake does not exist");

        require(
            block.timestamp - stakeInfo.timePoint >= package.lockTime,
            "Stake: time lock is not exceed"
        );

        uint256 profit = _calculateProfit(
            stakeInfo.timePoint,
            stakeInfo.amount,
            package.lockTime,
            package.feeRate,
            package.feeDecimal
        ) + stakeInfo.totalProfit;

        require(
            gold.balanceOf(store) >= profit,
            "Stake: Error storage not enought token"
        );
        gold.transferFrom(store, msg.sender, profit);

        emit UnStaked(
            msg.sender,
            _packageId,
            stakeInfo.startTime,
            block.timestamp,
            stakeInfo.amount,
            profit
        );
        delete _stakingInfo[msg.sender][_packageId];
    }

    function calculateProfit(uint256 _packageId) public view returns (uint256) {
        StakingPackage memory package = _stakingPackage[_packageId];
        require(
            package.lockTime > 0 && !package.isOffline,
            "Stake: Package is not exist"
        );

        StakingInfo memory stakeInfo = _stakingInfo[msg.sender][_packageId];
        require(stakeInfo.account == msg.sender, "Stake: stake does not exist");

        return
            _calculateProfit(
                stakeInfo.startTime,
                stakeInfo.amount,
                package.lockTime,
                package.feeRate,
                package.feeDecimal
            );
    }

    function _calculateProfit(
        uint256 timeStart,
        uint256 amount,
        uint256 timeLock,
        uint256 feeRate,
        uint256 feeDecimal
    ) internal view returns (uint256) {
        if (feeRate == 0) {
            return amount;
        }
        return
            ((feeRate / 10**feeDecimal) / timeLock) *
            amount *
            (block.timestamp - timeStart) *
            amount;
    }

    event AddedPackage(
        uint256 indexed packageId,
        uint256 indexed lockTime,
        uint256 feeRate,
        uint256 feeDecimal,
        uint256 minStaking
    );
    event RemovedPackage(uint256 packageId);
    event Staked(
        address indexed account,
        uint256 indexed startTime,
        uint256 indexed timePoint,
        uint256 amount,
        uint256 packageId
    );
    event StakedUpdate(
        address indexed account,
        uint256 packageId,
        uint256 indexed timePoint,
        uint256 amount,
        uint256 totalProfit
    );

    event UnStaked(
        address indexed account,
        uint256 packageId,
        uint256 indexed timeStart,
        uint256 indexed timeEnd,
        uint256 amount,
        uint256 totalProfit
    );
}
