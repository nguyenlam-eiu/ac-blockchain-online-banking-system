import { ethers } from 'hardhat';

const MOCK_USDC_ADDRESS =
  '0x7EE15D3D07a923C2B661824B76E2398DC20F9728';

const MINT_AMOUNT = ethers.parseUnits('10000', 6);

async function main() {
  const [signer] = await ethers.getSigners();

  console.log(`Minting MockUSDC to: ${signer.address}`);

  const mockUsdc = await ethers.getContractAt(
    'MockUSDC',
    MOCK_USDC_ADDRESS,
    signer,
  );

  const transaction = await mockUsdc.mint(
    signer.address,
    MINT_AMOUNT,
  );

  console.log(`Transaction submitted: ${transaction.hash}`);

  await transaction.wait();

  const balance = await mockUsdc.balanceOf(signer.address);

  console.log(
    `MockUSDC balance: ${ethers.formatUnits(balance, 6)} USDC`,
  );
}

main().catch((error) => {
  console.error('Mint failed:', error);
  process.exitCode = 1;
});
