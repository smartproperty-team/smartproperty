// ===========================================
// SmartProperty - Admin Verification Review Page
// ===========================================

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldX,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '../../components/layout';
import { Alert, Button, Card, CardContent } from '../../components/ui';
import {
  FraudAnalysisPanel,
  FraudScoreBadge,
  FraudStatusPill,
} from '../../components/verification/FraudAnalysisDisplay';
import { verificationService } from '../../services/verification.service';
import {
  AdminVerificationItem,
  FraudAnalysisStatus,
  RiskLevel,
  VerificationDocument,
  VerificationStatus,
} from '../../types/verification';

// ─── Status helpers ──────────────────────────────────────
function statusConfig(status: VerificationStatus) {
  const map: Record<
    VerificationStatus,
    { label: string; color: string; bg: string; icon: React.ReactNode }
  > = {
    [VerificationStatus.NOT_SUBMITTED]: {
      label: 'Not Submitted',
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      icon: <AlertCircle className="h-4 w-4 text-gray-500" />,
    },
    [VerificationStatus.PENDING]: {
      label: 'Pending',
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      icon: <Clock className="h-4 w-4 text-yellow-500" />,
    },
    [VerificationStatus.UNDER_REVIEW]: {
      label: 'Under Review',
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      icon: <RefreshCw className="h-4 w-4 text-blue-500" />,
    },
    [VerificationStatus.VERIFIED]: {
      label: 'Verified',
      color: 'text-green-700',
      bg: 'bg-green-50',
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    },
    [VerificationStatus.REJECTED]: {
      label: 'Rejected',
      color: 'text-red-700',
      bg: 'bg-red-50',
      icon: <XCircle className="h-4 w-4 text-red-500" />,
    },
  };
  return map[status];
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getInitials(name?: string | null) {
  if (!name) return 'T';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

// ─── Document preview card ──────────────────────────────
function DocumentCard({
  doc,
  tenantName,
  onRerunAnalysis,
  onPreviewImage,
  rerunLoadingId,
}: {
  doc: VerificationDocument;
  tenantName?: string | null;
  onRerunAnalysis?: (documentId: string) => void;
  onPreviewImage?: (url: string, fileName: string) => void;
  rerunLoadingId?: string | null;
}) {
  const st = statusConfig(doc.status);
  const isRerunning = rerunLoadingId === doc.id;
  const isImage = doc.mimeType.startsWith('image/');
  const isHighRisk =
    doc.fraudAnalysis?.riskLevel === RiskLevel.HIGH;
  const cardBorder = isHighRisk
    ? 'border-red-300 ring-1 ring-red-200 bg-red-50/30'
    : 'border-gray-200 bg-white';
  return (
    <div className={`rounded-lg border p-3 transition-colors ${cardBorder}`}>
      <div className="flex items-center gap-3">
        {isImage ? (
          <button
            type="button"
            onClick={() => onPreviewImage?.(doc.url, doc.fileName)}
            className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-transform hover:scale-[1.02]"
            aria-label={`Preview ${doc.fileName}`}
            title="Click to preview"
          >
            <img
              src={doc.url}
              alt={doc.fileName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
            <FileText className="h-5 w-5 text-indigo-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {doc.fileName}
          </p>
          <p className="text-xs text-gray-500">
            {formatBytes(doc.fileSize)} •{' '}
            {doc.type === 'identity' ? 'Identity' : 'Proof of Income'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}
          >
            {st.icon}
            {st.label}
          </span>
          {doc.fraudAnalysis ? (
            <FraudScoreBadge
              score={doc.fraudAnalysis.fraudScore}
              riskLevel={doc.fraudAnalysis.riskLevel}
            />
          ) : (
            <FraudStatusPill status={doc.fraudAnalysisStatus} />
          )}
          {onRerunAnalysis && (
            <button
              type="button"
              onClick={() => onRerunAnalysis(doc.id)}
              disabled={isRerunning}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
              aria-label="Re-run fraud analysis"
              title="Re-run fraud analysis"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRerunning ? 'animate-spin' : ''}`}
              />
            </button>
          )}
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            aria-label={`View document ${doc.fileName} in a new tab`}
            title="View document"
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">Opens in a new tab</span>
          </a>
        </div>
      </div>
      {doc.fraudAnalysis && (
        <div className="mt-3">
          <FraudAnalysisPanel
            analysis={doc.fraudAnalysis}
            userProfile={{ fullName: tenantName }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Filter tabs ────────────────────────────────────────
const FILTER_TABS: { label: string; value: VerificationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: VerificationStatus.PENDING },
  { label: 'Under Review', value: VerificationStatus.UNDER_REVIEW },
  { label: 'Verified', value: VerificationStatus.VERIFIED },
  { label: 'Rejected', value: VerificationStatus.REJECTED },
];

// ─── Main page ───────────────────────────────────────────
export default function AdminVerificationPage() {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<AdminVerificationItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<VerificationStatus | 'all'>(
    'all',
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rerunLoadingId, setRerunLoadingId] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeFilter === 'all' ? undefined : activeFilter;
      const data = await verificationService.getAllVerifications(status);
      setVerifications(data);
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to load verifications.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  // Auto-refresh while any document analysis is still pending so the admin
  // sees fresh scores arrive without a manual reload.
  const hasPendingAnalysis = verifications.some((v) =>
    v.documents.some(
      (d) => d.fraudAnalysisStatus === FraudAnalysisStatus.PENDING,
    ),
  );

  useEffect(() => {
    if (!hasPendingAnalysis) return;
    const id = window.setInterval(() => {
      void fetchVerifications();
    }, 5000);
    return () => window.clearInterval(id);
  }, [hasPendingAnalysis, fetchVerifications]);

  // Close image preview on Escape key
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewImage]);

  // Sort: unreviewed and high-risk first, then by submission time descending.
  const RISK_RANK: Record<RiskLevel, number> = {
    [RiskLevel.HIGH]: 3,
    [RiskLevel.MEDIUM]: 2,
    [RiskLevel.LOW]: 1,
  };
  const filteredByRisk =
    riskFilter === 'all'
      ? verifications
      : verifications.filter((v) => v.riskLevel === riskFilter);
  const sortedVerifications = [...filteredByRisk].sort((a, b) => {
    const aActionable =
      a.overallStatus === VerificationStatus.PENDING ||
      a.overallStatus === VerificationStatus.UNDER_REVIEW
        ? 1
        : 0;
    const bActionable =
      b.overallStatus === VerificationStatus.PENDING ||
      b.overallStatus === VerificationStatus.UNDER_REVIEW
        ? 1
        : 0;
    if (aActionable !== bActionable) return bActionable - aActionable;

    const aRisk = a.riskLevel ? RISK_RANK[a.riskLevel] : 0;
    const bRisk = b.riskLevel ? RISK_RANK[b.riskLevel] : 0;
    if (aRisk !== bRisk) return bRisk - aRisk;

    const aSubmitted = a.submittedAt ? Date.parse(a.submittedAt) : 0;
    const bSubmitted = b.submittedAt ? Date.parse(b.submittedAt) : 0;
    return bSubmitted - aSubmitted;
  });

  const handleApprove = async (id: string) => {
    const shouldApprove = window.confirm(
      'Approve this verification request? This action affects tenant status.',
    );
    if (!shouldApprove) {
      return;
    }

    setActionLoading(id);
    setMessage(null);
    try {
      await verificationService.approveVerification(id);
      setMessage({ type: 'success', text: 'Verification approved!' });
      await fetchVerifications();
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to approve verification.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRerunAnalysis = async (documentId: string) => {
    setRerunLoadingId(documentId);
    setMessage(null);
    try {
      await verificationService.rerunFraudAnalysis(documentId);
      setMessage({
        type: 'success',
        text: 'Fraud analysis re-queued. Refresh in a few seconds to see results.',
      });
      // Auto-refresh after a delay so the new score appears
      setTimeout(() => {
        void fetchVerifications();
      }, 8000);
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to re-run fraud analysis.',
      });
    } finally {
      setRerunLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setActionLoading(id);
    setMessage(null);
    try {
      await verificationService.rejectVerification(id, rejectReason.trim());
      setMessage({ type: 'success', text: 'Verification rejected.' });
      setRejectingId(null);
      setRejectReason('');
      await fetchVerifications();
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to reject verification.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = verifications.filter(
    (v) =>
      v.overallStatus === VerificationStatus.PENDING ||
      v.overallStatus === VerificationStatus.UNDER_REVIEW,
  ).length;

  const highRiskCount = verifications.filter(
    (v) => v.riskLevel === RiskLevel.HIGH,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 pt-16 lg:pt-[72px]">
      <AppSidebar />
      {/* Header */}
      <header className="sticky top-16 z-40 border-b border-gray-200 bg-white shadow-md lg:top-[72px]">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:flex"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <div className="hidden h-8 w-px bg-gray-200 sm:block" />

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <Shield className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-tight text-gray-900">
                Verification Review
              </h1>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {verifications.length} total ·{' '}
                <span className="font-medium text-gray-700">
                  {pendingCount} to review
                </span>
                {highRiskCount > 0 && (
                  <span className="font-medium text-red-600">
                    {' '}
                    · {highRiskCount} high risk
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Message */}
        {message && (
          <div className="mb-6">
            <Alert
              type={message.type}
              message={message.text}
              onClose={() => setMessage(null)}
            />
          </div>
        )}

        {/* Stats row — status + AI risk distribution */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {[
            {
              label: 'Total',
              count: verifications.length,
              color: 'bg-gray-100 text-gray-700',
            },
            {
              label: 'Pending',
              count: verifications.filter(
                (v) =>
                  v.overallStatus === VerificationStatus.PENDING ||
                  v.overallStatus === VerificationStatus.UNDER_REVIEW,
              ).length,
              color: 'bg-yellow-100 text-yellow-700',
            },
            {
              label: 'Approved',
              count: verifications.filter(
                (v) => v.overallStatus === VerificationStatus.VERIFIED,
              ).length,
              color: 'bg-green-100 text-green-700',
            },
            {
              label: 'Rejected',
              count: verifications.filter(
                (v) => v.overallStatus === VerificationStatus.REJECTED,
              ).length,
              color: 'bg-red-100 text-red-700',
            },
            {
              label: 'High AI risk',
              count: verifications.filter(
                (v) => v.riskLevel === RiskLevel.HIGH,
              ).length,
              color: 'bg-red-100 text-red-700',
            },
            {
              label: 'Medium AI risk',
              count: verifications.filter(
                (v) => v.riskLevel === RiskLevel.MEDIUM,
              ).length,
              color: 'bg-yellow-100 text-yellow-700',
            },
            {
              label: 'Low AI risk',
              count: verifications.filter(
                (v) => v.riskLevel === RiskLevel.LOW,
              ).length,
              color: 'bg-green-100 text-green-700',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 bg-white p-4 text-center"
            >
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
              <p
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stat.color}`}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="mb-3 flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
            Status
          </span>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === tab.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* AI risk filter pills */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto">
          <Shield className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
            AI risk
          </span>
          {(
            [
              { label: 'All', value: 'all' as const, dot: 'bg-gray-400' },
              {
                label: 'High',
                value: RiskLevel.HIGH,
                dot: 'bg-red-500',
              },
              {
                label: 'Medium',
                value: RiskLevel.MEDIUM,
                dot: 'bg-yellow-500',
              },
              {
                label: 'Low',
                value: RiskLevel.LOW,
                dot: 'bg-green-500',
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRiskFilter(opt.value)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                riskFilter === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${opt.dot}`} aria-hidden />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="mt-4 text-gray-500">Loading verifications...</p>
          </div>
        ) : verifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Shield className="h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg font-medium text-gray-500">
                No verification requests
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {activeFilter === 'all'
                  ? 'No tenants have submitted verification requests yet.'
                  : `No ${activeFilter.replace('_', ' ')} verifications found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedVerifications.map((v) => {
              const st = statusConfig(v.overallStatus);
              const isExpanded = expandedId === v.id;
              const isActionable =
                v.overallStatus === VerificationStatus.PENDING ||
                v.overallStatus === VerificationStatus.UNDER_REVIEW;

              const isHighRiskRow = v.riskLevel === RiskLevel.HIGH;
              return (
                <Card
                  key={v.id}
                  className={`overflow-hidden transition-shadow ${
                    isHighRiskRow
                      ? 'border-red-300 ring-1 ring-red-200 shadow-sm'
                      : ''
                  }`}
                >
                  {/* Summary row */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-gray-50"
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`verification-details-${v.id}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100">
                        {v.tenantAvatar ? (
                          <img
                            src={v.tenantAvatar}
                            alt={v.tenantName || 'Tenant'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-indigo-700">
                            {getInitials(v.tenantName)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          Tenant:{' '}
                          {v.tenantName?.trim() || `${v.userId.slice(0, 8)}...`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {v.documents.length} document
                          {v.documents.length !== 1 ? 's' : ''} •{' '}
                          {v.submittedAt
                            ? `Submitted ${timeAgo(v.submittedAt)}`
                            : 'Not submitted'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {v.riskScore !== undefined && v.riskLevel && (
                        <FraudScoreBadge
                          score={v.riskScore}
                          riskLevel={v.riskLevel}
                          size="md"
                        />
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${st.bg} ${st.color}`}
                      >
                        {st.icon}
                        {st.label}
                      </span>
                      <svg
                        className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      id={`verification-details-${v.id}`}
                      className="border-t border-gray-100 bg-gray-50/50 p-5"
                    >
                      {/* Documents */}
                      <div className="mb-5">
                        <h4 className="mb-3 text-sm font-semibold text-gray-700">
                          Uploaded Documents
                        </h4>
                        {v.documents.length > 0 ? (
                          <div className="space-y-2">
                            {v.documents.map((doc) => (
                              <DocumentCard
                                key={doc.id}
                                doc={doc}
                                tenantName={v.tenantName}
                                onRerunAnalysis={handleRerunAnalysis}
                                onPreviewImage={(url, fileName) =>
                                  setPreviewImage({ url, fileName })
                                }
                                rerunLoadingId={rerunLoadingId}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No documents uploaded.
                          </p>
                        )}
                      </div>

                      {/* Timeline info */}
                      <div className="mb-5 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <span className="text-gray-500">Created:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {v.submittedAt && (
                          <div>
                            <span className="text-gray-500">Submitted:</span>{' '}
                            <span className="font-medium text-gray-900">
                              {new Date(v.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {v.verifiedAt && (
                          <div>
                            <span className="text-gray-500">Verified:</span>{' '}
                            <span className="font-medium text-gray-900">
                              {new Date(v.verifiedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rejection reason input */}
                      {rejectingId === v.id && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                          <label className="mb-2 block text-sm font-medium text-red-700">
                            Rejection Reason
                          </label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Explain why the verification was rejected..."
                            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            rows={3}
                          />
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(v.id)}
                              isLoading={actionLoading === v.id}
                              disabled={!rejectReason.trim()}
                            >
                              Confirm Rejection
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {isActionable && rejectingId !== v.id && (
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(v.id);
                            }}
                            isLoading={actionLoading === v.id}
                            className="gap-1.5"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRejectingId(v.id);
                              setRejectReason('');
                            }}
                            className="gap-1.5"
                          >
                            <ShieldX className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {/* Already decided */}
                      {v.overallStatus === VerificationStatus.VERIFIED && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          This tenant has been verified.
                        </div>
                      )}
                      {v.overallStatus === VerificationStatus.REJECTED && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <XCircle className="h-4 w-4" />
                          This verification was rejected.
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Image lightbox modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${previewImage.fileName}`}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-gray-700 transition-colors hover:bg-white"
            aria-label="Close preview"
          >
            <XCircle className="h-6 w-6" />
          </button>
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.fileName}
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
            />
            <div className="mt-3 flex items-center justify-between gap-4 text-white">
              <p className="truncate text-sm font-medium">
                {previewImage.fileName}
              </p>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
