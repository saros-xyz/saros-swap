import { PublicKey } from '@solana/web3.js';

export interface InstructionLog {
  publicKey: PublicKey
  messages: [ProgramLogCategory, string][]
  datas: string[]
  isSuccess: boolean
  return: string
  errorCode: string
  errorMessage: string
  children: InstructionLog[]
}

export enum ProgramLogCategory {
  ProgramStart = 1,
  ProgramSuccess = 2,
  ProgramFailed = 3,
  CpiCall = 4,
  ProgramMessage = 5,
  ProgramData = 6,
  ProgramReturn = 7,
  ProgramError = 8,
  Others = 0,
}

export interface SignatureTuple {
  publicKey: PublicKey
  signature: Buffer
}

export interface TransactionLog {
  txSignature: string
  instructionLogs: InstructionLog[]
  rawLogMessages: string[]
  isSuccess: boolean
  errorCode: string
  errorMessage: string
}