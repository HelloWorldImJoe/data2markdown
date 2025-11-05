// Generated from migrations/0004_v2exer_solana_address.sql
export interface V2exerSolanaAddressRow {
    id: number;
    owner_address: string;
    v2ex_username: string | null;
    avatar_url: string | null;
    token_address: string;
    token_account_address: string | null;
    hold_rank: number | null;
    hold_amount: number;
    decimals: number;
    rank_delta: number | null;
    hold_percentage: number;
    checked_at: string;
    amount_delta: number | null;
}

// Generated from migrations/0007_v2exer_solana_address_removed.sql
export interface V2exerSolanaAddressRemovedRow {
    id: number;
    owner_address: string;
    v2ex_username: string | null;
    avatar_url: string | null;
    token_address: string;
    token_account_address: string | null;
    hold_rank: number | null;
    hold_amount: number;
    decimals: number;
    hold_percentage: number;
    rank_delta: number | null;
    removed_at: string;
}

// Generated from migrations/0006_v2exer_solana_address_detail.sql
export interface V2exerSolanaAddressDetailRow {
    id: number;
    owner_address: string;
    token_address: string;
    token_account_address: string | null;
    v2ex_username: string | null;
    avatar_url: string | null;
    hold_rank: number | null;
    hold_amount: number;
    decimals: number;
    hold_percentage: number;
    rank_delta: number | null;
    amount_delta: number | null;
    changed_at: string;
}
