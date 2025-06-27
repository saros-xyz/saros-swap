use ahash::{ HashMap, HashMapExt };
use jupiter_amm_interface::{ Amm, AmmContext, ClockRef, KeyedAccount, QuoteParams, SwapParams };
use anchor_lang::prelude::*;
use saros_swap_rust_sdk::{ amms::spl_token_swap_amm::SplTokenSwapAmm, config::RPC_URL };
use solana_client::rpc_client::RpcClient;
use solana_sdk::{ program_pack::Pack, pubkey::Pubkey, sysvar };
use spl_token_swap::state::SwapV1;

#[tokio::main]
async fn main() {
    let client: RpcClient = RpcClient::new(RPC_URL);
    let pool = pubkey!("BxDAtLGJLRyBKQSkHgTnVfp1mXUSjJ3pqFbQoCQ31ZgN");
    let keyed_account = get_keyed_account(&client, pool).unwrap();
    let data = SwapV1::unpack(&keyed_account.account.data[1..]).unwrap();
    let token_a = get_keyed_account(&client, data.token_a).unwrap();
    let token_b = get_keyed_account(&client, data.token_b).unwrap();
    let amm_context = get_amm_context(&client).await.unwrap();

    let mut token_swap_amm = SplTokenSwapAmm::from_keyed_account(
        &keyed_account,
        &amm_context
    ).unwrap();

    let mut account_map = HashMap::new();
    account_map.insert(pool, keyed_account.account.clone());
    account_map.insert(data.token_a, token_a.account.clone());
    account_map.insert(data.token_b, token_b.account.clone());

    token_swap_amm.get_accounts_to_update();
    token_swap_amm.update(&account_map).unwrap();

    let reserve_mints = token_swap_amm.get_reserve_mints();
    let quote = token_swap_amm
        .quote(
            &(QuoteParams {
                amount: 1_000_000,
                input_mint: reserve_mints[0],
                output_mint: reserve_mints[1],
                swap_mode: jupiter_amm_interface::SwapMode::ExactIn,
            })
        )
        .unwrap();

    let _swap_and_account_metas = token_swap_amm
        .get_swap_and_account_metas(
            &(SwapParams {
                in_amount: 1_000_000,
                source_token_account: data.token_a,
                destination_token_account: data.token_b,
                token_transfer_authority: Pubkey::default(),
                swap_mode: jupiter_amm_interface::SwapMode::ExactIn,
                destination_mint: reserve_mints[1],
                source_mint: reserve_mints[0],
                jupiter_program_id: &Pubkey::default(),
                missing_dynamic_accounts_as_default: false,
                out_amount: quote.out_amount,
                quote_mint_to_referrer: None,
            })
        )
        .unwrap();
}

pub fn get_keyed_account(client: &RpcClient, key: Pubkey) -> Result<KeyedAccount> {
    let account = client.get_account(&key).unwrap();
    Ok(KeyedAccount {
        key,
        account,
        params: None,
    })
}

pub async fn get_amm_context(rpc_client: &RpcClient) -> anyhow::Result<AmmContext> {
    Ok(AmmContext {
        clock_ref: get_clock_ref(rpc_client).await?,
    })
}

pub async fn get_clock_ref(rpc_client: &RpcClient) -> anyhow::Result<ClockRef> {
    let clock = get_clock(rpc_client).await?;
    Ok(ClockRef::from(clock))
}

pub async fn get_clock(rpc_client: &RpcClient) -> anyhow::Result<Clock> {
    let clock_data = rpc_client
        .get_account_with_commitment(&sysvar::clock::ID, rpc_client.commitment())?
        .value.unwrap();

    let clock: Clock = bincode::deserialize(&clock_data.data)?;

    Ok(clock)
}
