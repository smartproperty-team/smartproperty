// ===========================================
// SmartProperty - Seed Fake Payments
// ===========================================
//
// Generates realistic fake payments for an agency's leases so you can test
// the accountant dashboard. Run from the backend folder:
//
//   node scripts/seed-fake-payments.js
//
// Flags:
//   --agency-id=<id>   Target agency (default: first agency in the DB)
//   --count=<n>        Number of payments to create (default: 120)
//   --months=<n>       Spread payments across last N months (default: 12)
//   --bootstrap        If the agency has no properties or leases, create 3 fake
//                      properties + 1 lease each (with fake tenant + owner)
//                      automatically. Without this flag the script aborts.
//   --clean            Delete existing fake data (properties/leases/payments
//                      tagged in description) before seeding
//   --dry-run          Print what would happen without inserting
//
// Reads MongoDB connection from backend/.env (same env the Nest app uses).

const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

// ─── Args ────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.replace(/^--/, ''))
    .map((a) => (a.includes('=') ? a.split('=') : [a, true])),
);
const TARGET_AGENCY_ID = args['agency-id'] || null;
const COUNT = Number(args.count || 120);
const MONTHS = Number(args.months || 12);
const BOOTSTRAP = !!args.bootstrap;
const CLEAN = !!args.clean;
const DRY_RUN = !!args['dry-run'];
const SEED_TAG = '[seed:fake-payment]';
const PROPERTY_SEED_TAG = '[seed:fake-property]';
const LEASE_SEED_TAG = '[seed:fake-lease]';
const USER_SEED_TAG_RX = /^seed-fake-/;

const PARIS_PROPERTIES = [
  { title: 'Studio Marais', city: 'Paris', street: '14 rue des Archives', zip: '75004', type: 'studio', price: 95000, bedrooms: 0, bathrooms: 1, area: 22 },
  { title: 'Appartement Bastille', city: 'Paris', street: '7 rue de Charonne', zip: '75011', type: 'apartment', price: 175000, bedrooms: 2, bathrooms: 1, area: 48 },
  { title: 'Loft Belleville', city: 'Paris', street: '23 rue Ramponeau', zip: '75020', type: 'apartment', price: 220000, bedrooms: 3, bathrooms: 2, area: 78 },
  { title: 'Maison Montmartre', city: 'Paris', street: '8 rue Lepic', zip: '75018', type: 'house', price: 380000, bedrooms: 4, bathrooms: 2, area: 110 },
];

// ─── Env loader ──────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
loadEnv();

function buildMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const user = process.env.MONGODB_USERNAME;
  const pass = process.env.MONGODB_PASSWORD;
  const db = process.env.MONGODB_DATABASE || 'smartproperty';
  const auth = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  const authSource = user ? '?authSource=admin' : '';
  return `mongodb://${auth}${host}:${port}/${db}${authSource}`;
}

// ─── Helpers ─────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickWeighted(entries) {
  // entries = [[value, weight], ...]
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[0][0];
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDateInRange(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Bootstrap helpers ───────────────────────────────────

async function bootstrapProperties(db, agency) {
  const agencyId = agency._id;
  const ownerId = await findOrCreateUser(db, {
    email: `seed-fake-owner-${String(agencyId).slice(-6)}@smartproperty.local`,
    role: 'owner',
    firstName: 'Fake',
    lastName: 'Owner',
    agencyId,
  });

  const now = new Date();
  const docs = PARIS_PROPERTIES.map((p) => ({
    _id: new ObjectId(),
    title: `${p.title} ${PROPERTY_SEED_TAG}`,
    description: `${PROPERTY_SEED_TAG} bootstrap property for accounting demo`,
    type: p.type,
    status: 'rented',
    category: 'rental',
    price: p.price * 100, // cents
    currency: 'EUR',
    address: {
      street: p.street,
      city: p.city,
      state: 'Île-de-France',
      zipCode: p.zip,
      country: 'France',
    },
    features: {
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      furnished: true,
      petFriendly: false,
      amenities: ['wifi', 'heating'],
    },
    images: [],
    ownerId: ownerId.toString(),
    managerId: null,
    agencyId: agencyId.toString(),
    createdAt: now,
    updatedAt: now,
  }));
  await db.collection('properties').insertMany(docs);
  return docs;
}

async function bootstrapLeases(db, properties, agencyId) {
  const now = new Date();
  const leases = [];
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const tenantId = await findOrCreateUser(db, {
      email: `seed-fake-tenant-${i + 1}-${String(agencyId).slice(-6)}@smartproperty.local`,
      role: 'tenant',
      firstName: 'Fake',
      lastName: `Tenant ${i + 1}`,
    });
    const ownerId = property.ownerId;
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - randomInt(6, 18));
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const lease = {
      _id: new ObjectId(),
      propertyId: property._id.toString(),
      tenantId: tenantId.toString(),
      ownerId: typeof ownerId === 'string' ? ownerId : ownerId.toString(),
      managerId: null,
      leaseNumber: `LSE-${now.getFullYear()}-${String(i + 1).padStart(5, '0')}`,
      startDate,
      endDate,
      monthlyRent: property.price,
      currency: 'EUR',
      securityDeposit: property.price * 2,
      status: 'active',
      documents: [],
      signatures: [],
      statusHistory: [],
      moveInInventory: [],
      moveOutInventory: [],
      customTerms: [],
      description: `${LEASE_SEED_TAG} for ${property.title}`,
      createdAt: now,
      updatedAt: now,
    };
    leases.push(lease);
  }
  await db.collection('leases').insertMany(leases);
  return leases;
}

async function findOrCreateUser(db, { email, role, firstName, lastName, agencyId }) {
  const existing = await db.collection('users').findOne({ email });
  if (existing) return existing._id;
  const doc = {
    _id: new ObjectId(),
    email,
    password: '$2b$10$seedfakehashplaceholder000000000000000000000000000000',
    firstName,
    lastName,
    role,
    status: 'active',
    isEmailVerified: true,
    agencyId: agencyId ? agencyId.toString() : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('users').insertOne(doc);
  return doc._id;
}

// ─── Main ────────────────────────────────────────────────
async function main() {
  const uri = buildMongoUri();
  const dbName = process.env.MONGODB_DATABASE || 'smartproperty';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`Connected to ${dbName}`);

  // 1) Resolve agency
  let agency;
  if (TARGET_AGENCY_ID && ObjectId.isValid(TARGET_AGENCY_ID)) {
    agency = await db.collection('agencies').findOne({
      _id: new ObjectId(TARGET_AGENCY_ID),
    });
  } else {
    agency = await db.collection('agencies').findOne({});
  }
  if (!agency) {
    console.error('❌ No agency found. Create an agency first.');
    process.exit(1);
  }
  const agencyId = agency._id;
  console.log(`Agency: ${agency.name || '(no name)'} (${agencyId})`);

  // 1.5) Clean previous fake data (optional) — runs BEFORE discovery so the
  // bootstrap step starts from a known empty slate.
  if (CLEAN) {
    const escSeed = SEED_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escProp = PROPERTY_SEED_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escLease = LEASE_SEED_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const pay = await db
      .collection('payments')
      .deleteMany({ description: { $regex: escSeed } });
    const lse = await db
      .collection('leases')
      .deleteMany({ description: { $regex: escLease } });
    const prop = await db
      .collection('properties')
      .deleteMany({ description: { $regex: escProp } });
    const usr = await db
      .collection('users')
      .deleteMany({ email: { $regex: USER_SEED_TAG_RX } });

    console.log(
      `Cleaned: ${pay.deletedCount} payments, ${lse.deletedCount} leases, ${prop.deletedCount} properties, ${usr.deletedCount} users`,
    );
  }

  // 2) Find properties for that agency
  let properties = await db
    .collection('properties')
    .find({
      $or: [
        { agencyId: agencyId },
        { agencyId: agencyId.toString() },
      ],
    })
    .toArray();
  console.log(`Properties owned by this agency: ${properties.length}`);

  if (properties.length === 0) {
    if (!BOOTSTRAP) {
      console.error(
        '❌ The agency has no properties. Re-run with --bootstrap to auto-create test properties + a lease for each.',
      );
      process.exit(1);
    }
    properties = await bootstrapProperties(db, agency);
    console.log(`✓ Created ${properties.length} bootstrap properties`);
  }

  // 3) Find leases for those properties
  const propertyIds = properties.flatMap((p) => [p._id, p._id.toString()]);
  let leases = await db
    .collection('leases')
    .find({ propertyId: { $in: propertyIds } })
    .toArray();
  console.log(`Leases on those properties: ${leases.length}`);

  if (leases.length === 0) {
    if (!BOOTSTRAP) {
      console.error(
        '❌ No leases found for these properties. Re-run with --bootstrap to auto-create one lease per property.',
      );
      process.exit(1);
    }
    leases = await bootstrapLeases(db, properties, agencyId);
    console.log(`✓ Created ${leases.length} bootstrap leases`);
  }

  // 4) Find tenant + owner users referenced by leases (for createdBy)
  const tenantIds = [...new Set(leases.map((l) => String(l.tenantId)))].filter(Boolean);
  const ownerIds = [...new Set(leases.map((l) => String(l.ownerId)))].filter(Boolean);
  console.log(`Unique tenants: ${tenantIds.length}, unique owners: ${ownerIds.length}`);

  // 6) Generate payments
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - MONTHS);

  const TYPES = [
    ['rent', 60],
    ['deposit', 8],
    ['utility', 12],
    ['late_fee', 6],
    ['maintenance', 8],
    ['commission', 6],
  ];
  const METHODS = [
    ['card', 65],
    ['bank_transfer', 25],
    ['wallet', 5],
    ['digital_wallet', 5],
  ];
  const STATUSES = [
    ['completed', 80],
    ['pending', 7],
    ['failed', 6],
    ['refunded', 5],
    ['processing', 2],
  ];
  // Amounts in CENTS (EUR has 2 decimals)
  const TYPE_AMOUNTS_CENTS = {
    rent: () => randomInt(60000, 250000),
    deposit: () => randomInt(80000, 400000),
    utility: () => randomInt(3000, 25000),
    late_fee: () => randomInt(2000, 15000),
    maintenance: () => randomInt(5000, 80000),
    commission: () => randomInt(10000, 50000),
  };

  const payments = [];
  for (let i = 0; i < COUNT; i++) {
    const lease = pick(leases);
    const type = pickWeighted(TYPES);
    const method = pickWeighted(METHODS);
    const status = pickWeighted(STATUSES);
    const amount = TYPE_AMOUNTS_CENTS[type]();
    // Stripe fee ~= 1.4% + €0.25 = 0.014 * amount + 25
    const fee = status === 'completed' ? Math.round(amount * 0.014 + 25) : 0;
    const refunded = status === 'refunded' ? amount : 0;
    const netAmount = amount - fee;
    const paidAt =
      status === 'completed' || status === 'refunded'
        ? randomDateInRange(start, now)
        : null;
    const createdAt = paidAt
      ? new Date(paidAt.getTime() - randomInt(0, 86400_000 * 3))
      : randomDateInRange(start, now);
    const refundedAt = status === 'refunded'
      ? new Date(paidAt.getTime() + randomInt(86400_000, 86400_000 * 20))
      : null;

    payments.push({
      _id: new ObjectId(),
      leaseId: lease._id,
      tenantId: lease.tenantId,
      ownerId: lease.ownerId,
      agencyId: agencyId,
      amount,
      currency: 'EUR',
      type,
      status,
      method,
      description: `${SEED_TAG} ${type} for lease ${String(lease._id).slice(-6)}`,
      invoiceId: `INV-${createdAt.getFullYear()}-${String(i + 1).padStart(5, '0')}`,
      stripePaymentIntentId: status === 'completed' || status === 'refunded'
        ? `pi_fake_${uid()}`
        : undefined,
      stripeCustomerId: `cus_fake_${String(lease.tenantId).slice(-8)}`,
      transactionId: status === 'completed' || status === 'refunded'
        ? `ch_fake_${uid()}`
        : undefined,
      gatewayRefId: status === 'completed' ? `pi_fake_${uid()}` : undefined,
      idempotencyKey: uid(),
      dueDate: paidAt || createdAt,
      paidAt,
      fee,
      feeType: 'gateway_fee',
      netAmount,
      failureReason: status === 'failed' ? 'card_declined' : undefined,
      failureCount: status === 'failed' ? randomInt(1, 3) : 0,
      lastFailedAt: status === 'failed' ? createdAt : undefined,
      createdBy: lease.tenantId,
      refundedAmount: refunded || undefined,
      refundedAt: refundedAt || undefined,
      refundedBy: status === 'refunded' ? lease.ownerId : undefined,
      refundReason: status === 'refunded' ? 'Tenant request' : undefined,
      createdAt,
      updatedAt: refundedAt || paidAt || createdAt,
    });
  }

  // Stats preview
  const byStatus = payments.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  const totalGrossEur = payments.reduce((s, p) => s + p.amount, 0) / 100;
  console.log(`\nGenerated ${payments.length} payments:`);
  console.log(`  By status: ${JSON.stringify(byStatus)}`);
  console.log(`  Total gross (across all statuses): €${totalGrossEur.toFixed(2)}`);
  console.log(`  Time range: ${start.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`);

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing inserted. Re-run without --dry-run to write.');
    await client.close();
    return;
  }

  await db.collection('payments').insertMany(payments);
  console.log(`\n✅ Inserted ${payments.length} payments. Open /dashboard/accounting to see them.`);

  await client.close();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
