import {
  V2exerSolanaAddressRow,
  V2exerSolanaAddressRemovedRow,
  V2exerSolanaAddressDetailRow,
  V2exHodlRow,
} from "../types";

export const DailyReportDAO = {
  /**
   * Get yesterday's rows from v2exer_solana_address using checked_at
   */
  async getLatestSolanaAddresses(env: Env): Promise<V2exerSolanaAddressRow[]> {
    const sql = `
      SELECT *
      FROM v2exer_solana_address
      WHERE DATE(checked_at, 'localtime') = DATE('now', '-1 day', 'localtime')
      ORDER BY (hold_rank IS NULL) ASC, hold_rank ASC, hold_amount DESC, owner_address ASC
    `;
    const { results } = await env.DB.prepare(sql).all<V2exerSolanaAddressRow>();
    return results ?? [];
  },

  /**
   * Get yesterday's rows from v2exer_solana_address_removed using removed_at
   */
  async getLatestRemovedAddresses(env: Env): Promise<V2exerSolanaAddressRemovedRow[]> {
    const sql = `
      SELECT *
      FROM v2exer_solana_address_removed
      WHERE DATE(removed_at, 'localtime') = DATE('now', '-1 day', 'localtime')
      ORDER BY (hold_rank IS NULL) ASC, hold_rank ASC, hold_amount DESC, owner_address ASC
    `;
    const { results } = await env.DB.prepare(sql).all<V2exerSolanaAddressRemovedRow>();
    return results ?? [];
  },

  /**
   * Get yesterday's rows from v2exer_solana_address_detail using changed_at
   */
  async getLatestAddressDetails(env: Env): Promise<V2exerSolanaAddressDetailRow[]> {
    const sql = `
      SELECT *
      FROM v2exer_solana_address_detail
      WHERE DATE(changed_at, 'localtime') = DATE('now', '-1 day', 'localtime')
      ORDER BY changed_at DESC, owner_address ASC
    `;
    const { results } = await env.DB.prepare(sql).all<V2exerSolanaAddressDetailRow>();
    return results ?? [];
  },

  /**
   * Get yesterday's rows from v2ex_hodl using created_at
   */
  async getLatestHodl(env: Env): Promise<V2exHodlRow[]> {
    const sql = `
      SELECT *
      FROM v2ex_hodl
      WHERE DATE(created_at, 'localtime') = DATE('now', '-1 day', 'localtime')
      ORDER BY created_at DESC
    `;
    const { results } = await env.DB.prepare(sql).all<V2exHodlRow>();
    return results ?? [];
  },
};
