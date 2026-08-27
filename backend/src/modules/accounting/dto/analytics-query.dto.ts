// ===========================================
// SmartProperty - Accounting Analytics DTOs
// ===========================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../../payments/entities/payment.entity';

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

/**
 * Used as a base for all accounting queries. Date strings must be ISO 8601.
 */
export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: AnalyticsGranularity, default: 'month' })
  @IsOptional()
  @IsEnum(AnalyticsGranularity)
  granularity?: AnalyticsGranularity = AnalyticsGranularity.MONTH;

  @ApiPropertyOptional({ enum: PaymentType, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsArray()
  @IsEnum(PaymentType, { each: true })
  type?: PaymentType[];

  @ApiPropertyOptional({ enum: PaymentMethod, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  method?: PaymentMethod[];

  @ApiPropertyOptional({ enum: PaymentStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsArray()
  @IsEnum(PaymentStatus, { each: true })
  status?: PaymentStatus[];

  /**
   * Super-admin only. Restricts the query to a specific agency. Validated as
   * an ObjectId; non-admins are forced to their own agency.
   */
  @ApiPropertyOptional({ example: '64f1d8c0e0a2b3c4d5e6f7a8' })
  @IsOptional()
  @IsMongoId()
  agencyId?: string;
}

export class BreakdownQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: BreakdownDimension, default: 'method' })
  @IsOptional()
  @IsEnum(BreakdownDimension)
  dimension?: BreakdownDimension = BreakdownDimension.METHOD;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  topN?: number = 10;
}

// ─── Response shapes ─────────────────────────────────────

export interface KpisResponse {
  /** Sum of `amount` over matched payments (in storage units — millimes for TND, cents for EUR). */
  gross: number;
  /** Sum of `netAmount` (or `amount` when missing) minus `refundedAmount`. */
  net: number;
  /** Sum of `fee` over matched payments. */
  fees: number;
  /** Sum of `refundedAmount`. */
  refunds: number;
  /** Total payment count regardless of status. */
  count: number;
  /** Subset count where status = COMPLETED. */
  completedCount: number;
  /** Subset count where status = FAILED. */
  failedCount: number;
  /** failedCount / (failedCount + completedCount) — 0 when no terminal payments. */
  failureRate: number;
  /** Mean of `amount` over completed payments only (0 if none). */
  avgPayment: number;
  /** Currency code of the matched payments. If multiple currencies are present, this is "MIXED". */
  currency: string;
  /**
   * Per-currency breakdown when multiple currencies are present. Empty otherwise.
   */
  byCurrency?: Array<{
    currency: string;
    gross: number;
    net: number;
    count: number;
  }>;
}

export interface TimeseriesBucket {
  /** ISO bucket label, e.g. "2026-05" or "2026-Q2". */
  bucket: string;
  gross: number;
  net: number;
  fees: number;
  count: number;
}

export interface BreakdownEntry {
  /** Raw key (e.g. ObjectId for property/tenant, enum value for method/type). */
  key: string;
  /** Human-friendly label. */
  label: string;
  gross: number;
  net: number;
  count: number;
}
