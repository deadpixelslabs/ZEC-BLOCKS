// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IRH20 {
    function transferFrom(string calldata tick, address from, address to, uint256 amount) external returns (bool);
    function transfer(string calldata tick, address to, uint256 amount) external returns (bool);
}

/// @notice Whole-lot RH-20 trading for native ETH on Robinhood Chain.
/// @dev Fixed core, treasury and fee. No owner, upgrade, pause or administrator withdrawal.
contract RH20Marketplace {
    address public constant CORE = 0x4e89Bc6A7A218B338060d428f40d8f551efc8058;
    address public constant TREASURY = 0x81046ab56F41a78077662624aC4116465fDf00cc;
    bytes32 public constant CORE_CODE_HASH = 0x4b6b4723f377f6d67a31097f71c7d14a7c59bca08dc8cf0d24f796fe7d6a7052;
    uint256 public constant FEE_BPS = 300;
    uint256 public constant CHAIN_ID = 4663;
    uint256 public nextListingId = 1;
    uint256 private _entered;

    struct Listing { uint256 id; string tick; address seller; uint256 amount; uint256 price; uint8 state; }
    struct Stats { uint256 active; uint256 listedAmount; uint256 sales; uint256 volume; }
    struct Sale { uint256 listingId; uint256 amount; uint256 price; uint256 timestamp; }
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(bytes32 => uint256)) public listingByRequest;
    mapping(bytes32 => uint256[]) private _active;
    mapping(bytes32 => mapping(address => uint256[])) private _owned;
    mapping(uint256 => uint256) private _activePosition;
    mapping(uint256 => uint256) private _ownedPosition;
    mapping(bytes32 => Stats) private _stats;
    mapping(bytes32 => Sale[]) private _sales;
    mapping(address => uint256) public claimable;

    error InvalidConfiguration();
    error InvalidListing();
    error RequestAlreadyUsed();
    error ListingUnavailable();
    error NotSeller();
    error CannotBuyOwnListing();
    error IncorrectPayment();
    error TransferFailed();
    error ReentrantCall();
    error InvalidPage();
    error NothingToWithdraw();

    event MarketplaceDeployed(address indexed core, address indexed treasury, uint256 feeBps);
    event Listed(uint256 indexed id, bytes32 indexed tokenId, address indexed seller, string tick, uint256 amount, uint256 price, bytes32 requestId);
    event Cancelled(uint256 indexed id, address indexed seller);
    event Bought(uint256 indexed id, bytes32 indexed tokenId, address indexed buyer, uint256 amount, uint256 price, uint256 fee);
    event PaymentDeferred(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, address indexed recipient, uint256 amount);

    modifier nonReentrant() {
        if (_entered != 0) revert ReentrantCall();
        _entered = 1;
        _;
        _entered = 0;
    }

    constructor() {
        if (block.chainid != CHAIN_ID || CORE.codehash != CORE_CODE_HASH) revert InvalidConfiguration();
        emit MarketplaceDeployed(CORE, TREASURY, FEE_BPS);
    }

    /// @notice Approve the exact token amount in RH-20 before creating a listing.
    function createListing(string calldata tick, uint256 amount, uint256 price, bytes32 requestId) external nonReentrant returns (uint256 id) {
        if (amount == 0 || price < 100 || requestId == bytes32(0)) revert InvalidListing();
        if (listingByRequest[msg.sender][requestId] != 0) revert RequestAlreadyUsed();
        // The fixed core validates the ticker, existence, balance and allowance.
        id = nextListingId++;
        bytes32 tokenId = keccak256(bytes(tick));
        listings[id] = Listing(id, tick, msg.sender, amount, price, 1);
        listingByRequest[msg.sender][requestId] = id;
        _activePosition[id] = _active[tokenId].length;
        _active[tokenId].push(id);
        _ownedPosition[id] = _owned[tokenId][msg.sender].length;
        _owned[tokenId][msg.sender].push(id);
        _stats[tokenId].active++;
        _stats[tokenId].listedAmount += amount;
        if (!IRH20(CORE).transferFrom(tick, msg.sender, address(this), amount)) revert TransferFailed();
        emit Listed(id, tokenId, msg.sender, tick, amount, price, requestId);
    }

    function cancelListing(uint256 id) external nonReentrant {
        Listing memory listing = listings[id];
        if (listing.state != 1) revert ListingUnavailable();
        if (listing.seller != msg.sender) revert NotSeller();
        _close(listing, 3);
        if (!IRH20(CORE).transfer(listing.tick, listing.seller, listing.amount)) revert TransferFailed();
        emit Cancelled(id, listing.seller);
    }

    /// @notice Buys the entire immutable lot. The displayed price includes the fee.
    function buy(uint256 id) external payable nonReentrant {
        Listing memory listing = listings[id];
        if (listing.state != 1) revert ListingUnavailable();
        if (listing.seller == msg.sender) revert CannotBuyOwnListing();
        if (msg.value != listing.price) revert IncorrectPayment();
        bytes32 tokenId = keccak256(bytes(listing.tick));
        _close(listing, 2);
        uint256 fee = feeFor(msg.value);
        _stats[tokenId].sales++;
        _stats[tokenId].volume += msg.value;
        _sales[tokenId].push(Sale(id, listing.amount, listing.price, block.timestamp));
        if (!IRH20(CORE).transfer(listing.tick, msg.sender, listing.amount)) revert TransferFailed();
        // Bounded push payments keep a rejecting recipient from blocking a trade.
        // Failed payments remain payable only to their original beneficiary.
        _pay(listing.seller, msg.value - fee);
        _pay(TREASURY, fee);
        emit Bought(id, tokenId, msg.sender, listing.amount, listing.price, fee);
    }

    function feeFor(uint256 price) public pure returns (uint256) {
        return (price / 10_000) * FEE_BPS + ((price % 10_000) * FEE_BPS) / 10_000;
    }

    function withdraw(address payable recipient) external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        if (recipient == address(0) || recipient == address(this)) revert InvalidListing();
        claimable[msg.sender] = 0;
        (bool sent,) = recipient.call{value: amount}("");
        if (!sent) revert TransferFailed();
        emit Withdrawn(msg.sender, recipient, amount);
    }

    function stats(string calldata tick) external view returns (Stats memory) { return _stats[keccak256(bytes(tick))]; }

    /// @notice Bounded pages. Read every page of a snapshot at the same RPC block.
    function getListings(string calldata tick, address seller, uint256 offset, uint256 limit) external view returns (Listing[] memory page, uint256 total) {
        if (limit == 0 || limit > 50) revert InvalidPage();
        bytes32 tokenId = keccak256(bytes(tick));
        uint256[] storage ids = seller == address(0) ? _active[tokenId] : _owned[tokenId][seller];
        total = ids.length;
        uint256 count = offset >= total ? 0 : (total - offset < limit ? total - offset : limit);
        page = new Listing[](count);
        for (uint256 i; i < count; ++i) page[i] = listings[ids[offset + i]];
    }

    function recentSales(string calldata tick, uint256 offset, uint256 limit) external view returns (Sale[] memory page, uint256 total) {
        if (limit == 0 || limit > 50) revert InvalidPage();
        Sale[] storage sales = _sales[keccak256(bytes(tick))];
        total = sales.length;
        uint256 count = offset >= total ? 0 : (total - offset < limit ? total - offset : limit);
        page = new Sale[](count);
        for (uint256 i; i < count; ++i) page[i] = sales[total - offset - i - 1];
    }

    function _close(Listing memory listing, uint8 state) private {
        listings[listing.id].state = state;
        bytes32 tokenId = keccak256(bytes(listing.tick));
        uint256[] storage active = _active[tokenId];
        uint256 position = _activePosition[listing.id];
        uint256 moved = active[active.length - 1];
        active[position] = moved;
        _activePosition[moved] = position;
        active.pop();
        delete _activePosition[listing.id];
        uint256[] storage owned = _owned[tokenId][listing.seller];
        position = _ownedPosition[listing.id];
        moved = owned[owned.length - 1];
        owned[position] = moved;
        _ownedPosition[moved] = position;
        owned.pop();
        delete _ownedPosition[listing.id];
        _stats[tokenId].active--;
        _stats[tokenId].listedAmount -= listing.amount;
    }

    function _pay(address account, uint256 amount) private {
        if (amount == 0) return;
        claimable[account] += amount;
        (bool sent,) = payable(account).call{value: amount, gas: 50_000}("");
        if (sent) claimable[account] -= amount;
        else emit PaymentDeferred(account, amount);
    }
}
