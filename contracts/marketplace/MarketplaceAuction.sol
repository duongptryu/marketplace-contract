//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "hardhat/console.sol";

contract MarketplaceAuction is Ownable {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct Order {
        address seller;
        address buyer;
        uint256 tokenId;
        address paymentToken;
        uint256 price;
    }

    struct Auction {
        uint256 tokenId;
        address seller;
        address winner;
        uint256 minPrice;
        uint256 lowestPriceIncrease;
        address tokenPayment;
        uint256 timeStart;
        uint256 auctionTime;
        Counters.Counter highestOffer;
    }

    struct Offer {
        address bider;
        uint256 amount;
    }

    Counters.Counter private _orderIdCount;
    Counters.Counter private _auctionIdCount;

    IERC721 public immutable nftContract;

    mapping(uint256 => Order) public orders;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(uint256 => Offer)) public offers;

    uint256 public feeDecimal;
    uint256 public feeRate;
    address public feeRecipient;
    EnumerableSet.AddressSet private _supportedPaymentToken;

    event AuctionAdded(
        uint256 indexed auctionId,
        address indexed seller,
        uint256 indexed tokenId,
        address tokenPayment,
        uint256 minPrice,
        uint256 timeStart,
        uint256 auctionTime
    );

    event AuctionCancel(uint256 indexed auctionId);

    event OfferAdded(
        uint256 indexed auctionId,
        uint256 indexed offerId,
        address indexed bider,
        uint256 amount,
        uint256 tokenId,
        bool isTimeExtend
    );

    event ClaimNft(
        uint256 indexed auctionId,
        uint256 indexed offerId,
        uint256 tokenId,
        address indexed winner
    );

    event RefundToken(
        uint256 indexed auctionId,
        uint256 indexed offerId,
        uint256 amount,
        address indexed bider
    );

    event OrderAdded(
        uint256 indexed orderId,
        address indexed seller,
        uint256 indexed tokenId,
        address paymentToken,
        uint256 price
    );

    event OrderCanceled(uint256 indexed orderId);

    event OrderMatched(
        uint256 indexed orderId,
        address indexed seller,
        address indexed buyer,
        uint256 tokenId,
        address paymentToken,
        uint256 price
    );

    event FeeRateUpdate(uint256 feeDecimal, uint256 feeRate);

    constructor(
        address nftAddress_,
        uint256 feeDecimal_,
        uint256 feeRate_,
        address feeRecipient_
    ) {
        require(
            nftAddress_ != address(0),
            "NFTMarketplace: nftAddress_ is zero address"
        );
        require(
            feeRecipient_ != address(0),
            "NFTMarketplace: feeRecipient is zero address"
        );

        nftContract = IERC721(nftAddress_);
        _updateFeeRate(feeDecimal_, feeRate_);
        _updateFeeRecipient(feeRecipient_);

        _orderIdCount.increment();
        _auctionIdCount.increment();
    }

    function _updateFeeRecipient(address feeRecipient_) internal {
        require(
            feeRecipient_ != address(0),
            "NFTMarketplace: feeRecipient is zero address"
        );
        feeRecipient = feeRecipient_;
    }

    function updateFeeRecipient(address feeRecipient_) external onlyOwner {
        _updateFeeRecipient(feeRecipient_);
    }

    function _updateFeeRate(uint256 feeDecimal_, uint256 feeRate_)
        internal
        onlyOwner
    {
        require(
            feeRate_ < 10**(feeDecimal_ + 2),
            "NFTMarketplace: bad fee rate"
        );

        feeRate = feeRate_;
        feeDecimal = feeDecimal_;
        emit FeeRateUpdate(feeDecimal_, feeRate_);
    }

    function updateFeeRate(uint256 feeDecimal_, uint256 feeRate_) external {
        _updateFeeRate(feeDecimal_, feeRate_);
    }

    function _calculateFee(uint256 orderId_) private view returns (uint256) {
        Order storage _order = orders[orderId_];
        if (feeRate == 0) {
            return 0;
        }

        return (feeRate * _order.price) / 10**(feeDecimal + 2);
    }

    function isSeller(uint256 orderId_, address seller_)
        public
        view
        returns (bool)
    {
        return orders[orderId_].seller == seller_;
    }

    function addPaymentToken(address paymentToken_) external onlyOwner {
        require(
            paymentToken_ != address(0),
            "NFTMarketplace: paymentToken address is zero address"
        );

        require(
            _supportedPaymentToken.add(paymentToken_),
            "NFTMarketplace: already supported"
        );
    }

    function isPaymentSupported(address paymentToken_)
        public
        view
        returns (bool)
    {
        return _supportedPaymentToken.contains(paymentToken_);
    }

    modifier onlySupportedPaymentToken(address paymentToken_) {
        require(
            isPaymentSupported(paymentToken_),
            "NFTMarketplace: unsupport payment token"
        );
        _;
    }

    function addAuction(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _minPrice,
        uint256 _lowestPriceIncrease,
        uint256 _timeAuction
    ) public onlySupportedPaymentToken(_paymentToken) returns (uint256) {
        require(
            _minPrice > 0,
            "NFTMarketplace: min price must be greater than 0"
        );
        require(
            _lowestPriceIncrease > 0,
            "NFTMarketplace: lowest price increase must be greater than 0"
        );
        require(
            nftContract.ownerOf(_tokenId) == address(this) ||
                nftContract.isApprovedForAll(msg.sender, address(this)),
            "NFTMarketplace: The contract is unauthorized  to manage this token"
        );
        require(
            _timeAuction > 1 hours,
            "NFTMarketplace: Time auction must be greater than 1 hours"
        );

        nftContract.transferFrom(msg.sender, address(this), _tokenId);

        uint256 auctionId = _auctionIdCount.current();
        Counters.Counter memory offerCount;
        auctions[auctionId] = Auction(
            _tokenId,
            msg.sender,
            address(0),
            _minPrice,
            _lowestPriceIncrease,
            _paymentToken,
            block.timestamp,
            _timeAuction,
            offerCount
        );

        emit AuctionAdded(
            auctionId,
            msg.sender,
            _tokenId,
            _paymentToken,
            _minPrice,
            block.timestamp,
            _timeAuction
        );
        return auctionId;
    }

    function cancelAuction(uint256 _auctionId) public {
        Auction storage auction = auctions[_auctionId];
        require(
            auction.seller == msg.sender,
            "NFTMarketplace: not auction owner"
        );
        require(
            auction.highestOffer.current() == 0,
            "NFTMarketplace: highest offer must be equal to 0"
        );

        uint256 _tokenId = auction.tokenId;
        delete auctions[_auctionId];
        nftContract.transferFrom(address(this), msg.sender, _tokenId);
        emit AuctionCancel(_auctionId);
    }

    function addOffer(uint256 _auctionId, uint256 _amount) public {
        Auction storage auction = auctions[_auctionId];
        require(
            auction.seller != address(0),
            "NFTMarketplace: auction already canceled"
        );
        require(
            block.timestamp < auction.timeStart + auction.auctionTime,
            "NFTMarketplace: auction exceed time"
        );

        require(
            IERC20(auction.tokenPayment).allowance(msg.sender, address(this)) >=
                _amount,
            "NFTMarketplace: number of token approved not equal to amount bid"
        );

        Offer memory offer = offers[_auctionId][auction.highestOffer.current()];
        require(
            _amount >= offer.amount + auction.lowestPriceIncrease,
            "NFTMarkplace: amount must be greater than old price plus with lowest price increase"
        );

        auction.highestOffer.increment();
        uint256 offerId = auction.highestOffer.current();
        IERC20(auction.tokenPayment).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        offers[_auctionId][offerId] = Offer(msg.sender, _amount);

        bool isTimeExtend = false;
        if (
            auction.timeStart + auction.auctionTime - block.timestamp <
            10 minutes
        ) {
            auction.auctionTime += 10 minutes;
            isTimeExtend = true;
        }

        emit OfferAdded(
            _auctionId,
            offerId,
            msg.sender,
            _amount,
            auction.tokenId,
            isTimeExtend
        );
    }

    function claimNft(uint256 _auctionId) public {
        Auction storage auction = auctions[_auctionId];
        require(
            auction.seller != address(0),
            "NFTMarketplace: auction already canceled"
        );
        require(
            auction.winner == address(0),
            "NFTMarketplace: auction already claimed"
        );
        require(
            auction.timeStart + auction.auctionTime <= block.timestamp,
            "NFTMarkplace: time auction not finish"
        );

        uint256 offerId = auction.highestOffer.current();
        Offer memory offer = offers[_auctionId][offerId];
        require(
            offer.bider == msg.sender,
            "NFTMarketplace: not the owner of highest bider"
        );

        auction.winner = msg.sender;
        nftContract.transferFrom(address(this), msg.sender, auction.tokenId);
        emit ClaimNft(_auctionId, offerId, auction.tokenId, msg.sender);
    }

    function refundToken(uint256 _auctionId, uint256 _offerId) public {
        Auction memory auction = auctions[_auctionId];
        require(
            auction.seller != address(0),
            "NFTMarketplace: auction already canceled"
        );
        require(
            auction.timeStart + auction.auctionTime <= block.timestamp,
            "NFTMarkplace: time auction not finish"
        );

        Offer memory offer = offers[_auctionId][_offerId];
        require(
            offer.bider != address(0),
            "NFTMarkplace, Already refund this offer"
        );
        require(offer.bider == msg.sender, "NFTMarkplace, Not owner of offer");

        IERC20(auction.tokenPayment).transfer(msg.sender, offer.amount);
        delete offers[_auctionId][_offerId];
        emit RefundToken(_auctionId, _offerId, offer.amount, offer.bider);
    }

    function addOrder(
        uint256 tokenId_,
        uint256 price_,
        address paymentToken_
    ) public onlySupportedPaymentToken(paymentToken_) {
        require(
            nftContract.ownerOf(tokenId_) == _msgSender(),
            "NFTMarketplace: sender is not owner of token"
        );

        require(
            nftContract.getApproved(tokenId_) == address(this) ||
                nftContract.isApprovedForAll(_msgSender(), address(this)),
            "NFTMarketplace: NFTMarketplace price must be greater than 0"
        );

        require(price_ > 0, "NFTMarketplace: price must be greater than 0");

        uint256 _orderId = _orderIdCount.current();
        orders[_orderId] = Order(
            _msgSender(),
            address(0),
            tokenId_,
            paymentToken_,
            price_
        );

        _orderIdCount.increment();

        nftContract.transferFrom(_msgSender(), address(this), tokenId_);
        emit OrderAdded(
            _orderId,
            _msgSender(),
            tokenId_,
            paymentToken_,
            price_
        );
    }

    function cancelOrder(uint256 orderId_) external {
        Order storage _order = orders[orderId_];

        require(
            _order.buyer == address(0),
            "NFTMarketplace: buyer must be zero"
        );

        require(_order.seller == _msgSender(), "NFTMarketplace: must be owner");
        uint256 _tokenId = _order.tokenId;

        delete orders[orderId_];

        nftContract.transferFrom(address(this), _msgSender(), _tokenId);
        emit OrderCanceled(orderId_);
    }

    function executeOrder(uint256 orderId_) external {
        Order storage _order = orders[orderId_];

        require(_order.price > 0, "NFTMarketplace: order has been canceled");

        require(
            !isSeller(orderId_, _msgSender()),
            "NFTMarketplace: buyer must be different from seller"
        );

        require(
            orders[orderId_].buyer == address(0),
            "NFTMarketplace: buyer must be zero"
        );

        _order.buyer = _msgSender();

        uint256 _feeAmount = _calculateFee(orderId_);
        if (_feeAmount > 0) {
            IERC20(_order.paymentToken).transferFrom(
                _msgSender(),
                feeRecipient,
                _feeAmount
            );
        }

        IERC20(_order.paymentToken).transferFrom(
            _msgSender(),
            _order.seller,
            _order.price - _feeAmount
        );

        nftContract.transferFrom(address(this), _msgSender(), _order.tokenId);

        emit OrderMatched(
            orderId_,
            _order.seller,
            _msgSender(),
            _order.tokenId,
            _order.paymentToken,
            _order.price
        );
    }
}
