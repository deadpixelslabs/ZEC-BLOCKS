// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IRH20 {
    function transferFrom(string calldata tick, address from, address to, uint256 amount) external returns (bool);
    function transfer(string calldata tick, address to, uint256 amount) external returns (bool);
}

/// @notice Whole-lot RH-20 trading for native ETH on Robinhood Chain.
/// @dev Fixed dependencies. Seller NFT ownership is checked at settlement. No owner or upgrades.
interface IOrdinalBalance { function balanceOf(address account) external view returns (uint256); }

contract RH20HolderMarketplace {
    address public constant CORE = 0x4e89Bc6A7A218B338060d428f40d8f551efc8058;
    address public constant TREASURY = 0x81046ab56F41a78077662624aC4116465fDf00cc;
    bytes32 public constant CORE_CODE_HASH = 0x4b6b4723f377f6d67a31097f71c7d14a7c59bca08dc8cf0d24f796fe7d6a7052;
    uint256 public constant FEE_BPS = 300;
    address public constant COLLECTION = 0x6e049af563A804Ef834b4f6d1c8958a488571b21;
    bytes32 public constant COLLECTION_CODE_HASH = 0xa68a7fdde52b238feb57470c65eb54cc2e31fe0703362ff0f40418bd68553e29;
    uint256 public constant MAX_LOTS = 20;
    mapping(address => mapping(bytes32 => bool)) public usedRequests;
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
    error InvalidSelection();
    error AmountChanged();
    error QuoteExpired();
    error NothingToWithdraw();

    event HolderMarketplaceDeployed(address indexed core, address indexed treasury, address indexed collection, uint256 feeBps, uint256 maxLots);
    event Swept(address indexed buyer, bytes32 indexed requestId, bytes32 selectionHash, uint256 lots, uint256 amount, uint256 price);
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
        if (block.chainid != CHAIN_ID || CORE.codehash != CORE_CODE_HASH || COLLECTION.codehash != COLLECTION_CODE_HASH) revert InvalidConfiguration();
        emit HolderMarketplaceDeployed(CORE, TREASURY, COLLECTION, FEE_BPS, MAX_LOTS);
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

    /// @notice Buys a whole lot. Only the seller's current NFT ownership affects fees.
    function buy(uint256 id) external payable nonReentrant {
        Listing memory listing = listings[id];
        _checkBuyer(listing);
        if (msg.value != listing.price) revert IncorrectPayment();
        uint256 fee = feeForSeller(listing.seller, listing.price);
        _settle(listing, fee);
    }

    /// @notice Atomic RHSC checkout. Snapshot every seller's fee before any payout callback.
    function sweep(uint256[] calldata ids, uint256 expectedAmount, uint256 deadline, bytes32 requestId) external payable nonReentrant {
        uint256 length = ids.length;
        if (length == 0 || length > MAX_LOTS || requestId == bytes32(0)) revert InvalidSelection();
        if (block.timestamp > deadline) revert QuoteExpired();
        if (usedRequests[msg.sender][requestId]) revert RequestAlreadyUsed();
        Listing[] memory selected = new Listing[](length);
        uint256[] memory fees = new uint256[](length);
        uint256 totalPrice;
        uint256 totalAmount;
        for (uint256 i; i < length; ++i) {
            for (uint256 j; j < i; ++j) if (ids[i] == ids[j]) revert InvalidSelection();
            Listing memory listing = listings[ids[i]];
            _checkBuyer(listing);
            if (keccak256(bytes(listing.tick)) != keccak256("RHSC")) revert InvalidSelection();
            selected[i] = listing;
            fees[i] = feeForSeller(listing.seller, listing.price);
            totalPrice += listing.price;
            totalAmount += listing.amount;
        }
        if (msg.value != totalPrice) revert IncorrectPayment();
        if (expectedAmount != totalAmount) revert AmountChanged();
        usedRequests[msg.sender][requestId] = true;
        for (uint256 i; i < length; ++i) _settle(selected[i], fees[i]);
        emit Swept(msg.sender, requestId, keccak256(abi.encode(ids)), length, totalAmount, totalPrice);
    }

    function sellerFeeBps(address seller) public view returns (uint256) {
        return IOrdinalBalance(COLLECTION).balanceOf(seller) > 0 ? 0 : FEE_BPS;
    }

    function feeForSeller(address seller, uint256 price) public view returns (uint256) {
        return sellerFeeBps(seller) == 0 ? 0 : feeFor(price);
    }

    function _checkBuyer(Listing memory listing) private view {
        if (listing.state != 1) revert ListingUnavailable();
        if (listing.seller == msg.sender) revert CannotBuyOwnListing();
    }

    function _settle(Listing memory listing, uint256 fee) private {
        bytes32 tokenId = keccak256(bytes(listing.tick));
        _close(listing, 2);
        _stats[tokenId].sales++;
        _stats[tokenId].volume += listing.price;
        _sales[tokenId].push(Sale(listing.id, listing.amount, listing.price, block.timestamp));
        if (!IRH20(CORE).transfer(listing.tick, msg.sender, listing.amount)) revert TransferFailed();
        _pay(listing.seller, listing.price - fee);
        _pay(TREASURY, fee);
        emit Bought(listing.id, tokenId, msg.sender, listing.amount, listing.price, fee);
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
