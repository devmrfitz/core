import { HardhatUserConfig } from 'hardhat/types';
import { accounts } from './helpers/test-wallets';
import { eEthereumNetwork, eNetwork, ePolygonNetwork, eXDaiNetwork } from './helpers/types';
import { HARDHATEVM_CHAINID } from './helpers/hardhat-constants';
import { NETWORKS_RPC_URL } from './helper-hardhat-config';
import dotenv from 'dotenv';
import glob from 'glob';
import path from 'path';
dotenv.config({ path: '../.env' });

import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';
import 'hardhat-log-remover';
import 'hardhat-spdx-license-identifier';

if (!process.env.SKIP_LOAD) {
  glob.sync('./tasks/**/*.ts').forEach(function (file) {
    require(path.resolve(file));
  });
}

const DEFAULT_BLOCK_GAS_LIMIT = 12450000;
const MNEMONIC_PATH = "m/44'/60'/0'/0";
const MNEMONIC = process.env.MNEMONIC || '';
const MAINNET_FORK = process.env.MAINNET_FORK === 'true';
const TRACK_GAS = process.env.TRACK_GAS === 'true';
const BLOCK_EXPLORER_KEY = process.env.BLOCK_EXPLORER_KEY || '';

const getCommonNetworkConfig = (networkName: eNetwork, networkId: number) => ({
  url: NETWORKS_RPC_URL[networkName] ?? '',
  accounts: {
    mnemonic: MNEMONIC,
    path: MNEMONIC_PATH,
    initialIndex: 0,
    count: 20,
  },
});

const mainnetFork = MAINNET_FORK
  ? {
      blockNumber: 12012081,
      url: NETWORKS_RPC_URL['main'],
    }
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.10',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: true,
            },
          },
        },
      },
    ],
  },
  networks: {
    kovan: getCommonNetworkConfig(eEthereumNetwork.kovan, 42),
    ropsten: getCommonNetworkConfig(eEthereumNetwork.ropsten, 3),
    main: getCommonNetworkConfig(eEthereumNetwork.main, 1),
    tenderlyMain: getCommonNetworkConfig(eEthereumNetwork.tenderlyMain, 3030),
    matic: getCommonNetworkConfig(ePolygonNetwork.matic, 137),
    sandbox: getCommonNetworkConfig(ePolygonNetwork.mumbai, 80001),
    mumbai: getCommonNetworkConfig(ePolygonNetwork.mumbai, 80001),
    xdai: getCommonNetworkConfig(eXDaiNetwork.xdai, 100),
    hardhat: {
      hardfork: 'london',
      blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
      gas: DEFAULT_BLOCK_GAS_LIMIT,
      gasPrice: 8000000000,
      chainId: HARDHATEVM_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
        privateKey: secretKey,
        balance,
      })),
      forking: mainnetFork,
    },
    local: {
      url: 'http://127.0.0.1:8545/',
      accounts: {
        mnemonic: MNEMONIC,
        path: MNEMONIC_PATH,
        initialIndex: 0,
        count: 20,
      },
    },
    buildbear: {
      url: "https://backend.buildbear.io/node/vigorous-hawking-7342ed",
      accounts: [
        {
          privateKey: '53888ce3e48b676b38130a82374e6fa8c2443a4eb60a516ba5069f6e6a73f916',
          balance: '100000000000000000000000000000',
        },
        {
          privateKey: '18e4cb4376e1d0550c2d72ddec815fc0b3a25d7a3549e288c0af35749b17c993',
          balance: '100000000000000000000000000000',
        },
        {
          privateKey: '66e91a78e36f034791d1472ebdb327e69798c65380f845def39a4f37750d4303',
          balance: '100000000000000000000000000000',
        },
        {
          privateKey: 'af5a43b70582453f75ec3e2d622992080db2ad09dcbf5f08425e7f72bdaa3fae',
          balance: '100000000000000000000000000000',
        },
        {
          privateKey: '5e0f127481db3c4940182b975b1be158a0c30475f3f13018a02962dfba8045e7',
          balance: '100000000000000000000000000000',
        },
      ].map(({ privateKey }: { privateKey: string }) => privateKey),
    },
  },
  gasReporter: {
    enabled: TRACK_GAS,
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: false,
  },
  etherscan: {
    apiKey: BLOCK_EXPLORER_KEY,
  },
};

export default config;
