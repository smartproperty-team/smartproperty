// ===========================================
// SmartProperty - Payment Rows (for exports)
// ===========================================
//
// Builds a flat row representation of payments, joining lease/property/user,
// for both CSV and XLSX exporters. Amounts are returned in MAJOR units
// (e.g. EUR not cents, TND not millimes) for direct use in accounting tools.

import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { Lease } from '../../leases/entities/lease.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { User } from '../../users/entities/user.entity';
import {
  toMajorUnits,
} from './currency-utils';

export interface ExportRow {
  id: string;
  paidAt: Date | null;
  createdAt: Date | null;
  type: string;
  method: string;
  status: string;
  currency: string;
  tenantName: string;
  propertyTitle: string;
  /** Amount in MAJOR units (e.g. 150.50 EUR, not 15050 cents). */
  amount: number;
  /** Fee in MAJOR units. */
  fee: number;
  /** Net (amount - fee - refunded) in MAJOR units. */
  netAmount: number;
  /** Refunded amount in MAJOR units. */
  refundedAmount: number;
  stripePaymentIntentId: string;
  description: string;
}

export async function buildPaymentRows(
  paymentRepo: MongoRepository<Payment>,
  leaseRepo: MongoRepository<Lease>,
  userRepo: MongoRepository<User>,
  filter: Record<string, unknown>,
  options: { limit?: number } = {},
): Promise<ExportRow[]> {
  const limit = options.limit ?? 10000;
  const payments = await paymentRepo.find({
    where: filter as any,
    take: limit,
    order: { paidAt: 'DESC' as const, createdAt: 'DESC' as const },
  });

  if (payments.length === 0) return [];

  // Collect related ids
  const leaseIds = new Set<string>();
  const tenantIds = new Set<string>();
  for (const p of payments) {
    if (p.leaseId) leaseIds.add(String(p.leaseId));
    if (p.tenantId) tenantIds.add(String(p.tenantId));
  }

  const leaseObjIds = Array.from(leaseIds)
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const tenantObjIds = Array.from(tenantIds)
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const [leases, tenants] = await Promise.all([
    leaseObjIds.length
      ? leaseRepo.find({ where: { _id: { $in: leaseObjIds } } as any })
      : Promise.resolve([] as Lease[]),
    tenantObjIds.length
      ? userRepo.find({ where: { _id: { $in: tenantObjIds } } as any })
      : Promise.resolve([] as User[]),
  ]);

  const leaseById = new Map<string, Lease>();
  const propertyIdByLease = new Map<string, string>();
  for (const l of leases) {
    const lid = (l as { _id?: ObjectId })._id?.toHexString?.();
    if (lid) {
      leaseById.set(lid, l);
      if ((l as { propertyId?: string }).propertyId) {
        propertyIdByLease.set(lid, String((l as { propertyId?: string }).propertyId));
      }
    }
  }

  const tenantById = new Map<string, User>();
  for (const u of tenants) {
    const uid = (u as { _id?: ObjectId })._id?.toHexString?.();
    if (uid) tenantById.set(uid, u);
  }

  return payments.map((p) => {
    const currency = (p.currency || 'EUR').toUpperCase();
    const leaseIdStr = p.leaseId ? String(p.leaseId) : '';
    const tenantIdStr = p.tenantId ? String(p.tenantId) : '';

    const tenant = tenantById.get(tenantIdStr);
    const tenantName = tenant
      ? `${tenant.firstName ?? ''} ${tenant.lastName ?? ''}`.trim() ||
        tenant.email ||
        'Unknown'
      : 'Unknown';

    const propertyId = propertyIdByLease.get(leaseIdStr);
    const propertyTitle = propertyId
      ? `Property ${propertyId.slice(-6)}`
      : 'Unknown property';

    const amountRaw = p.amount ?? 0;
    const feeRaw = p.fee ?? 0;
    const refundedRaw = p.refundedAmount ?? 0;
    const netRaw = (p.netAmount ?? amountRaw) - refundedRaw;

    return {
      id: p._id?.toHexString?.() || (p.id ?? ''),
      paidAt: p.paidAt ?? null,
      createdAt: p.createdAt ?? null,
      type: p.type,
      method: p.method,
      status: p.status,
      currency,
      tenantName,
      propertyTitle,
      amount: toMajorUnits(amountRaw, currency),
      fee: toMajorUnits(feeRaw, currency),
      netAmount: toMajorUnits(netRaw, currency),
      refundedAmount: toMajorUnits(refundedRaw, currency),
      stripePaymentIntentId: p.stripePaymentIntentId ?? '',
      description: p.description ?? '',
    };
  });
}
