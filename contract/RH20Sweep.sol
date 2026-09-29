// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IRH20SweepCore {
    function transfer(string calldata tick, address to, uint256 amount) external returns (bool);
}
interface IRH20SweepMarket {
    function listings(uint256 id) external view returns (uint256, string memory, address, uint256, uint256, uint8);
    function buy(uint256 id) external payable;
}

/// @notice Buys exact RHSC lots from the existing marketplace in one transaction.
/// @dev All lots settle or all changes revert. No extra fee, owner or upgrades.
contract RH20Sweep {
    address public constant CORE = 0x4e89Bc6A7A218B338060d428f40d8f551efc8058;
    address public constant MARKETPLACE = 0x3E6E91232CE0895C6154b66800ee5c8B8EE83CFC;
    bytes32 public constant CORE_CODE_HASH = 0x4b6b4723f377f6d67a31097f71c7d14a7c59bca08dc8cf0d24f796fe7d6a7052;
    bytes32 public constant MARKET_CODE_HASH = 0xab89d9ba02f343fbf62259fda02f3281f3b5507e69fd68bd8dd175541ed0b511;
    uint256 public constant CHAIN_ID = 4663;
    uint256 public constant MAX_LOTS = 20;
    uint256 private _entered;
    mapping(address => mapping(bytes32 => bool)) public usedRequests;

    error InvalidConfiguration();
    error InvalidSelection();
    error ListingUnavailable(uint256 id);
    error CannotBuyOwnListing();
    error IncorrectPayment();
    error AmountChanged();
    error QuoteExpired();
    error RequestAlreadyUsed();
    error TransferFailed();
    error ReentrantCall();
    event SweepDeployed(address indexed core, address indexed marketplace, uint256 maxLots);
    event Swept(address indexed buyer, bytes32 indexed requestId, bytes32 selectionHash, uint256 lots, uint256 amount, uint256 price);

    constructor() {
        if (block.chainid != CHAIN_ID || CORE.codehash != CORE_CODE_HASH || MARKETPLACE.codehash != MARKET_CODE_HASH) revert InvalidConfiguration();
        emit SweepDeployed(CORE, MARKETPLACE, MAX_LOTS);
    }

    /// @notice Pays the sum of immutable listing prices, including the existing 3% fee.
    /// @param expectedAmount Exact whole RHSC amount the buyer reviewed.
    /// @param deadline Unix timestamp after which this signed purchase cannot execute.
    function sweep(uint256[] calldata ids, uint256 expectedAmount, uint256 deadline, bytes32 requestId) external payable {
        if (_entered != 0) revert ReentrantCall();
        _entered = 1;
        if (ids.length == 0 || ids.length > MAX_LOTS || requestId == bytes32(0)) revert InvalidSelection();
        if (block.timestamp > deadline) revert QuoteExpired();
        if (usedRequests[msg.sender][requestId]) revert RequestAlreadyUsed();
        uint256 totalPrice;
        uint256 totalAmount;
        uint256[] memory prices = new uint256[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            for (uint256 j; j < i; ++j) if (ids[i] == ids[j]) revert InvalidSelection();
            (uint256 amount, uint256 price) = _listing(ids[i]);
            totalAmount += amount;
            totalPrice += price;
            prices[i] = price;
        }
        if (msg.value != totalPrice) revert IncorrectPayment();
        if (totalAmount != expectedAmount) revert AmountChanged();
        usedRequests[msg.sender][requestId] = true;
        for (uint256 i; i < ids.length; ++i) IRH20SweepMarket(MARKETPLACE).buy{value: prices[i]}(ids[i]);
        if (!IRH20SweepCore(CORE).transfer("RHSC", msg.sender, totalAmount)) revert TransferFailed();
        emit Swept(msg.sender, requestId, keccak256(abi.encode(ids)), ids.length, totalAmount, totalPrice);
        _entered = 0;
    }

    function _listing(uint256 id) private view returns (uint256 amount, uint256 price) {
        (uint256 listingId, string memory tick, address seller, uint256 tokens, uint256 cost, uint8 state) = IRH20SweepMarket(MARKETPLACE).listings(id);
        if (state != 1 || listingId != id || keccak256(bytes(tick)) != keccak256("RHSC") || tokens == 0) revert ListingUnavailable(id);
        // The marketplace sees this helper as msg.sender; check the actual buyer here.
        if (seller == msg.sender) revert CannotBuyOwnListing();
        return (tokens, cost);
    }

}
