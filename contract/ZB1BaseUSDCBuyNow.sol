// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ZB1BaseUSDCBuyNow
/// @notice Base-USDC fixed-price Buy Now settlement registry for ZEC BLOCKS / ZB-1.
/// @dev
/// ZEC BLOCKS remain application-layer ZB-1 assets rooted in Zcash.
/// This contract manages the Base payment/listing rail only.
///
/// IMPORTANT:
/// The contract cannot independently prove current ZB-1 ownership on Zcash.
/// Official ZB-1 clients MUST verify the seller's Noir/ZB-1 listing signature
/// and that sellerCommitment is the current ZB-1 owner before presenting a
/// listing as buyable or accepting its settlement as an ownership transition.
contract ZB1BaseUSDCBuyNow {
    uint256 public constant BASE_CHAIN_ID = 8453;

    // Native Circle USDC on Base Mainnet.
    address public constant USDC =
        address(uint160(0x00833589fcd6edb6e08f4c7c32d4f71b54bda02913));

    // ZEC BLOCKS protocol treasury.
    address public constant TREASURY =
        address(uint160(0x002505036508a68bacd86a4f48642fb7e9432e583d));

    uint256 public constant FEE_BPS = 300; // 3%
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_PRICE = 10_000; // 0.01 USDC (6 decimals)
    uint256 public constant MAX_LISTING_LIFETIME = 30 days;

    enum ListingStatus {
        NONE,
        ACTIVE,
        SOLD,
        CANCELLED
    }

    struct Listing {
        address seller;              // Base wallet that receives 97%
        bytes32 sellerCommitment;    // current ZB-1 owner commitment
        uint32 tokenId;              // 1..5000
        uint64 expiresAt;
        uint128 priceUSDC;            // USDC base units (6 decimals)
        bytes32 listingNonce;        // seller-generated unique nonce
        bytes32 zb1ListingHash;      // hash of seller-signed ZB-1 listing message
        ListingStatus status;

        // populated only after a successful Buy Now
        address buyer;
        bytes32 buyerCommitment;
        uint64 settledAt;
    }

    mapping(bytes32 => Listing) public listings;

    uint256 private _entered;

    event ListingCreated(
        bytes32 indexed listingId,
        uint32 indexed tokenId,
        bytes32 indexed sellerCommitment,
        address seller,
        uint256 priceUSDC,
        uint64 expiresAt,
        bytes32 listingNonce,
        bytes32 zb1ListingHash
    );

    event ListingCancelled(
        bytes32 indexed listingId,
        uint32 indexed tokenId,
        address indexed seller
    );

    event ZB1SaleSettled(
        bytes32 indexed listingId,
        uint32 indexed tokenId,
        bytes32 indexed buyerCommitment,
        bytes32 sellerCommitment,
        bytes32 zb1ListingHash,
        address buyer,
        address seller,
        uint256 grossAmountUSDC,
        uint256 protocolFeeUSDC,
        uint256 sellerAmountUSDC,
        uint64 settledAt
    );

    error WrongChain();
    error Reentrancy();
    error InvalidTokenId();
    error InvalidCommitment();
    error InvalidPrice();
    error InvalidExpiry();
    error InvalidNonce();
    error InvalidListingHash();
    error ListingAlreadyExists();
    error ListingNotActive();
    error ListingExpired();
    error NotSeller();
    error SameOwnerCommitment();
    error USDCTransferFailed();
    error USDCPermitFailed();

    modifier nonReentrant() {
        if (_entered != 0) revert Reentrancy();
        _entered = 1;
        _;
        _entered = 0;
    }

    /// @notice Register a fixed-price listing on Base.
    /// @dev Seller should first sign the matching ZB-1/Noir listing message.
    ///      `zb1ListingHash` binds the onchain Base listing to that signed intent.
    function createListing(
        uint32 tokenId,
        bytes32 sellerCommitment,
        uint128 priceUSDC,
        uint64 expiresAt,
        bytes32 listingNonce,
        bytes32 zb1ListingHash
    )
        external
        returns (bytes32 listingId)
    {
        _requireBase();

        if (tokenId == 0 || tokenId > 5000) revert InvalidTokenId();
        if (sellerCommitment == bytes32(0)) revert InvalidCommitment();
        if (uint256(priceUSDC) < MIN_PRICE) revert InvalidPrice();
        if (
            expiresAt <= block.timestamp ||
            uint256(expiresAt) > block.timestamp + MAX_LISTING_LIFETIME
        ) revert InvalidExpiry();
        if (listingNonce == bytes32(0)) revert InvalidNonce();
        if (zb1ListingHash == bytes32(0)) revert InvalidListingHash();

        listingId = computeListingId(
            msg.sender,
            tokenId,
            sellerCommitment,
            priceUSDC,
            expiresAt,
            listingNonce,
            zb1ListingHash
        );

        if (listings[listingId].status != ListingStatus.NONE) {
            revert ListingAlreadyExists();
        }

        listings[listingId] = Listing({
            seller: msg.sender,
            sellerCommitment: sellerCommitment,
            tokenId: tokenId,
            expiresAt: expiresAt,
            priceUSDC: priceUSDC,
            listingNonce: listingNonce,
            zb1ListingHash: zb1ListingHash,
            status: ListingStatus.ACTIVE,
            buyer: address(0),
            buyerCommitment: bytes32(0),
            settledAt: 0
        });

        emit ListingCreated(
            listingId,
            tokenId,
            sellerCommitment,
            msg.sender,
            priceUSDC,
            expiresAt,
            listingNonce,
            zb1ListingHash
        );
    }

    /// @notice Cancel an unsold listing.
    function cancelListing(bytes32 listingId) external {
        _requireBase();

        Listing storage l = listings[listingId];
        if (l.status != ListingStatus.ACTIVE) revert ListingNotActive();
        if (msg.sender != l.seller) revert NotSeller();

        l.status = ListingStatus.CANCELLED;

        emit ListingCancelled(listingId, l.tokenId, msg.sender);
    }

    /// @notice Buy immediately using a pre-existing USDC allowance.
    /// @dev One onchain Buy Now transaction after allowance is available.
    function buyNow(
        bytes32 listingId,
        bytes32 buyerCommitment
    )
        external
        nonReentrant
        returns (uint256 protocolFeeUSDC, uint256 sellerAmountUSDC)
    {
        _requireBase();
        return _buyNow(listingId, buyerCommitment, msg.sender);
    }

    /// @notice Buy immediately using an EIP-2612 USDC permit.
    /// @dev Buyer signs the permit off-chain, then sends one onchain transaction.
    ///      If a wallet/token path cannot use permit, frontend falls back to
    ///      approve(USDC) + buyNow().
    function buyNowWithPermit(
        bytes32 listingId,
        bytes32 buyerCommitment,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        external
        nonReentrant
        returns (uint256 protocolFeeUSDC, uint256 sellerAmountUSDC)
    {
        _requireBase();

        Listing storage l = listings[listingId];
        _validateBuy(l, buyerCommitment);

        (bool ok, ) = USDC.call(
            abi.encodeWithSelector(
                IUSDC.permit.selector,
                msg.sender,
                address(this),
                uint256(l.priceUSDC),
                permitDeadline,
                v,
                r,
                s
            )
        );
        if (!ok) revert USDCPermitFailed();

        return _settle(l, listingId, buyerCommitment, msg.sender);
    }

    function _buyNow(
        bytes32 listingId,
        bytes32 buyerCommitment,
        address buyer
    )
        internal
        returns (uint256 protocolFeeUSDC, uint256 sellerAmountUSDC)
    {
        Listing storage l = listings[listingId];
        _validateBuy(l, buyerCommitment);
        return _settle(l, listingId, buyerCommitment, buyer);
    }

    function _validateBuy(
        Listing storage l,
        bytes32 buyerCommitment
    )
        internal
        view
    {
        if (l.status != ListingStatus.ACTIVE) revert ListingNotActive();
        if (block.timestamp > l.expiresAt) revert ListingExpired();
        if (buyerCommitment == bytes32(0)) revert InvalidCommitment();
        if (buyerCommitment == l.sellerCommitment) {
            revert SameOwnerCommitment();
        }
    }

    function _settle(
        Listing storage l,
        bytes32 listingId,
        bytes32 buyerCommitment,
        address buyer
    )
        internal
        returns (uint256 protocolFeeUSDC, uint256 sellerAmountUSDC)
    {
        uint256 gross = uint256(l.priceUSDC);

        // Floor division is exact for normal cent-level prices and can be at
        // most one micro-USDC below 3%. MIN_PRICE prevents dust listings.
        protocolFeeUSDC = (gross * FEE_BPS) / BPS;
        sellerAmountUSDC = gross - protocolFeeUSDC;

        // Effects before interactions.
        l.status = ListingStatus.SOLD;
        l.buyer = buyer;
        l.buyerCommitment = buyerCommitment;
        l.settledAt = uint64(block.timestamp);

        // Non-custodial split: funds move directly from buyer to recipients.
        _safeTransferFrom(USDC, buyer, l.seller, sellerAmountUSDC);
        if (protocolFeeUSDC != 0) {
            _safeTransferFrom(USDC, buyer, TREASURY, protocolFeeUSDC);
        }

        emit ZB1SaleSettled(
            listingId,
            l.tokenId,
            buyerCommitment,
            l.sellerCommitment,
            l.zb1ListingHash,
            buyer,
            l.seller,
            gross,
            protocolFeeUSDC,
            sellerAmountUSDC,
            uint64(block.timestamp)
        );
    }

    /// @notice Exact deterministic ID for a listing.
    function computeListingId(
        address seller,
        uint32 tokenId,
        bytes32 sellerCommitment,
        uint128 priceUSDC,
        uint64 expiresAt,
        bytes32 listingNonce,
        bytes32 zb1ListingHash
    )
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                "ZB1:BASE_USDC_BUYNOW:v1",
                block.chainid,
                address(this),
                seller,
                tokenId,
                sellerCommitment,
                priceUSDC,
                expiresAt,
                listingNonce,
                zb1ListingHash
            )
        );
    }

    function quoteSplit(uint256 grossAmountUSDC)
        external
        pure
        returns (uint256 protocolFeeUSDC, uint256 sellerAmountUSDC)
    {
        if (grossAmountUSDC < MIN_PRICE) revert InvalidPrice();
        protocolFeeUSDC = (grossAmountUSDC * FEE_BPS) / BPS;
        sellerAmountUSDC = grossAmountUSDC - protocolFeeUSDC;
    }

    function isBuyable(bytes32 listingId) external view returns (bool) {
        Listing storage l = listings[listingId];
        return
            l.status == ListingStatus.ACTIVE &&
            block.timestamp <= l.expiresAt;
    }

    function _requireBase() internal view {
        if (block.chainid != BASE_CHAIN_ID) revert WrongChain();
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    )
        internal
    {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                from,
                to,
                amount
            )
        );

        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert USDCTransferFailed();
        }
    }
}

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

interface IUSDC is IERC20 {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
