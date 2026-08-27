// ===========================================
// SmartProperty - Accounting Service
// ===========================================

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { Lease } from '../leases/entities/lease.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Property } from '../properties/entities/property.entity';
import { hasPlatformAdminRole } from '../users/role-groups';
import { User, UserRole } from '../users/entities/user.entity';
import {
  AnalyticsGranularity,
  AnalyticsQueryDto,
  BreakdownDimension,
  BreakdownEntry,
  BreakdownQueryDto,
  KpisResponse,
  TimeseriesBucket,
} from './dto/analytics-query.dto';
import { buildPaymentRows, ExportRow } from './exporters/payment-rows';

const REPORT_TIMEZONE = 'Europe/Paris';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: MongoRepository<Payment>,
    @InjectRepository(Lease)
    private readonly leaseRepo: MongoRepository<Lease>,
    @InjectRepository(User)
    private readonly userRepo: MongoRepository<User>,
    @InjectRepository(Property)
    private readonly propertyRepo: MongoRepository<Property>,
  ) {}

  // ─── Permission helpers ─────────────────────────────────

  /**
   * Returns the agencyId that should be applied as a filter, or null when
   * super-admin requests everything. Non-admin without an agency throws 403.
   */
  private resolveAgencyId(
    user: { id: string; role: UserRole; agencyId?: string },
    agencyIdOverride?: string,
  ): string | null {
    if (hasPlatformAdminRole(user.role)) {
      return agencyIdOverride && ObjectId.isValid(agencyIdOverride)
        ? agencyIdOverride
        : null;
    }
    if (!user.agencyId) {
      throw new ForbiddenException(
        'Your account is not linked to an agency. Contact an administrator.',
      );
    }
    return user.agencyId;
  }

  /**
   * Resolve the lease IDs accessible to the user for their agency.
   * Returns null when no lease restriction applies (super-admin without override).
   * Returns [] when restricted but no leases match (empty result).
   *
   * Resolution path: Agency → Property.agencyId → Lease.propertyId.
   * This is the canonical mapping; we do not rely on Payment.agencyId since
   * legacy data stored it inconsistently.
   */
  private async resolveAccessibleLeaseIds(
    agencyId: string | null,
  ): Promise<string[] | null> {
    if (!agencyId) return null;

    // Properties belonging to this agency
    const properties = await this.propertyRepo.find({
      where: {
        $or: [
          { agencyId: new ObjectId(agencyId) },
          { agencyId: agencyId },
        ],
      } as any,
      select: ['_id'],
    });
    const propertyIds = properties.map((p) =>
      (p as { _id?: ObjectId })._id?.toHexString?.(),
    ).filter((id): id is string => !!id);

    if (propertyIds.length === 0) return [];

    // Leases pointing at those properties
    const leases = await this.leaseRepo.find({
      where: {
        $or: [
          { propertyId: { $in: propertyIds } },
          {
            propertyId: {
              $in: propertyIds
                .filter((id) => ObjectId.isValid(id))
                .map((id) => new ObjectId(id)),
            },
          },
        ],
      } as any,
      select: ['_id'],
    });
    const leaseIds = leases.map((l) =>
      (l as { _id?: ObjectId })._id?.toHexString?.(),
    ).filter((id): id is string => !!id);

    return leaseIds;
  }

  /**
   * Build the `$match` stage applied to every aggregation. Soft-deleted
   * payments are always excluded.
   */
  private async buildMatchStage(
    user: { id: string; role: UserRole; agencyId?: string },
    query: AnalyticsQueryDto,
  ): Promise<Record<string, unknown>> {
    const agencyId = this.resolveAgencyId(user, query.agencyId);
    const match: Record<string, unknown> = {
      deletedAt: { $in: [null, undefined] },
    };

    if (agencyId) {
      // Resolve through Property → Lease (Payment.agencyId is legacy/unreliable).
      const leaseIds = await this.resolveAccessibleLeaseIds(agencyId);
      if (leaseIds && leaseIds.length === 0) {
        // No leases for this agency — guarantee an empty result.
        match._id = { $exists: false };
        return match;
      }
      if (leaseIds && leaseIds.length > 0) {
        const objLeaseIds = leaseIds
          .filter((id) => ObjectId.isValid(id))
          .map((id) => new ObjectId(id));
        match.$or = [
          { leaseId: { $in: leaseIds } },
          { leaseId: { $in: objLeaseIds } },
          // Also accept payments where agencyId IS correctly set (forward-compat).
          { agencyId: new ObjectId(agencyId) },
          { agencyId: agencyId },
        ];
      }
    }

    // Date range — applied to `paidAt` when present, else `createdAt`.
    if (query.startDate || query.endDate) {
      const range: Record<string, Date> = {};
      if (query.startDate) range.$gte = new Date(query.startDate);
      if (query.endDate) range.$lte = new Date(query.endDate);
      match.$expr = {
        $and: [
          ...((match.$expr as { $and?: unknown[] })?.$and || []),
          {
            $gte: [
              { $ifNull: ['$paidAt', '$createdAt'] },
              range.$gte ?? new Date(0),
            ],
          },
          {
            $lte: [
              { $ifNull: ['$paidAt', '$createdAt'] },
              range.$lte ?? new Date(8640000000000000),
            ],
          },
        ],
      };
    }

    if (query.type?.length) {
      match.type = { $in: query.type };
    }
    if (query.method?.length) {
      match.method = { $in: query.method };
    }
    if (query.status?.length) {
      match.status = { $in: query.status };
    }

    return match;
  }

  // ─── KPI summary ────────────────────────────────────────

  async getKpis(
    user: { id: string; role: UserRole; agencyId?: string },
    query: AnalyticsQueryDto,
  ): Promise<KpisResponse> {
    const match = await this.buildMatchStage(user, query);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$currency',
          gross: { $sum: { $ifNull: ['$amount', 0] } },
          netSum: {
            $sum: {
              $subtract: [
                { $ifNull: ['$netAmount', { $ifNull: ['$amount', 0] }] },
                { $ifNull: ['$refundedAmount', 0] },
              ],
            },
          },
          fees: { $sum: { $ifNull: ['$fee', 0] } },
          refunds: { $sum: { $ifNull: ['$refundedAmount', 0] } },
          count: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', PaymentStatus.COMPLETED] }, 1, 0],
            },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.FAILED] }, 1, 0] },
          },
          completedAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', PaymentStatus.COMPLETED] },
                { $ifNull: ['$amount', 0] },
                0,
              ],
            },
          },
        },
      },
    ];

    const rows = (await this.paymentRepo
      .aggregate<{
        _id: string | null;
        gross: number;
        netSum: number;
        fees: number;
        refunds: number;
        count: number;
        completedCount: number;
        failedCount: number;
        completedAmount: number;
      }>(pipeline)
      .toArray()) as Array<{
      _id: string | null;
      gross: number;
      netSum: number;
      fees: number;
      refunds: number;
      count: number;
      completedCount: number;
      failedCount: number;
      completedAmount: number;
    }>;

    if (rows.length === 0) {
      return {
        gross: 0,
        net: 0,
        fees: 0,
        refunds: 0,
        count: 0,
        completedCount: 0,
        failedCount: 0,
        failureRate: 0,
        avgPayment: 0,
        currency: 'EUR',
      };
    }

    if (rows.length === 1) {
      const r = rows[0];
      const terminal = r.completedCount + r.failedCount;
      return {
        gross: r.gross,
        net: r.netSum,
        fees: r.fees,
        refunds: r.refunds,
        count: r.count,
        completedCount: r.completedCount,
        failedCount: r.failedCount,
        failureRate: terminal === 0 ? 0 : r.failedCount / terminal,
        avgPayment:
          r.completedCount === 0
            ? 0
            : Math.round(r.completedAmount / r.completedCount),
        currency: r._id || 'EUR',
      };
    }

    // Mixed currencies — aggregate counts but expose per-currency breakdown.
    const totals = rows.reduce(
      (acc, r) => {
        acc.count += r.count;
        acc.completedCount += r.completedCount;
        acc.failedCount += r.failedCount;
        return acc;
      },
      { count: 0, completedCount: 0, failedCount: 0 },
    );
    const terminal = totals.completedCount + totals.failedCount;

    return {
      gross: 0,
      net: 0,
      fees: 0,
      refunds: 0,
      count: totals.count,
      completedCount: totals.completedCount,
      failedCount: totals.failedCount,
      failureRate: terminal === 0 ? 0 : totals.failedCount / terminal,
      avgPayment: 0,
      currency: 'MIXED',
      byCurrency: rows.map((r) => ({
        currency: r._id || 'EUR',
        gross: r.gross,
        net: r.netSum,
        count: r.count,
      })),
    };
  }

  // ─── Time series ────────────────────────────────────────

  async getTimeseries(
    user: { id: string; role: UserRole; agencyId?: string },
    query: AnalyticsQueryDto,
  ): Promise<TimeseriesBucket[]> {
    const match = await this.buildMatchStage(user, query);
    const granularity = query.granularity ?? AnalyticsGranularity.MONTH;
    const format = this.bucketFormat(granularity);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: { $ifNull: ['$paidAt', '$createdAt'] },
              timezone: REPORT_TIMEZONE,
            },
          },
          gross: { $sum: { $ifNull: ['$amount', 0] } },
          net: {
            $sum: {
              $subtract: [
                { $ifNull: ['$netAmount', { $ifNull: ['$amount', 0] }] },
                { $ifNull: ['$refundedAmount', 0] },
              ],
            },
          },
          fees: { $sum: { $ifNull: ['$fee', 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const rows = (await this.paymentRepo
      .aggregate<{
        _id: string;
        gross: number;
        net: number;
        fees: number;
        count: number;
      }>(pipeline)
      .toArray()) as Array<{
      _id: string;
      gross: number;
      net: number;
      fees: number;
      count: number;
    }>;

    if (granularity === AnalyticsGranularity.QUARTER) {
      // _id is the start of the quarter month; reformat to "YYYY-Q#".
      return rows.map((r) => ({
        bucket: this.toQuarterLabel(r._id),
        gross: r.gross,
        net: r.net,
        fees: r.fees,
        count: r.count,
      }));
    }

    return rows.map((r) => ({
      bucket: r._id,
      gross: r.gross,
      net: r.net,
      fees: r.fees,
      count: r.count,
    }));
  }

  private bucketFormat(granularity: AnalyticsGranularity): string {
    switch (granularity) {
      case AnalyticsGranularity.DAY:
        return '%Y-%m-%d';
      case AnalyticsGranularity.WEEK:
        return '%G-W%V';
      case AnalyticsGranularity.MONTH:
        return '%Y-%m';
      case AnalyticsGranularity.QUARTER:
        // Group into the first month of each quarter via a helper transform later.
        return '%Y-%m';
      case AnalyticsGranularity.YEAR:
        return '%Y';
    }
  }

  private toQuarterLabel(yearMonth: string): string {
    // Input "YYYY-MM" → "YYYY-Q#"
    const [year, monthStr] = yearMonth.split('-');
    const month = Number.parseInt(monthStr, 10);
    const quarter = Math.ceil(month / 3);
    return `${year}-Q${quarter}`;
  }

  // ─── Breakdown ──────────────────────────────────────────

  async getBreakdown(
    user: { id: string; role: UserRole; agencyId?: string },
    query: BreakdownQueryDto,
  ): Promise<BreakdownEntry[]> {
    const match = await this.buildMatchStage(user, query);
    const dimension = query.dimension ?? BreakdownDimension.METHOD;
    const topN = query.topN ?? 10;

    const groupField = this.dimensionField(dimension);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: `$${groupField}`,
          gross: { $sum: { $ifNull: ['$amount', 0] } },
          net: {
            $sum: {
              $subtract: [
                { $ifNull: ['$netAmount', { $ifNull: ['$amount', 0] }] },
                { $ifNull: ['$refundedAmount', 0] },
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { gross: -1 as const } },
      { $limit: topN },
    ];

    const rows = (await this.paymentRepo
      .aggregate<{
        _id: string | ObjectId | null;
        gross: number;
        net: number;
        count: number;
      }>(pipeline)
      .toArray()) as Array<{
      _id: string | ObjectId | null;
      gross: number;
      net: number;
      count: number;
    }>;

    // Resolve labels for property/tenant dimensions.
    if (
      dimension === BreakdownDimension.PROPERTY ||
      dimension === BreakdownDimension.TENANT
    ) {
      const labels = await this.resolveLabels(dimension, rows);
      return rows.map((r) => {
        const key = this.idToString(r._id) ?? 'unknown';
        return {
          key,
          label: labels.get(key) || key,
          gross: r.gross,
          net: r.net,
          count: r.count,
        };
      });
    }

    return rows.map((r) => {
      const key = (r._id?.toString?.() as string) || 'unknown';
      return { key, label: key, gross: r.gross, net: r.net, count: r.count };
    });
  }

  private dimensionField(dim: BreakdownDimension): string {
    switch (dim) {
      case BreakdownDimension.METHOD:
        return 'method';
      case BreakdownDimension.TYPE:
        return 'type';
      case BreakdownDimension.PROPERTY:
        // Properties are reached through the lease.
        return 'leaseId';
      case BreakdownDimension.TENANT:
        return 'tenantId';
    }
  }

  private idToString(value: string | ObjectId | null | undefined): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof ObjectId) return value.toHexString();
    return null;
  }

  // ─── Export rows ────────────────────────────────────────

  async getExportRows(
    user: { id: string; role: UserRole; agencyId?: string },
    query: AnalyticsQueryDto,
    limit = 10000,
  ): Promise<ExportRow[]> {
    const match = await this.buildMatchStage(user, query);
    return buildPaymentRows(
      this.paymentRepo,
      this.leaseRepo,
      this.userRepo,
      match,
      { limit },
    );
  }

  private async resolveLabels(
    dimension: BreakdownDimension,
    rows: Array<{ _id: string | ObjectId | null }>,
  ): Promise<Map<string, string>> {
    const ids = rows
      .map((r) => this.idToString(r._id))
      .filter((id): id is string => !!id);
    if (ids.length === 0) return new Map();

    const objIds = ids
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (dimension === BreakdownDimension.TENANT) {
      const users = await this.userRepo.find({
        where: { _id: { $in: objIds } } as any,
      });
      const map = new Map<string, string>();
      for (const u of users) {
        const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
        map.set(
          u._id?.toHexString?.() || '',
          fullName || u.email || 'Unknown tenant',
        );
      }
      return map;
    }

    // PROPERTY — payments group by leaseId; resolve lease then property
    const leases = await this.leaseRepo.find({
      where: { _id: { $in: objIds } } as any,
    });
    const propertyIdByLease = new Map<string, string>();
    for (const l of leases) {
      const lid = (l as any)._id?.toHexString?.();
      if (lid && (l as any).propertyId) {
        propertyIdByLease.set(lid, String((l as any).propertyId));
      }
    }
    // For now, label property by leaseId tail + propertyId tail; full join to
    // the Property entity is a Phase 2 concern (used in row exports).
    const map = new Map<string, string>();
    for (const id of ids) {
      const propertyId = propertyIdByLease.get(id);
      map.set(
        id,
        propertyId ? `Property ${propertyId.slice(-6)}` : `Lease ${id.slice(-6)}`,
      );
    }
    return map;
  }
}
