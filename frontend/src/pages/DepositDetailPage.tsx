import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarDays,
  CircleDollarSign,
  Percent,
  RefreshCw,
  Send,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  getTxExplorerUrl,
  SUPPORTED_NETWORK_NAME,
} from '../blockchain/addresses';
import {
  formatAddress,
  formatBps,
  formatTimestamp,
  formatUSDC,
} from '../blockchain/format';
import { LoadingCard } from '../components/LoadingCard';
import { PageHeader } from '../components/PageHeader';
import { StateMessage } from '../components/StateMessage';
import { useWalletContext } from '../context/WalletContext';
import { useCertificateTransfer } from '../hooks/useCertificateTransfer';
import { useDepositActions } from '../hooks/useDepositActions';
import { useDepositDetail } from '../hooks/useDepositDetail';
import { DEPOSIT_STATUS } from '../hooks/useDeposits';

const getStatusLabel = (
  status: bigint,
): string => {
  if (status === DEPOSIT_STATUS.active) {
    return 'Active';
  }
  if (status === DEPOSIT_STATUS.withdrawn) {
    return 'Withdrawn';
  }
  if (status === DEPOSIT_STATUS.manualRenewed) {
    return 'Manually Renewed';
  }
  if (status === DEPOSIT_STATUS.autoRenewed) {
    return 'Automatically Renewed';
  }
  return 'Unknown';
};

export const DepositDetailPage = () => {
  const { depositId } = useParams();
  const {
    account,
    isConnected,
    isWrongNetwork,
    isMetaMaskAvailable,
  } = useWalletContext();

  const parsedDepositId =
    depositId &&
    /^\d+$/.test(depositId) &&
    BigInt(depositId) > 0n
      ? BigInt(depositId)
      : null;

  const {
    deposit,
    owner,
    blockTimestamp,
    gracePeriod,
    isLoading,
    error,
    reloadDepositDetail,
  } = useDepositDetail(
    parsedDepositId,
  );

  const {
    activeDepositId,
    activeAction,
    transactionHash,
    error: actionError,
    isSubmitting: isActionSubmitting,
    earlyWithdraw,
    withdrawAtMaturity,
    renewDeposit,
    autoRenewDeposit,
    clearDepositActionState,
  } = useDepositActions();

  const {
    activeDepositId:
      transferDepositId,
    transactionHash:
      transferTransactionHash,
    error: transferError,
    isSubmitting:
      isTransferSubmitting,
    transferCertificate,
    clearCertificateTransferState,
  } = useCertificateTransfer();

  const [
    selectedAction,
    setSelectedAction,
  ] = useState<
    | 'early'
    | 'withdraw'
    | 'manualRenew'
    | 'autoRenew'
    | 'transfer'
    | null
  >(null);

  const [recipient, setRecipient] =
    useState('');

  const canReadBlockchain =
    isMetaMaskAvailable &&
    isConnected &&
    !isWrongNetwork;

  const isOwner =
    Boolean(
      account &&
      owner &&
      account.toLowerCase() ===
        owner.toLowerCase(),
    );

  const isActive =
    deposit?.status ===
    DEPOSIT_STATUS.active;

  const isMatured =
    Boolean(
      deposit &&
      isActive &&
      blockTimestamp !== null &&
      blockTimestamp >=
        deposit.maturityAt,
    );

  const graceDeadline =
    deposit
      ? deposit.maturityAt +
        gracePeriod
      : 0n;

  const isInsideGracePeriod =
    Boolean(
      deposit &&
      isMatured &&
      blockTimestamp !== null &&
      blockTimestamp <=
        graceDeadline,
    );

  const currentTransactionHash =
    transactionHash ||
    transferTransactionHash;

  const explorerUrl =
    getTxExplorerUrl(
      currentTransactionHash,
    );

  const isThisActionSubmitting =
    Boolean(
      deposit &&
      isActionSubmitting &&
      activeDepositId === deposit.id,
    );

  const isThisTransferSubmitting =
    Boolean(
      deposit &&
      isTransferSubmitting &&
      transferDepositId === deposit.id,
    );

  const clearInteractionState = () => {
    setSelectedAction(null);
    setRecipient('');
    clearDepositActionState();
    clearCertificateTransferState();
  };

  const handleConfirm = async () => {
    if (!deposit || !selectedAction) {
      return;
    }

    let success = false;

    if (selectedAction === 'early') {
      success =
        await earlyWithdraw(
          deposit.id,
        );
    } else if (
      selectedAction === 'withdraw'
    ) {
      success =
        await withdrawAtMaturity(
          deposit.id,
        );
    } else if (
      selectedAction === 'manualRenew'
    ) {
      success =
        await renewDeposit(
          deposit.id,
        );
    } else if (
      selectedAction === 'autoRenew'
    ) {
      success =
        await autoRenewDeposit(
          deposit.id,
        );
    } else {
      success =
        await transferCertificate(
          deposit.id,
          recipient,
        );
    }

    if (success) {
      clearInteractionState();
      await reloadDepositDetail();
    }
  };

  const confirmationText =
    selectedAction === 'early'
      ? 'Withdraw before maturity. No interest is paid and the snapshotted penalty applies.'
      : selectedAction === 'withdraw'
        ? 'Withdraw principal and available interest from this matured certificate.'
        : selectedAction ===
            'manualRenew'
          ? 'Create a new active certificate using principal plus matured interest. The old certificate remains as history.'
          : selectedAction ===
              'autoRenew'
            ? 'Trigger permissionless automatic renewal during the grace period. The new certificate is minted to the current owner.'
            : 'Transfer ownership and all rights attached to this deposit certificate to the recipient address.';

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          parsedDepositId
            ? `Deposit Certificate #${parsedDepositId.toString()}`
            : 'Deposit Certificate'
        }
        description="Review certificate ownership, financial terms, blockchain timing, and available actions."
        action={
          <Link
            to="/deposits"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deposits
          </Link>
        }
      />

      {!isMetaMaskAvailable && (
        <StateMessage
          variant="warning"
          icon={AlertTriangle}
          title="MetaMask is not available"
          description="Install MetaMask to access deposit certificate details."
        />
      )}

      {isMetaMaskAvailable &&
        !isConnected && (
          <StateMessage
            icon={UserRound}
            title="Wallet not connected"
            description="Connect MetaMask to read this certificate."
          />
        )}

      {isConnected &&
        isWrongNetwork && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unsupported network"
            description={`Switch MetaMask to ${SUPPORTED_NETWORK_NAME}.`}
          />
        )}

      {canReadBlockchain &&
        parsedDepositId === null && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Invalid certificate ID"
            description="The URL does not contain a valid positive deposit certificate ID."
          />
        )}

      {canReadBlockchain &&
        parsedDepositId !== null &&
        isLoading && (
          <LoadingCard />
        )}

      {canReadBlockchain &&
        parsedDepositId !== null &&
        !isLoading &&
        error && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unable to load certificate"
            description={error}
            action={
              <button
                type="button"
                onClick={() =>
                  void reloadDepositDetail()
                }
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
              >
                Try Again
              </button>
            }
          />
        )}

      {canReadBlockchain &&
        deposit &&
        !error && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">
                    Current Owner
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatAddress(owner)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 break-all">
                    {owner}
                  </p>
                </div>

                <div className="text-right">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {getStatusLabel(
                      deposit.status,
                    )}
                  </span>
                  <p className="mt-2 text-sm text-slate-500">
                    {isOwner
                      ? 'Owned by connected wallet'
                      : 'Read-only access'}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <CircleDollarSign className="h-4 w-4 text-slate-500" />
                  <p className="mt-2 text-sm text-slate-500">
                    Principal
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatUSDC(
                      deposit.principal,
                    )}{' '}
                    USDC
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <Percent className="h-4 w-4 text-slate-500" />
                  <p className="mt-2 text-sm text-slate-500">
                    APR Snapshot
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatBps(
                      deposit.aprBpsAtOpen,
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <ShieldAlert className="h-4 w-4 text-slate-500" />
                  <p className="mt-2 text-sm text-slate-500">
                    Penalty Snapshot
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatBps(
                      deposit.earlyWithdrawPenaltyBpsAtOpen,
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <CircleDollarSign className="h-4 w-4 text-slate-500" />
                  <p className="mt-2 text-sm text-slate-500">
                    Expected Interest
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatUSDC(
                      deposit.expectedInterest,
                    )}{' '}
                    USDC
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-medium text-slate-700">
                      Certificate Timeline
                    </p>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Opened
                      </dt>
                      <dd className="text-right font-medium text-slate-900">
                        {formatTimestamp(
                          deposit.startAt,
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Maturity
                      </dt>
                      <dd className="text-right font-medium text-slate-900">
                        {formatTimestamp(
                          deposit.maturityAt,
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Auto-renew deadline
                      </dt>
                      <dd className="text-right font-medium text-slate-900">
                        {formatTimestamp(
                          graceDeadline,
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-medium text-slate-700">
                      Blockchain State
                    </p>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Latest block time
                      </dt>
                      <dd className="text-right font-medium text-slate-900">
                        {blockTimestamp === null
                          ? 'Unavailable'
                          : formatTimestamp(
                              blockTimestamp,
                            )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Maturity state
                      </dt>
                      <dd className="text-right font-medium text-slate-900">
                        {isMatured
                          ? 'Matured'
                          : 'Not matured'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Grace period
                      </dt>
                      <dd className="text-right font-medium text-slate-900">
                        {isInsideGracePeriod
                          ? 'Available'
                          : 'Unavailable'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {(actionError ||
              transferError) && (
              <StateMessage
                variant="error"
                icon={AlertTriangle}
                title="Transaction failed"
                description={
                  actionError ||
                  transferError
                }
              />
            )}

            {currentTransactionHash &&
              !actionError &&
              !transferError && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm text-emerald-800">
                    Transaction confirmed successfully.
                  </p>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-medium text-emerald-800 underline"
                    >
                      View transaction on Etherscan
                    </a>
                  )}
                </div>
              )}

            {!isOwner && (
              <StateMessage
                icon={UserRound}
                title="Read-only certificate"
                description="The connected wallet is not the current owner. Withdrawal, manual renewal, and transfer controls are unavailable. Automatic renewal remains permissionless during the grace period."
              />
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Certificate Actions
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {isOwner &&
                  isActive &&
                  blockTimestamp !== null &&
                  !isMatured && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAction(
                          'early',
                        )
                      }
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      Early Withdraw
                    </button>
                  )}

                {isOwner &&
                  isMatured && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAction(
                            'withdraw',
                          )
                        }
                        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                      >
                        Withdraw at Maturity
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAction(
                            'manualRenew',
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Manual Renew
                      </button>
                    </>
                  )}

                {isInsideGracePeriod && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAction(
                        'autoRenew',
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Bot className="h-4 w-4" />
                    Auto Renew
                  </button>
                )}

                {isOwner && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAction(
                        'transfer',
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Send className="h-4 w-4" />
                    Transfer Certificate
                  </button>
                )}
              </div>

              {selectedAction && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">
                    {confirmationText}
                  </p>

                  {selectedAction ===
                    'transfer' && (
                    <div className="mt-4">
                      <label
                        htmlFor="certificate-recipient"
                        className="text-sm font-medium text-slate-700"
                      >
                        Recipient address
                      </label>
                      <input
                        id="certificate-recipient"
                        type="text"
                        value={recipient}
                        onChange={(event) =>
                          setRecipient(
                            event.target.value,
                          )
                        }
                        placeholder="0x..."
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      disabled={
                        isThisActionSubmitting ||
                        isThisTransferSubmitting
                      }
                      onClick={
                        clearInteractionState
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        isThisActionSubmitting ||
                        isThisTransferSubmitting
                      }
                      onClick={() =>
                        void handleConfirm()
                      }
                      className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isThisActionSubmitting
                        ? activeAction ===
                          'autoRenewDeposit'
                          ? 'Auto Renewing...'
                          : 'Processing...'
                        : isThisTransferSubmitting
                          ? 'Transferring...'
                          : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
    </div>
  );
};
