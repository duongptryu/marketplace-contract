//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Gold is ERC20, Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    mapping(address => bool) private _blacklist;

    event BlackListAdded(address _account);
    event BlackListRemoved(address _account);

    constructor() ERC20("Gold", "GLD") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);

        _mint(msg.sender, 1000000000 * 10**decimals());
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        require(_blacklist[from] == false, "Gold: From account is blacklist");
        require(_blacklist[to] == false, "Gold: To account is blacklist");
        super._beforeTokenTransfer(from, to, amount);
    }

    function addToBlackList(address _account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            _account != msg.sender,
            "Gold: Must not add sender to blacklist"
        );
        require(
            _blacklist[_account] == false,
            "Gold: Account was on blacklist"
        );
        _blacklist[_account] = true;
        emit BlackListAdded(_account);
    }

    function removeFromBlackList(address _account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            _blacklist[_account] == true,
            "Gold: Account was not on blacklist"
        );
        _blacklist[_account] = false;
        emit BlackListRemoved(_account);
    }
}
