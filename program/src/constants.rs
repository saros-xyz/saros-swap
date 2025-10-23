use solana_program::{
    pubkey,
    pubkey::Pubkey,
};

/// Default token name for pool token metadata
pub const DEFAULT_POOL_TOKEN_NAME: &str = "Saros LP Token";

/// Default token symbol for pool token metadata
pub const DEFAULT_POOL_TOKEN_SYMBOL: &str = "SRS-LP";

/// Default token URI for pool token metadata
pub const DEFAULT_POOL_TOKEN_URI: &str = "https://rapid.coin98.com/MetaData/saros_metadata.json";

// Build the create_metadata_accounts_v3 instruction for Token Metadata program
pub const CREATE_METADATA_ACCOUNTS_V3_DISCRIMINATOR: u8 = 33;

/// Token Metadata Program ID
pub const TOKEN_METADATA_PROGRAM_ID: Pubkey = pubkey!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
