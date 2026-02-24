// ---------------------------------------------------------------------------
// SolanaTransactionBuilder — Converts domain Intents → Solana transactions.
// This is the boundary between chain-agnostic logic and Solana-specific code.
// ---------------------------------------------------------------------------

import {
  Transaction,
  SystemProgram,
  PublicKey,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import { swap, setPayerFromBytes } from '@orca-so/whirlpools';
import { address } from '@solana/kit';
import type {
  Intent,
  TransferIntent,
  SwapIntent,
  CreateMintIntent,
  MintTokenIntent,
} from "../../core/intents/Intent.js";
import type { ChainTransaction } from "../../core/types/ChainTransaction.js";
import type { ILogger } from "../../core/interfaces/ILogger.js";
import {
  isTransferIntent,
  isSwapIntent,
  isCreateMintIntent,
  isMintTokenIntent,
} from "../../core/intents/Intent.js";
import { ExecutionError } from "../../core/errors/ExecutionError.js";
import { SolanaClient } from "./SolanaClient.js";

export class SolanaTransactionBuilder {
  private readonly client: SolanaClient;
  private readonly logger: ILogger;
  private readonly getPublicKey: (walletId: string) => string;
  private readonly getSecretKey?: (walletId: string) => Promise<Uint8Array>;

  constructor(
    client: SolanaClient,
    logger: ILogger,
    getPublicKey: (walletId: string) => string,
    getSecretKey?: (walletId: string) => Promise<Uint8Array>,
  ) {
    this.client = client;
    this.logger = logger;
    this.getPublicKey = getPublicKey;
    this.getSecretKey = getSecretKey;
  }

  /**
   * Build a Solana transaction from a domain intent.
   */
  async build(intent: Intent): Promise<ChainTransaction> {
    if (isTransferIntent(intent)) {
      return this.buildTransfer(intent);
    }
    if (isSwapIntent(intent)) {
      return this.buildSwap(intent);
    }
    if (isCreateMintIntent(intent)) {
      return this.buildCreateMint(intent);
    }
    if (isMintTokenIntent(intent)) {
      return this.buildMintToken(intent);
    }
    throw new ExecutionError("build", `Unsupported intent type: ${(intent as Intent).type}`);
  }

  /**
   * Build a native SOL or SPL token transfer transaction.
   */
  private async buildTransfer(intent: TransferIntent): Promise<ChainTransaction> {
    const fromPubkey = new PublicKey(this.getPublicKey(intent.fromWalletId));
    const toPubkey = new PublicKey(intent.to);
    const transaction = new Transaction();

    let programIds: string[];

    if (intent.tokenMint) {
      // SPL Token transfer
      const mintPubkey = new PublicKey(intent.tokenMint);
      const fromAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
      const toAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);

      transaction.add(
        createTransferInstruction(
          fromAta,
          toAta,
          fromPubkey,
          Number(intent.amount),
        ),
      );
      programIds = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"];
    } else {
      // Native SOL transfer
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: Number(intent.amount),
        }),
      );
      programIds = ["11111111111111111111111111111111"];
    }

    // Set recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } =
      await this.client.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = fromPubkey;

    this.logger.debug("Transfer transaction built", {
      intentId: intent.id,
      from: fromPubkey.toBase58(),
      to: intent.to,
      amount: intent.amount.toString(),
      isToken: !!intent.tokenMint,
    });

    return {
      chain: "solana",
      payload: transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }),
      programIds,
    };
  }

  private async buildSwap(intent: SwapIntent): Promise<ChainTransaction> {
    if (!this.getSecretKey) {
      throw new ExecutionError("build", "getSecretKey callback is required for Orca swaps");
    }

    const secretKey = await this.getSecretKey(intent.fromWalletId);
    await setPayerFromBytes(new Uint8Array(secretKey));

    const poolAddressStr = intent.poolAddress;
    const whirlpoolAddress = address(poolAddressStr);
    const mintAddress = address(intent.tokenInMint);
    const inputAmount = intent.amountIn;

    this.logger.info("Requesting Orca swap quote", {
      intentId: intent.id,
      pool: poolAddressStr,
      mint: intent.tokenInMint,
      inputAmount: inputAmount.toString(),
    });

    const { instructions, quote, callback: sendTx } = await swap(
      { inputAmount, mint: mintAddress },
      whirlpoolAddress,
      100 // default slippage in bips
    );

    this.logger.info("Orca swap quote received", {
      intentId: intent.id,
      tokenEstOut: quote.tokenEstOut.toString(),
      numInstructions: instructions.length,
    });

    const fromPubkey = new PublicKey(this.getPublicKey(intent.fromWalletId));
    const transaction = new Transaction();

    const { blockhash, lastValidBlockHeight } =
      await this.client.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = fromPubkey;

    return {
      chain: "solana",
      payload: transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }),
      programIds: ["whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"],
      meta: { placeholder: true, sendTx, quote },
    };
  }

  /**
   * Build a transaction to create a new SPL token mint.
   */
  private async buildCreateMint(intent: CreateMintIntent): Promise<ChainTransaction> {
    const fromPubkey = new PublicKey(this.getPublicKey(intent.fromWalletId));
    const mintKeypair = Keypair.generate();
    const transaction = new Transaction();

    const lamports = await this.client.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        intent.decimals,
        intent.mintAuthority ? new PublicKey(intent.mintAuthority) : fromPubkey,
        intent.freezeAuthority ? new PublicKey(intent.freezeAuthority) : fromPubkey,
      ),
    );

    const { blockhash, lastValidBlockHeight } = await this.client.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = fromPubkey;

    transaction.partialSign(mintKeypair);

    this.logger.info("Create mint transaction built", {
      intentId: intent.id,
      mint: mintKeypair.publicKey.toBase58(),
    });

    return {
      chain: "solana",
      payload: transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }),
      programIds: [TOKEN_PROGRAM_ID.toBase58()],
      meta: { mint: mintKeypair.publicKey.toBase58() },
    };
  }

  /**
   * Build a transaction to mint tokens to a destination.
   */
  private async buildMintToken(intent: MintTokenIntent): Promise<ChainTransaction> {
    const fromPubkey = new PublicKey(this.getPublicKey(intent.fromWalletId));
    const mintPubkey = new PublicKey(intent.mint);

    let toPubkey: PublicKey;
    try {
      toPubkey = new PublicKey(this.getPublicKey(intent.to));
    } catch {
      toPubkey = new PublicKey(intent.to);
    }

    const ata = await getAssociatedTokenAddress(mintPubkey, toPubkey);
    const transaction = new Transaction();

    const ataInfo = await this.client.connection.getAccountInfo(ata);
    if (!ataInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          ata,
          toPubkey,
          mintPubkey,
        )
      );
    }

    transaction.add(
      createMintToInstruction(
        mintPubkey,
        ata,
        fromPubkey,
        Number(intent.amount),
      ),
    );

    const { blockhash, lastValidBlockHeight } = await this.client.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = fromPubkey;

    return {
      chain: "solana",
      payload: transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }),
      programIds: [TOKEN_PROGRAM_ID.toBase58()],
    };
  }
}
