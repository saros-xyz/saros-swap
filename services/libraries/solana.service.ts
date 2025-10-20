import {
  Connection,
  Keypair,
  PublicKey
} from '@solana/web3.js';
import { TransactionLog } from './interfaces';
import { LogMessageProcessor } from './log_message_processor.service';

export class SolanaService {

  static async getAccountBalance(connection: Connection, address: PublicKey) {
    const lamports = await connection.getBalance(address)
    const sols = lamports / 1000000000
    console.log(`Account ${address.toBase58()} have ${lamports} lamports (${sols} SOLs)`, '\n')
  }

  static async getMinimumBalanceForRentExemption(connection: Connection, space: number
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(space)
  }

  static async getTransactionLogMessages(
    connection: Connection,
    txSignature: string,
  ): Promise<TransactionLog> {
    const transactionResponse = await connection.getTransaction(txSignature);
    if(transactionResponse == null) {
      return null;
    }
    const rawLogMessages = transactionResponse.meta.logMessages;
    const transactionLog = this.formatLogMessages(rawLogMessages);
    transactionLog.txSignature = txSignature;
    return transactionLog;
  }

  static formatLogMessages(
    messages: string[]
  ): TransactionLog {
    const instructionLogs = LogMessageProcessor.processLogs(messages);
    let transactionLog = <TransactionLog>{
      txSignature: null,
      instructionLogs,
      rawLogMessages: messages,
      isSuccess: true,
      errorCode: null,
      errorMessage: null,
    };
    let traversingInstructions = instructionLogs;
    let currentInstructionIndex = 0;
    let currentInstruction = instructionLogs[0];
    while(currentInstruction != null) {
      if(currentInstruction.isSuccess) {
        currentInstructionIndex++;
      }
      else {
        transactionLog.isSuccess = false;
        transactionLog.errorCode = currentInstruction.errorCode;
        transactionLog.errorMessage = currentInstruction.errorMessage;
        traversingInstructions = currentInstruction.children;
        currentInstructionIndex = 0;
      }
      if(currentInstructionIndex < traversingInstructions.length) {
        currentInstruction = traversingInstructions[currentInstructionIndex];
      }
      else {
        currentInstruction = null;
      }
    }

    return transactionLog;
  }

  static async generateKeypairFromSeed(fromPublicKey: PublicKey,
    seed: string,
    programId: PublicKey
  ): Promise<Keypair> {
    const seedPubKey = await PublicKey.createWithSeed(fromPublicKey, seed, programId);
    const seedBytes = seedPubKey.toBytes()
    return Keypair.fromSeed(seedBytes)
  }

  static async isAddressAvailable(connection: Connection, address: PublicKey
  ): Promise<boolean> {
    const programInf = await connection.getAccountInfo(address)
    return programInf === null
  }

  static async isAddressInUse(connection: Connection, address: PublicKey
  ): Promise<boolean> {
    const programInf = await connection.getAccountInfo(address)
    return programInf !== null
  }

  static async isProgramAccount(connection: Connection, address: PublicKey
  ): Promise<boolean> {
    const programInf = await connection.getAccountInfo(address)
    if (programInf === null) {
      console.log(`Program ${address.toBase58()} does not exist`, '\n')
      return false
    }
    else if (!programInf.executable) {
      console.log(`Program ${address.toBase58()} is not executable`, '\n')
      return false
    }
    return true
  }
}