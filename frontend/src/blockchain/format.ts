import { formatUnits, parseUnits } from 'ethers';

export const formatUSDC = (value: bigint): string => {
  return formatUnits(value, 6);
};

export const parseUSDC = (value: string): bigint => {
  return parseUnits(value, 6);
};
