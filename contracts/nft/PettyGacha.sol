//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract PettyGacha is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCount;
    Counters.Counter private _gachaIdCount;

    IERC20 public immutable gold;

    string private _baseTokenURI;

    struct Gacha {
        uint256 price;
        uint8[3] rankRate; // [50, 30, 20] -> rank [1,2,3]
    }

    struct Petty {
        uint8 rank;
        uint8 stat;
    }

    uint8[3] public ranks = [1, 2, 3];
    mapping(uint256 => Gacha) public _idToGacha;
    mapping(uint256 => Petty) public _tokenIdToPetty;

    constructor(address _goldAddress) ERC721("Petty", "PET") {
        gold = IERC20(_goldAddress);

        _gachaIdCount.increment();
        _idToGacha[_gachaIdCount.current()] = Gacha(100 * 10**18, [60, 40, 0]);
        _gachaIdCount.increment();
        _idToGacha[_gachaIdCount.current()] = Gacha(200 * 10**18, [30, 50, 20]);
        _gachaIdCount.increment();
        _idToGacha[_gachaIdCount.current()] = Gacha(300 * 10**18, [10, 40, 50]);
        _gachaIdCount.increment();

        _idToGacha[_gachaIdCount.current()] = Gacha(100 * 10**18, [100, 0, 0]);
        _gachaIdCount.increment();
        _idToGacha[_gachaIdCount.current()] = Gacha(200 * 10**18, [0, 100, 0]);
        _gachaIdCount.increment();
        _idToGacha[_gachaIdCount.current()] = Gacha(300 * 10**18, [0, 0, 100]);
        _gachaIdCount.increment();
    }

    function openGacha(uint8 _gachaId, uint256 _price)
        public
        returns (uint256)
    {
        require(_idToGacha[_gachaId].price > 0, "PettyGacha: Invalid gacha");
        require(
            _price == _idToGacha[_gachaId].price,
            "PettyGacha: price not match"
        );

        gold.transferFrom(_msgSender(), address(this), _price);
        _tokenIdCount.increment();
        uint256 tokenId = _tokenIdCount.current();
        uint8 rank = _generateRandomRankFromRatio(
            ranks,
            _idToGacha[_gachaId].rankRate
        );
        _mint(_msgSender(), tokenId);

        _tokenIdToPetty[tokenId] = Petty(rank, 0);
        return tokenId;
    }

    function breedPetties(uint256 _token1, uint256 _token2) public {
        require(
            ownerOf(_token1) == _msgSender(),
            "PettyGacha: sender is not owner of token"
        );
        require(
            (getApproved(_token1) == address(this) &&
                getApproved(_token2) == address(this)) ||
                isApprovedForAll(_msgSender(), address(this)),
            "PettyGacha: The contract is unauthorized to manage this token"
        );

        require(
            _tokenIdToPetty[_token1].rank == _tokenIdToPetty[_token2].rank,
            "PettyGacha: petty must be same rank"
        );

        require(
            _tokenIdToPetty[_token1].rank < 3,
            "PettyGacha: petties is at the highest rank"
        );

        uint8 newRank = _tokenIdToPetty[_token1].rank + 1;
        _burn(_token1);
        _burn(_token2);
        delete _tokenIdToPetty[_token1];
        delete _tokenIdToPetty[_token2];

        _tokenIdCount.increment();
        uint256 newTokenId = _tokenIdCount.current();
        _mint(_msgSender(), newTokenId);

        _tokenIdToPetty[newTokenId] = Petty(newRank, 0);
    }

    function _generateRandomRankFromRatio(
        uint8[3] memory _rankRate,
        uint8[3] memory _rankRatio
    ) private view returns (uint8) {
        uint256 rand = _randInRange(1, 100);
        uint16 flag = 0;
        for (uint8 i = 0; i < _rankRate.length; i++) {
            if (rand <= _rankRatio[i] + flag && rand >= flag) {
                return _rankRate[i];
            }
            flag = flag + _rankRatio[i];
        }
        return 0;
    }

    function _randInRange(uint256 min, uint256 max)
        public
        view
        returns (uint256)
    {
        uint256 num = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, block.difficulty, msg.sender)
            )
        ) % (max + 1 - min);
        return num + min;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function updateBaseTokenURI(string memory baseTokenURI_) public onlyOwner {
        _baseTokenURI = baseTokenURI_;
    }
}
