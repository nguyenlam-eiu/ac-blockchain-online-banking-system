import { getAddress, isAddress } from "ethers";
import { useCallback, useState } from "react";

import { SUPPORTED_NETWORK_NAME } from "../blockchain/addresses";
import { getContract } from "../blockchain/contracts";
import { useWalletContext } from "../context/WalletContext";
import { getErrorMessage } from "../utils/getErrorMessage";

type TransferState = {
  activeDepositId: bigint | null;
  transactionHash: string;
  error: string;
};

const INITIAL_STATE: TransferState = {
  activeDepositId: null,
  transactionHash: "",
  error: "",
};

export const useCertificateTransfer = () => {
  const { account, signer, isConnected, isWrongNetwork } = useWalletContext();

  const [state, setState] = useState<TransferState>(INITIAL_STATE);

  const transferCertificate = useCallback(
    async (depositId: bigint, recipientInput: string): Promise<boolean> => {
      if (!account || !signer || !isConnected) {
        setState({
          ...INITIAL_STATE,
          error: "Connect MetaMask first.",
        });

        return false;
      }

      if (isWrongNetwork) {
        setState({
          ...INITIAL_STATE,
          error: `Switch MetaMask to ${SUPPORTED_NETWORK_NAME} first.`,
        });

        return false;
      }

      const recipient = recipientInput.trim();

      if (!isAddress(recipient)) {
        setState({
          ...INITIAL_STATE,
          error: "Enter a valid Ethereum recipient address.",
        });

        return false;
      }

      const normalizedRecipient = getAddress(recipient);

      if (normalizedRecipient.toLowerCase() === account.toLowerCase()) {
        setState({
          ...INITIAL_STATE,
          error: "The recipient must be different from the current owner.",
        });

        return false;
      }

      if (state.activeDepositId !== null) {
        return false;
      }

      setState({
        activeDepositId: depositId,
        transactionHash: "",
        error: "",
      });

      try {
        const savingCore = getContract("savingCore", signer);

        const currentOwner = (await savingCore.ownerOf(depositId)) as string;

        if (currentOwner.toLowerCase() !== account.toLowerCase()) {
          throw new Error("The connected wallet is not the current certificate owner.");
        }

        const transaction = await savingCore["safeTransferFrom(address,address,uint256)"](
          account,
          normalizedRecipient,
          depositId
        );

        setState((current) => ({
          ...current,
          transactionHash: transaction.hash,
        }));

        await transaction.wait();

        setState({
          activeDepositId: null,
          transactionHash: transaction.hash,
          error: "",
        });

        return true;
      } catch (error) {
        setState({
          ...INITIAL_STATE,
          error: getErrorMessage(error, "Certificate transfer failed."),
        });

        return false;
      }
    },
    [account, signer, isConnected, isWrongNetwork, state.activeDepositId]
  );

  const clearCertificateTransferState = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    isSubmitting: state.activeDepositId !== null,
    transferCertificate,
    clearCertificateTransferState,
  };
};
