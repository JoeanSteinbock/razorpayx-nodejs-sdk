import {
  FundAccount,
  FundAccountBankWithContact,
  FundAccountVPAWithContact,
} from "../FundAccount";
import { GenericFields, Pageable, Response } from "../../types/generic";
import RestClient from "../../utils/RestClient";

// 定义两个接口，分别表示只有 fund_account 和只有 fund_account_id 的情况
interface WithFundAccount {
  fund_account: FundAccountBankWithContact | FundAccountVPAWithContact;
  fund_account_id?: never; // 使用 never 类型确保 fund_account_id 不在此情况中提供
}

interface WithFundAccountId {
  fund_account_id: string;
  fund_account?: never; // 使用 never 类型确保 fund_account 不在此情况中提供
}

// 使用联合类型结合 BasePayout 和上述两种情况，确保至少提供其中一个字段
export type Payout = BasePayout & (WithFundAccount | WithFundAccountId);

interface BasePayout extends Omit<GenericFields, "active"> {
  entity: "payout";
  account_number?: string;
  /** Amount in paise */
  amount: number;
  currency: "INR";
  notes?: Record<string, string>;
  fees?: number;
  tax?: number;
  status:
    | "queued"
    | "pending"
    | "rejected"
    | "processing"
    | "processed"
    | "cancelled"
    | "reversed";
  utr: string;
  mode: "UPI" | "NEFT" | "RTGS" | "IMPS" | "card";
  purpose?:
    | "refund"
    | "cashback"
    | "payout"
    | "salary"
    | "utility bill"
    | "vendor bill"
    | string;
  reference_id?: string;
  narration?: string;
  status_details?: {
    source?: string;
    reason?: string;
    description?: string;
  };
}

class RPXPayout {
  client: RestClient;

  constructor(client: RestClient) {
    this.client = client;
  }

  /**
   * Creates a payout for the given details
   * @link https://razorpay.com/docs/api/x/payouts/#create-a-payout
   */
  async create(
    payoutInfo: Pick<
      Payout,
      | "account_number"
      | "amount"
      | "currency"
      | "mode"
      | "purpose"
      | "reference_id"
      | "narration"
      | "notes"
    > &
      (
        | {
            fund_account: Pick<FundAccount, "account_type"> &
              (FundAccountBankWithContact | FundAccountVPAWithContact);
            fund_account_id?: never;
          }
        | { fund_account_id: string; fund_account?: never }
      ) & { queue_if_low_balance?: boolean }
  ): Promise<Payout> {
    return this.client.load<Payout>("/payouts", "POST", payoutInfo);
  }
  /**
   * Fetches all payout
   * @link https://razorpay.com/docs/api/x/payouts/#fetch-all-payouts
   */
  async getAll(
    accountNumber: Payout["account_number"],
    filter: Pageable &
      Partial<
        Pick<Payout, "fund_account_id" | "mode" | "reference_id" | "status">
      > & { contact_id?: string } = {}
  ): Promise<Response<Payout>> {
    return this.client.load<Response<Payout>>("/payouts", "GET", {
      account_number: accountNumber,
      ...filter,
    });
  }

  /**
   * Fetch details of a payout
   * @link https://razorpay.com/docs/api/x/payouts/#fetch-a-payout-by-id
   */
  async get(payoutId: Payout["id"]): Promise<Payout> {
    return this.client.load<Payout>(`/payouts/${payoutId}`);
  }
  /**
   * Cancels the payout for given payoutId
   * @link https://razorpay.com/docs/api/x/payouts/#cancel-a-queued-payout
   */
  async cancel(payoutId: Payout["id"]): Promise<void> {
    return this.client.load<void>(`/payouts/${payoutId}/cancel`, "POST");
  }
}

export default RPXPayout;
