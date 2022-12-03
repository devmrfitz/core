// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IFollowModule} from '../../../interfaces/IFollowModule.sol';
import {ILensHub} from '../../../interfaces/ILensHub.sol';
import {Errors} from '../../../libraries/Errors.sol';
import {FeeModuleBase} from '../FeeModuleBase.sol';
import {ModuleBase} from '../ModuleBase.sol';
import {FollowValidatorFollowModuleBase} from './FollowValidatorFollowModuleBase.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {IERC721} from '@openzeppelin/contracts/token/ERC721/IERC721.sol';

/**
 * @notice A struct containing the necessary data to execute follow actions on a given profile.
 *
 * @param currency The currency associated with this profile.
 * @param amount The following cost associated with this profile.
 * @param recipient The recipient address associated with this profile.
 */
struct ProfileData {
    address currency;
    address recipient;
    uint256 max_amount;
    address alkyne_wallet_address;
}

interface AlkyneWallet {
    function addFollower(address follower, uint256 amount) external;
}

/**
 * @title AlkyneFollowModule
 * @author Lens Protocol
 *
 * @notice This is a simple Lens FollowModule implementation, inheriting from the IFollowModule interface, but with additional
 * variables that can be controlled by governance, such as the governance & treasury addresses as well as the treasury fee.
 */
contract AlkyneFollowModule is FeeModuleBase, FollowValidatorFollowModuleBase {
    using SafeERC20 for IERC20;

    uint256 MULTIPLIER = 100000;

    mapping(uint256 => ProfileData) internal _dataByProfile;

    constructor(address hub, address moduleGlobals) FeeModuleBase(moduleGlobals) ModuleBase(hub) {}

    /**
     * @notice This follow module levies a fee on follows.
     *
     * @param profileId The profile ID of the profile to initialize this module for.
     * @param data The arbitrary data parameter, decoded into:
     *      address currency: The currency address, must be internally whitelisted.
     *      uint256 amount: The currency total amount to levy.
     *      address recipient: The custom recipient address to direct earnings to.
     *
     * @return bytes An abi encoded bytes parameter, which is the same as the passed data parameter.
     */
    function initializeFollowModule(uint256 profileId, bytes calldata data)
        external
        override
        onlyHub
        returns (bytes memory)
    {
        (address currency, address recipient, address alkyne_wallet_address, uint256 max_amount) = abi.decode(
            data,
            (address, address, address, uint256)
        );
        if (!_currencyWhitelisted(currency) || recipient == address(0) || max_amount == 0 || alkyne_wallet_address == address(0))
            revert("AlkyneFollowModule: Invalid data");

        // _dataByProfile[profileId].amount = amount;
        _dataByProfile[profileId].currency = currency;
        _dataByProfile[profileId].recipient = recipient;
        _dataByProfile[profileId].max_amount = max_amount;
        _dataByProfile[profileId].alkyne_wallet_address = alkyne_wallet_address;
        return data;
    }

    /**
     * @dev Processes a follow by:
     *  1. Charging a fee
     */
    function processFollow(
        address follower,
        uint256 profileId,
        bytes calldata data
    ) external override onlyHub {
        // uint256 amount = _dataByProfile[profileId].amount;
        address currency = _dataByProfile[profileId].currency;

        uint256 amount = abi.decode(data, (uint256));

        AlkyneWallet(_dataByProfile[profileId].alkyne_wallet_address).addFollower(follower, 
            amount*MULTIPLIER/_dataByProfile[profileId].max_amount);

        (address treasury, uint16 treasuryFee) = _treasuryData();
        address recipient = _dataByProfile[profileId].recipient;
        uint256 treasuryAmount = (amount * treasuryFee) / BPS_MAX;
        uint256 adjustedAmount = amount - treasuryAmount;

        IERC20(currency).safeTransferFrom(follower, recipient, adjustedAmount);
        if (treasuryAmount > 0)
            IERC20(currency).safeTransferFrom(follower, treasury, treasuryAmount);
    }

    /**
     * @dev We don't need to execute any additional logic on transfers in this follow module.
     */
    function followModuleTransferHook(
        uint256 profileId,
        address from,
        address to,
        uint256 followNFTTokenId
    ) external override {}

    /**
     * @notice Returns the profile data for a given profile, or an empty struct if that profile was not initialized
     * with this module.
     *
     * @param profileId The token ID of the profile to query.
     *
     * @return ProfileData The ProfileData struct mapped to that profile.
     */
    function getProfileData(uint256 profileId) external view returns (ProfileData memory) {
        return _dataByProfile[profileId];
    }
}
