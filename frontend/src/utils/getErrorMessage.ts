type ErrorWithDetails = {
  code?: string | number;
  shortMessage?: string;
  reason?: string;
  message?: string;
  info?: {
    error?: {
      code?: string | number;
      message?: string;
    };
  };
};

const includesAny = (
  value: string,
  keywords: string[],
): boolean =>
  keywords.some((keyword) =>
    value.toLowerCase().includes(keyword.toLowerCase()),
  );

export const getErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong.',
): string => {
  if (!error) {
    return fallback;
  }

  const typedError = error as ErrorWithDetails;

  const combinedMessage = [
    typedError.shortMessage,
    typedError.reason,
    typedError.message,
    typedError.info?.error?.message,
  ]
    .filter(Boolean)
    .join(' ');

  const code =
    typedError.code ??
    typedError.info?.error?.code;

  if (
    code === 4001 ||
    code === '4001' ||
    code === 'ACTION_REJECTED' ||
    includesAny(combinedMessage, [
      'user rejected',
      'user denied',
      'action_rejected',
    ])
  ) {
    return 'Transaction was rejected in MetaMask.';
  }

  if (
    includesAny(combinedMessage, [
      'insufficient funds',
      'insufficient balance',
    ])
  ) {
    return 'Insufficient balance to complete this transaction.';
  }

  if (
    includesAny(combinedMessage, [
      'insufficient allowance',
      'allowance',
    ])
  ) {
    return 'MockUSDC approval is insufficient.';
  }

  if (
    includesAny(combinedMessage, [
      'wrong network',
      'unsupported chain',
      'network changed',
    ])
  ) {
    return 'Switch MetaMask to the Sepolia network.';
  }

  if (
    includesAny(combinedMessage, [
      'execution reverted',
      'missing revert data',
      'call exception',
    ])
  ) {
    const reason =
      typedError.reason ||
      typedError.shortMessage;

    if (
      reason &&
      !includesAny(reason, [
        'execution reverted',
        'missing revert data',
      ])
    ) {
      return reason;
    }

    return 'The smart contract rejected this transaction.';
  }

  if (
    includesAny(combinedMessage, [
      'could not coalesce error',
      'failed to fetch',
      'network error',
      'timeout',
    ])
  ) {
    return 'Unable to communicate with Sepolia. Try again.';
  }

  if (
    typedError.shortMessage &&
    typedError.shortMessage.length < 180
  ) {
    return typedError.shortMessage;
  }

  if (
    typedError.reason &&
    typedError.reason.length < 180
  ) {
    return typedError.reason;
  }

  return fallback;
};
