import { defaultAbiCoder } from 'ethers/lib/utils';
import { task } from 'hardhat/config';
import {
  FollowNFT__factory,
  LensHub__factory,
  AlkyneFollowModule__factory,
  ModuleGlobals__factory,
} from '../typechain-types';
import { CreateProfileDataStruct } from '../typechain-types/LensHub';
import {
  deployContract,
  getAddrs,
  initEnv,
  ProtocolState,
  waitForTx,
  ZERO_ADDRESS,
} from './helpers/utils';

// eslint-disable-next-line no-empty-pattern
task('test-module', 'tests the SecretCodeFollowModule').setAction(async ({}, hre) => {
  const CURRENCY_ADDR = '0x50F8462EB065967957a6C991308A130092836B7a';
  const [governance, , user] = await initEnv(hre);
  console.log('governance', governance.address);
  console.log('user', user.address);
  const addrs = getAddrs();
  const lensHub = LensHub__factory.connect(addrs['lensHub proxy'], governance);
  const moduleGlobals = ModuleGlobals__factory.connect(addrs['module globals'], governance);

  await waitForTx(lensHub.setState(ProtocolState.Unpaused));
  await waitForTx(lensHub.whitelistProfileCreator(user.address, true));
  await waitForTx(moduleGlobals.whitelistCurrency(CURRENCY_ADDR, true));

  const inputStruct: CreateProfileDataStruct = {
    to: user.address,
    handle: `zer0dot${Date.now()}`,
    imageURI:
      'https://ipfs.fleek.co/ipfs/ghostplantghostplantghostplantghostplantghostplantghostplan',
    followModule: ZERO_ADDRESS,
    followModuleInitData: [],
    followNFTURI:
      'https://ipfs.fleek.co/ipfs/ghostplantghostplantghostplantghostplantghostplantghostplan',
  };
  console.log(await waitForTx(lensHub.connect(user).createProfile(inputStruct)));

  const secretCodeFollowModule = await deployContract(
    new AlkyneFollowModule__factory(governance).deploy(lensHub.address, moduleGlobals.address)
  );
  console.log(lensHub.address);
  await waitForTx(lensHub.whitelistFollowModule(secretCodeFollowModule.address, true));

  // wait 10 seconds
  console.log('waiting 20 seconds...', secretCodeFollowModule.address);
  await new Promise((resolve) => setTimeout(resolve, 20000));
  console.log('waited');

  const data = defaultAbiCoder.encode(
    ['address', 'address', 'address', 'uint256'],
    [
      CURRENCY_ADDR,
      '0x526AFE1742c655D94cB98E6Bf9e9865112C15264',
      '0xFBfB4A7c17eFAE6E9b72859fBFE88808B5536F42',
      100,
    ]
  );
  await waitForTx(lensHub.connect(user).setFollowModule(1, secretCodeFollowModule.address, data));

  const followData = defaultAbiCoder.encode(['uint256'], [1]);
  await waitForTx(lensHub.connect(user).follow([1], [followData]));

  const followNFTAddr = await lensHub.getFollowNFT(1);
  const followNFT = FollowNFT__factory.connect(followNFTAddr, user);

  const totalSupply = await followNFT.totalSupply();
  const ownerOf = await followNFT.ownerOf(1);

  console.log(`Follow NFT total supply (should be 1): ${totalSupply}`);
  console.log(
    `Follow NFT owner of ID 1: ${ownerOf}, user address (should be the same): ${user.address}`
  );
});
