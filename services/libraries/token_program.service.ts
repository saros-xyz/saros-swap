import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import BN from 'bn.js';
import { sendTransaction, distinctSigners } from './solana_web3.service';
import { SolanaService } from './solana.service';
import {
  INITIALIZE_ACCOUNT_SPAN,
  INITIALIZE_MINT_SPAN,
  TokenAccountInfo,
  TokenMintInfo,
  TokenProgramInstructionService,
  TOKEN_PROGRAM_ID
} from './token_program_instruction.service';

export class TokenProgramService {

  static async approve(
    connection: Connection,
    payerAccount: Keypair,
    ownerAccount: Keypair,
    userTokenAddress: PublicKey,
    delegateAddress: PublicKey,
    amount: BN,
  ): Promise<boolean> {
    const transaction = new Transaction();

    const approveInstruction = TokenProgramInstructionService.approve(
      ownerAccount.publicKey,
      userTokenAddress,
      delegateAddress,
      amount,
    );
    transaction.add(approveInstruction);

    transaction.feePayer = payerAccount.publicKey;
    const signers = distinctSigners([
      payerAccount,
      ownerAccount,
    ]);

    const txSign = await sendTransaction(connection, transaction, signers);
    console.log(`Delegated ${amount} token units to ${delegateAddress.toBase58()}`, '---', txSign, '\n');
    return true;
  }

  static async checkAddressType(
    connection: Connection,
    address: PublicKey,
  ): Promise<number> {
    const accountInfo = await connection.getAccountInfo(address)
    if (!accountInfo) {
      return 0;
    }
    if (accountInfo.owner.toBase58() === SystemProgram.programId.toBase58()) {
      return 1;
    }
    if (accountInfo.owner.toBase58() === TOKEN_PROGRAM_ID.toBase58()) {
      return 2;
    }
    return 255;
  }

  static async changeAuthority(
    connection: Connection,
    payerAccount: Keypair,
    authorityAccount: Keypair,
    mintAddress: PublicKey,
    authorityType: number,
    newAuthorityAddress: PublicKey | null,
  ): Promise<boolean> {
    const transaction = new Transaction();

    const changeAuthorityInstruction = TokenProgramInstructionService.changeAuthority(
      authorityAccount.publicKey,
      mintAddress,
      authorityType,
      newAuthorityAddress,
    );
    transaction.add(changeAuthorityInstruction);

    const signers = distinctSigners([
      payerAccount,
      authorityAccount,
    ]);
    transaction.feePayer = payerAccount.publicKey;

    const txSign = await sendTransaction(connection, transaction, signers);
    console.info(`Changed authority of ${mintAddress.toBase58()} to ${newAuthorityAddress ? newAuthorityAddress.toBase58() : 'NULL' }`, '---', txSign, '\n');

    return true;
  }

  static async createTokenAccount(
    connection: Connection,
    payerAccount: Keypair,
    tokenAccount: Keypair,
    ownerAddress: PublicKey,
    tokenMintAddress: PublicKey,
  ): Promise<Keypair> {
    const transaction = new Transaction();

    const lamportsToInitializeAccount = await connection.getMinimumBalanceForRentExemption(INITIALIZE_ACCOUNT_SPAN);
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payerAccount.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: lamportsToInitializeAccount,
      space: INITIALIZE_ACCOUNT_SPAN,
      programId: TOKEN_PROGRAM_ID,
    });
    transaction.add(createAccountInstruction);

    const initializeTokenAccountInstruction = TokenProgramInstructionService.initializeAccount(
      ownerAddress,
      tokenMintAddress,
      tokenAccount.publicKey,
    );
    transaction.add(initializeTokenAccountInstruction);

    transaction.feePayer = payerAccount.publicKey;
    const signers = [
      payerAccount,
      tokenAccount,
    ];

    const txSign = await sendTransaction(connection, transaction, signers);
    console.info(`Created Token Account ${tokenAccount.publicKey.toBase58()}`, '---', txSign, '\n');
    return tokenAccount;
  }

  static async createTokenMint(
    connection: Connection,
    payerAccount: Keypair,
    tokenMintAccount: Keypair,
    decimals: number,
    mintAuthorityAddress: PublicKey,
    freezeAuthorityAddress: PublicKey | null,
  ): Promise<Keypair> {
    if (await SolanaService.isAddressInUse(connection, tokenMintAccount.publicKey)) {
      console.info(`SKIPPED: Token Mint ${tokenMintAccount.publicKey.toBase58()} is already existed`, '\n');
      return tokenMintAccount;
    }

    const transaction = new Transaction();

    const lamportsToInitializeMint = await connection.getMinimumBalanceForRentExemption(INITIALIZE_MINT_SPAN);
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payerAccount.publicKey,
      newAccountPubkey: tokenMintAccount.publicKey,
      lamports: lamportsToInitializeMint,
      space: INITIALIZE_MINT_SPAN,
      programId: TOKEN_PROGRAM_ID,
    });
    transaction.add(createAccountInstruction);

    const initializeTokenMintInstruction = TokenProgramInstructionService.initializeMint(
      tokenMintAccount.publicKey,
      decimals,
      mintAuthorityAddress,
      freezeAuthorityAddress,
    );
    transaction.add(initializeTokenMintInstruction);

    const signers = [
      payerAccount,
      tokenMintAccount,
    ];

    const txSign = await sendTransaction(connection, transaction, signers);

    console.info(`Created Token Mint ${tokenMintAccount.publicKey.toBase58()}`, '---', txSign, '\n');
    return tokenMintAccount;
  }

  static async createNonFungibleTokenMint(
    connection: Connection,
    payerAccount: Keypair,
    tokenMintAccount: Keypair,
    initialOwnerAddress: PublicKey,
  ): Promise<Keypair> {
    if (await SolanaService.isAddressInUse(connection, tokenMintAccount.publicKey)) {
      console.info(`SKIPPED: Token Mint ${tokenMintAccount.publicKey.toBase58()} is already existed`, '\n');
      return tokenMintAccount;
    }

    const transaction = new Transaction();

    const lamportsToInitializeMint = await connection.getMinimumBalanceForRentExemption(INITIALIZE_MINT_SPAN);
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payerAccount.publicKey,
      newAccountPubkey: tokenMintAccount.publicKey,
      lamports: lamportsToInitializeMint,
      space: INITIALIZE_MINT_SPAN,
      programId: TOKEN_PROGRAM_ID,
    });
    transaction.add(createAccountInstruction);

    const initializeTokenMintInstruction = TokenProgramInstructionService.initializeMint(
      tokenMintAccount.publicKey,
      0,
      payerAccount.publicKey,
      null,
    )
    transaction.add(initializeTokenMintInstruction);

    const initialOwnerTokenAddress = this.findAssociatedTokenAddress(
      initialOwnerAddress,
      tokenMintAccount.publicKey,
    );
    const createATAInstruction = TokenProgramInstructionService.createAssociatedTokenAccount(
      payerAccount.publicKey,
      initialOwnerAddress,
      tokenMintAccount.publicKey,
    );
    transaction.add(createATAInstruction);

    const mintInstruction = TokenProgramInstructionService.mint(
      payerAccount.publicKey,
      tokenMintAccount.publicKey,
      initialOwnerTokenAddress,
      new BN(1),
    );
    transaction.add(mintInstruction);

    const disableMintAuthorityInstruction = TokenProgramInstructionService.changeAuthority(
      payerAccount.publicKey,
      tokenMintAccount.publicKey,
      0,
      null,
    );
    transaction.add(disableMintAuthorityInstruction);

    const signers = [
      payerAccount,
      tokenMintAccount,
    ];

    const txSign = await sendTransaction(connection, transaction, signers);
    console.info(`Created Token Mint ${tokenMintAccount.publicKey.toBase58()}`, '---', txSign, '\n');
    return tokenMintAccount;
  }

  static async createAssociatedTokenAccount(
    connection: Connection,
    payerAccount: Keypair,
    ownerAddress: PublicKey,
    tokenMintAddress: PublicKey,
  ): Promise<PublicKey> {

    const transaction = new Transaction();

    const createATAInstruction = TokenProgramInstructionService.createAssociatedTokenAccount(
      payerAccount.publicKey,
      ownerAddress,
      tokenMintAddress,
    );
    transaction.add(createATAInstruction);

    const signers = [
      payerAccount,
    ];

    const txSign = await sendTransaction(connection, transaction, signers);

    const tokenAccountAddress = this.findAssociatedTokenAddress(
      ownerAddress,
      tokenMintAddress,
    );
    console.log(`Created Associated Token Account ${tokenAccountAddress.toBase58()} for Account ${ownerAddress.toBase58()}`, '---', txSign, '\n');
    return tokenAccountAddress;
  }

  static async createAssociatedTokenAccountIfNotExists(
    connection: Connection,
    payerAccount: Keypair,
    ownerAddress: PublicKey,
    tokenMintAddress: PublicKey,
  ): Promise<PublicKey> {
    const tokenAccountAddress = this.findAssociatedTokenAddress(
      ownerAddress,
      tokenMintAddress,
    );
    if (await SolanaService.isAddressInUse(connection, tokenAccountAddress)) {
      console.log(`SKIPPED: Associated Token Account ${tokenAccountAddress.toBase58()} of Account ${ownerAddress.toBase58()} is already existed`, '\n');
      return tokenAccountAddress;
    }

    return this.createAssociatedTokenAccount(
      connection,
      payerAccount,
      ownerAddress,
      tokenAccountAddress,
    );
  }

  static findAssociatedTokenAddress(
    walletAddress: PublicKey,
    tokenMintAddress: PublicKey,
  ): PublicKey {
    return TokenProgramInstructionService.findAssociatedTokenAddress(
      walletAddress,
      tokenMintAddress,
    );
  }

  static async findRecipientTokenAddress(
    connection: Connection,
    payerAddress: PublicKey,
    recipientAddress: PublicKey,
    tokenMintAddress: PublicKey,
  ): Promise<[PublicKey, TransactionInstruction]> {
    let recipientTokenAddress: PublicKey = recipientAddress;
    let createATAInstruction: TransactionInstruction = null;
    const recepientType = await this.checkAddressType(connection, recipientAddress);
    if (recepientType === 0 || recepientType === 1) {
      const associatedTokenAccountAddress = this.findAssociatedTokenAddress(
        recipientAddress,
        tokenMintAddress,
      );
      if (await SolanaService.isAddressAvailable(connection, associatedTokenAccountAddress)) {
        createATAInstruction = TokenProgramInstructionService.createAssociatedTokenAccount(
          payerAddress,
          recipientAddress,
          tokenMintAddress,
        );
      }
      recipientTokenAddress = associatedTokenAccountAddress;
    }
    return [recipientTokenAddress, createATAInstruction];
  }

  static async getTokenAccountInfo(
    connection: Connection,
    address: PublicKey
  ): Promise<TokenAccountInfo> {
    const accountInfo = await connection.getAccountInfo(address);
    const data = TokenProgramInstructionService.decodeTokenAccountInfo(accountInfo.data);
    data.address = address;
    return data;
  }

  static async getTokenMintInfo(
    connection: Connection,
    address: PublicKey
  ): Promise<TokenMintInfo> {
    const accountInfo = await connection.getAccountInfo(address);
    const data = TokenProgramInstructionService.decodeTokenMintInfo(accountInfo.data);
    data.address = address;
    return data;
  }

  static async migrateSplTokenAccounts(
    connection: Connection,
    payerAccount: Keypair,
    userAccount: Keypair,
  ): Promise<boolean> {
    const userTokenAccountsResult = await connection.getTokenAccountsByOwner(
      userAccount.publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      },
    );
    const instructions: TransactionInstruction[] = [];
    const tokenAccountInfos: TokenAccountInfo[] = userTokenAccountsResult.value.map(tokenAccount => {
      const result = TokenProgramInstructionService.decodeTokenAccountInfo(tokenAccount.account.data);
      result.address = tokenAccount.pubkey;
      return result;
    });
    const tokenMintAddresses: PublicKey[] = tokenAccountInfos.map(account => account.mint)
      .filter((value, index, self) => {
        return self.findIndex(subValue => subValue.toBase58() === value.toBase58()) === index;
      });
    for(let i = 0; i < tokenMintAddresses.length; i++) {
      const tokenMintAddress = tokenMintAddresses[i];
      const filteredTokenAccountInfos = tokenAccountInfos.filter(accountInfo => accountInfo.mint.toBase58() === tokenMintAddress.toBase58());
      const associatedTokenAccountAddress = this.findAssociatedTokenAddress(
        userAccount.publicKey,
        tokenMintAddress,
      );
      if (!filteredTokenAccountInfos.some(accountInfo => accountInfo.address.toBase58() === associatedTokenAccountAddress.toBase58())) {
        const createATAInstruction = TokenProgramInstructionService.createAssociatedTokenAccount(
          payerAccount.publicKey,
          userAccount.publicKey,
          tokenMintAddress,
        );
        instructions.push(createATAInstruction);
      }
      for(let j = 0; j < filteredTokenAccountInfos.length; j++) {
        const tokenAccountInfo = filteredTokenAccountInfos[j];
        if (tokenAccountInfo.address.toBase58() !== associatedTokenAccountAddress.toBase58()) {
          if (tokenAccountInfo.amount.gt(new BN(0))) {
            const transferTokenInstruction = TokenProgramInstructionService.transfer(
              userAccount.publicKey,
              tokenAccountInfo.address,
              associatedTokenAccountAddress,
              tokenAccountInfo.amount,
            );
            instructions.push(transferTokenInstruction);
          }
          const closeTokenAccountInstruction = TokenProgramInstructionService.closeAccount(
            userAccount.publicKey,
            tokenAccountInfo.address,
          );
          instructions.push(closeTokenAccountInstruction);
        }
      }
    }
    if (instructions.length > 0) {
      const transaction: Transaction = new Transaction();
      transaction.instructions = instructions;
      const txSign = await sendTransaction(connection, transaction, [
        payerAccount,
        userAccount,
      ]);
      console.info(`Migrated SPL-Token accounts for ${userAccount.publicKey.toBase58()}`, '---', txSign, '\n');
      return true;
    }
    console.info('Migrated SPL-Token: Nothing to do', '\n');
    return false;
  }

  static async mint(
    connection: Connection,
    payerAccount: Keypair,
    authorityAccount: Keypair,
    tokenMintAddress: PublicKey,
    recipientAddress: PublicKey,
    amount: BN,
  ): Promise<boolean> {
    const transaction = new Transaction();

    let [recipientTokenAddress, createATAInstruction] = await this.findRecipientTokenAddress(
      connection,
      payerAccount.publicKey,
      recipientAddress,
      tokenMintAddress,
    );
    if(createATAInstruction) {
      transaction.add(createATAInstruction);
    }

    const mintInstruction = TokenProgramInstructionService.mint(
      authorityAccount.publicKey,
      tokenMintAddress,
      recipientTokenAddress,
      amount,
    );
    transaction.add(mintInstruction);

    const signers = distinctSigners([
      payerAccount,
      authorityAccount,
    ]);
    transaction.feePayer = payerAccount.publicKey;

    const txSign = await sendTransaction(connection, transaction, signers);
    console.log(`Minted ${amount} token units to ${recipientTokenAddress.toBase58()}`, '---', txSign, '\n');
    return true;
  }

  static async transfer(
    connection: Connection,
    payerAccount: Keypair,
    ownerAccount: Keypair,
    userTokenAddress: PublicKey,
    recipientAddress: PublicKey,
    amount: BN,
  ): Promise<boolean> {
    const transaction = new Transaction();

    const payerTokenAccountInfo = await this.getTokenAccountInfo(
      connection,
      userTokenAddress,
    );
    let [recipientTokenAddress, createATAInstruction] = await this.findRecipientTokenAddress(
      connection,
      payerAccount.publicKey,
      recipientAddress,
      payerTokenAccountInfo.mint,
    );
    if(createATAInstruction) {
      transaction.add(createATAInstruction);
    }

    const transferTokenInstruction = TokenProgramInstructionService.transfer(
      ownerAccount.publicKey,
      userTokenAddress,
      recipientTokenAddress,
      amount,
    );
    transaction.add(transferTokenInstruction);

    const signers = distinctSigners([
      payerAccount,
      ownerAccount,
    ]);
    transaction.feePayer = payerAccount.publicKey;

    const txSign = await sendTransaction(connection, transaction, signers);
    console.log(`Transferred ${amount} token units from ${userTokenAddress.toBase58()} to ${recipientTokenAddress.toBase58()}`, '---', txSign, '\n');

    return true;
  }

  static async freezeAccount(
    connection: Connection,
    authorityAccount: Keypair,
    accountAddress: PublicKey,
    mintAddress: PublicKey,
  ): Promise<boolean> {
    const transaction = new Transaction();

    const freezeAccountInstruction = TokenProgramInstructionService.freezeAccount(
      accountAddress,
      mintAddress,
      authorityAccount.publicKey
    );

    transaction.add(freezeAccountInstruction);

    const txSign = await sendTransaction(connection, transaction, [
      authorityAccount
    ]);
    console.log(`Freeze account ${accountAddress.toString()}`, '---', txSign, '\n');

    return true;
  }

  static async thawAccount(
    connection: Connection,
    payerAccount: Keypair,
    authorityAccount: Keypair,
    accountAddress: PublicKey,
    mintAddress: PublicKey,
  ): Promise<boolean> {
    const transaction = new Transaction();

    const thawAccountInstruction = TokenProgramInstructionService.thawAccount(
      accountAddress,
      mintAddress,
      authorityAccount.publicKey
    );

    transaction.add(thawAccountInstruction);
    transaction.feePayer = payerAccount.publicKey;

    const signers = distinctSigners([
      payerAccount,
      authorityAccount
    ]);
    transaction.feePayer = payerAccount.publicKey;

    const txSign = await sendTransaction(connection, transaction, signers);
    console.log(`Thaw account ${accountAddress.toString()}`, '---', txSign, '\n');

    return true;
  }
}