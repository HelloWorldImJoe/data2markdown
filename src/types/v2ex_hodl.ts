// Generated from migrations/0001_v2ex_hodl.sql
export interface V2exHodlRow {
    id: number;
    hodl_10k_addresses_count: number;
    new_accounts_via_solana: number;
    total_solana_addresses_linked: number;
    sol_tip_operations_count: number;
    member_tips_sent: number;
    member_tips_received: number;
    total_sol_tip_amount: number;
    v2ex_token_tip_count: number;
    total_v2ex_token_tip_amount: number;
    current_online_users: number;
    peak_online_users: number;
    holders: number;
    price: number;
    price_change_24h: number;
    btc_price: number;
    sol_price: number;
    pump_price: number;
    created_at: string; // ISO timestamp
}
