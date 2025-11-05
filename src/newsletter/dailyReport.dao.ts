import {
  V2exerSolanaAddressRow,
  V2exerSolanaAddressRemovedRow,
  V2exerSolanaAddressDetailRow,
  V2exHodlRow,
} from "../types";

export const DailyReportDAO = {
  /**
   * Get latest-day rows from v2exer_solana_address using checked_at
   */
  async getLatestSolanaAddresses(env: Env): Promise<V2exerSolanaAddressRow[]> {
    const sql = `
      WITH max_day AS (
        SELECT MAX(DATE(checked_at, 'localtime')) AS d FROM v2exer_solana_address WHERE checked_at IS NOT NULL
      )
      SELECT *
      FROM v2exer_solana_address
      WHERE DATE(checked_at, 'localtime') = (SELECT d FROM max_day)
      ORDER BY (hold_rank IS NULL) ASC, hold_rank ASC, hold_amount DESC, owner_address ASC
    `;
    const { results } = await env.DB.prepare(sql).all<V2exerSolanaAddressRow>();
    return results ?? [];
  },

  /**
   * Get latest-day rows from v2exer_solana_address_removed using removed_at
   */
  async getLatestRemovedAddresses(env: Env): Promise<V2exerSolanaAddressRemovedRow[]> {
    const sql = `
      WITH max_day AS (
        SELECT MAX(DATE(removed_at, 'localtime')) AS d FROM v2exer_solana_address_removed WHERE removed_at IS NOT NULL
      )
      SELECT *
      FROM v2exer_solana_address_removed
      WHERE DATE(removed_at, 'localtime') = (SELECT d FROM max_day)
      ORDER BY (hold_rank IS NULL) ASC, hold_rank ASC, hold_amount DESC, owner_address ASC
    `;
    const { results } = await env.DB.prepare(sql).all<V2exerSolanaAddressRemovedRow>();
    return results ?? [];
  },

  /**
   * Get latest-day rows from v2exer_solana_address_detail using changed_at
   */
  async getLatestAddressDetails(env: Env): Promise<V2exerSolanaAddressDetailRow[]> {
    const sql = `
      WITH max_day AS (
        SELECT MAX(DATE(changed_at, 'localtime')) AS d FROM v2exer_solana_address_detail WHERE changed_at IS NOT NULL
      )
      SELECT *
      FROM v2exer_solana_address_detail
      WHERE DATE(changed_at, 'localtime') = (SELECT d FROM max_day)
      ORDER BY changed_at DESC, owner_address ASC
    `;
    const { results } = await env.DB.prepare(sql).all<V2exerSolanaAddressDetailRow>();
    return results ?? [];
  },

  /**
   * Get latest-day rows from v2ex_hodl using created_at
   */
  async getLatestHodl(env: Env): Promise<V2exHodlRow[]> {
    const sql = `
      WITH max_day AS (
        SELECT MAX(DATE(created_at, 'localtime')) AS d FROM v2ex_hodl WHERE created_at IS NOT NULL
      )
      SELECT *
      FROM v2ex_hodl
      WHERE DATE(created_at, 'localtime') = (SELECT d FROM max_day)
      ORDER BY created_at DESC
    `;
    const { results } = await env.DB.prepare(sql).all<V2exHodlRow>();
    return results ?? [];
  },
};
