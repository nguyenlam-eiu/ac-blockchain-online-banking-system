import { formatUnits, parseUnits } from 'ethers';

export const USDC_DECIMALS = 6;

export const formatUSDC = (value: bigint): string => {
  return formatUnits(value, USDC_DECIMALS);
};

export const parseUSDC = (value: string): bigint => {
  return parseUnits(value, USDC_DECIMALS);
};

export const formatAddress = (address: string): string => {
  if (!address) {
    return '';
  }

  if (address.length <= 10) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTimestamp = (timestamp: bigint | number): string => {
  const timestampInSeconds =
    typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;

  if (timestampInSeconds <= 0) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(timestampInSeconds * 1000));
};

export const formatBps = (basisPoints: bigint | number): string => {
  const value =
    typeof basisPoints === 'bigint' ? Number(basisPoints) : basisPoints;

  return `${(value / 100).toFixed(2)}%`;
};
