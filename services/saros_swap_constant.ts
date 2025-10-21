import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

export const TRADING_FEE_NUMERATOR = new BN(2); // For LP
export const TRADING_FEE_DENOMINATOR = new BN(10000);
export const OWNER_TRADING_FEE_NUMERATOR = new BN(2); // For Protocol
export const OWNER_TRADING_FEE_DENOMINATOR = new BN(10000);
export const OWNER_WITHDRAW_FEE_NUMERATOR = new BN(0); // For Protocol
export const OWNER_WITHDRAW_FEE_DENOMINATOR = new BN(0);
export const HOST_FEE_NUMERATOR = new BN(20); // For Partner
export const HOST_FEE_DENOMINATOR = new BN(100);

// Token Metadata Program ID (Metaplex)
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// System Program ID
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// Sysvar Rent Pubkey
export const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');
