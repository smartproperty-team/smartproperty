// ===========================================
// SmartProperty - Accounting Types
// ===========================================

// Mirror of backend enums (kept local to avoid coupling with the partial payment.ts)
export enum AccountingPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

export enum AccountingPaymentType {
  RENT = 'rent',
  DEPOSIT = 'deposit',
  UTILITY = 'utility',
  LATE_FEE = 'late_fee',
  MAINTENANCE = 'maintenance',
  COMMISSION = 'commission',
  OTHER = 'other',
}

export enum AccountingPaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  DIGITAL_WALLET = 'digital_wallet',
  BNPL = 'buy_now_pay_later',
  OTHER = 'other',
}

export enum AnalyticsGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum BreakdownDimension {
  METHOD = 'method',
  TYPE = 'type',
  PROPERTY = 'property',
  TENANT = 'tenant',
}

export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  granularity?: AnalyticsGranularity;
  type?: AccountingPaymentType[];
  method?: AccountingPaymentMethod[];
  status?: AccountingPaymentStatus[];
  agencyId?: string;
}

export interface BreakdownQuery extends AnalyticsQuery {
  dimension?: BreakdownDimension;
  topN?: number;
}

export interface KpisResponse {
  gross: number;
  net: number;
  fees: number;
  refunds: number;
  count: number;
  completedCount: number;
  failedCount: number;
  failureRate: number;
  avgPayment: number;
  currency: string;
  byCurrency?: Array<{
    currency: string;
    gross: number;
    net: number;
    count: number;
  }>;
}

export interface TimeseriesBucket {
  bucket: string;
  gross: number;
  net: number;
  fees: number;
  count: number;
}

export interface BreakdownEntry {
  key: string;
  label: string;
  gross: number;
  net: number;
  count: number;
}

// Friendly label maps shared across components
export const PAYMENT_TYPE_LABELS: Record<AccountingPaymentType, string> = {
  [AccountingPaymentType.RENT]: 'Rent',
  [AccountingPaymentType.DEPOSIT]: 'Deposit',
  [AccountingPaymentType.UTILITY]: 'Utility',
  [AccountingPaymentType.LATE_FEE]: 'Late fee',
  [AccountingPaymentType.MAINTENANCE]: 'Maintenance',
  [AccountingPaymentType.COMMISSION]: 'Commission',
  [AccountingPaymentType.OTHER]: 'Other',
};

export const PAYMENT_METHOD_LABELS: Record<AccountingPaymentMethod, string> = {
  [AccountingPaymentMethod.CARD]: 'Card',
  [AccountingPaymentMethod.BANK_TRANSFER]: 'Bank transfer',
  [AccountingPaymentMethod.WALLET]: 'Wallet',
  [AccountingPaymentMethod.DIGITAL_WALLET]: 'Digital wallet',
  [AccountingPaymentMethod.BNPL]: 'Buy now, pay later',
  [AccountingPaymentMethod.OTHER]: 'Other',
};

export const PAYMENT_STATUS_LABELS: Record<AccountingPaymentStatus, string> = {
  [AccountingPaymentStatus.PENDING]: 'Pending',
  [AccountingPaymentStatus.PROCESSING]: 'Processing',
  [AccountingPaymentStatus.COMPLETED]: 'Completed',
  [AccountingPaymentStatus.FAILED]: 'Failed',
  [AccountingPaymentStatus.REFUNDED]: 'Refunded',
  [AccountingPaymentStatus.DISPUTED]: 'Disputed',
};
