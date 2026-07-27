import { useCallback, useEffect, useState } from 'react';
import { Interface, formatUnits, type Log } from 'ethers';

import {
  CONTRACT_ABIS,
} from '../blockchain/contracts';
import {
  CONTRACT_ADDRESSES,
} from '../blockchain/addresses';
import { useWalletContext } from '../context/WalletContext';

export type AdminActivity = {
  id: string;
  timestamp: bigint;
  action: string;
  actor: string;
  detail: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
};

const vaultInterface = new Interface(
  CONTRACT_ABIS.vaultManager,
);
const savingCoreInterface = new Interface(
  CONTRACT_ABIS.savingCore,
);

const parseLog = (
  log: Log,
): AdminActivity | null => {
  const candidates = [
    vaultInterface,
    savingCoreInterface,
  ];

  for (const contractInterface of candidates) {
    try {
      const parsed = contractInterface.parseLog(log);

      if (!parsed) {
        continue;
      }

      const timestamp = BigInt(
        parsed.args.timestamp,
      );
      const actor = String(
        parsed.args.actor,
      );

      let action = parsed.name;
      let detail = '';

      if (parsed.name === 'PlanCreated') {
        action = 'Create plan';
        detail = `Plan #${parsed.args.planId.toString()} · APR ${parsed.args.aprBps.toString()} BPS`;
      } else if (parsed.name === 'PlanUpdated') {
        action = 'Update plan';
        detail = `Plan #${parsed.args.planId.toString()} · ${parsed.args.previousAprBps.toString()} → ${parsed.args.newAprBps.toString()} BPS`;
      } else if (parsed.name === 'PlanStatusChanged') {
        action = parsed.args.enabled
          ? 'Enable plan'
          : 'Disable plan';
        detail = `Plan #${parsed.args.planId.toString()}`;
      } else if (parsed.name === 'VaultFunded') {
        action = 'Fund vault';
        detail = `${formatUnits(parsed.args.amount, 6)} USDC`;
      } else if (parsed.name === 'VaultWithdrawn') {
        action = 'Withdraw vault';
        detail = `${formatUnits(parsed.args.amount, 6)} USDC`;
      } else if (parsed.name === 'FeeReceiverSet') {
        action = 'Change fee receiver';
        detail = `${String(parsed.args.previousFeeReceiver)} → ${String(parsed.args.newFeeReceiver)}`;
      } else if (parsed.name === 'SystemPaused') {
        action = 'Pause system';
        detail = 'System paused';
      } else if (parsed.name === 'SystemUnpaused') {
        action = 'Unpause system';
        detail = 'System active';
      } else {
        continue;
      }

      return {
        id: `${log.transactionHash}-${log.index}`,
        timestamp,
        action,
        actor,
        detail,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.index,
      };
    } catch {
      // Try the next interface.
    }
  }

  return null;
};

export const useAdminActivity = () => {
  const { provider, isConnected, isWrongNetwork } =
    useWalletContext();
  const [activities, setActivities] = useState<
    AdminActivity[]
  >([]);
  const [isLoading, setIsLoading] =
    useState(false);
  const [error, setError] = useState('');

  const reloadAdminActivity = useCallback(
    async () => {
      if (
        !provider ||
        !isConnected ||
        isWrongNetwork
      ) {
        setActivities([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const latestBlock =
          await provider.getBlockNumber();
        const fromBlock = Math.max(
          0,
          latestBlock - 10_000,
        );

        const [vaultLogs, savingCoreLogs] =
          await Promise.all([
            provider.getLogs({
              address:
                CONTRACT_ADDRESSES.vaultManager,
              fromBlock,
              toBlock: latestBlock,
            }),
            provider.getLogs({
              address:
                CONTRACT_ADDRESSES.savingCore,
              fromBlock,
              toBlock: latestBlock,
            }),
          ]);

        const parsedActivities = [
          ...vaultLogs,
          ...savingCoreLogs,
        ]
          .map(parseLog)
          .filter(
            (
              activity,
            ): activity is AdminActivity =>
              activity !== null,
          )
          .sort((left, right) => {
            if (
              left.blockNumber !==
              right.blockNumber
            ) {
              return (
                right.blockNumber -
                left.blockNumber
              );
            }

            return (
              right.logIndex - left.logIndex
            );
          });

        setActivities(parsedActivities);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load admin activity.',
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      provider,
      isConnected,
      isWrongNetwork,
    ],
  );

  useEffect(() => {
    void reloadAdminActivity();
  }, [reloadAdminActivity]);

  return {
    activities,
    isLoading,
    error,
    reloadAdminActivity,
  };
};
