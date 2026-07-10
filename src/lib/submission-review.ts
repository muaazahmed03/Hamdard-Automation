export type ReviewStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const APPROVED_STATUSES = new Set([
  'APPROVED',
  'COMMITTEE_APPROVED',
  'ADMIN_APPROVED',
]);

const REJECTED_STATUSES = new Set([
  'REJECTED',
  'COMMITTEE_REJECTED',
  'ADMIN_REJECTED',
]);

const TRACKABLE_FILE_TYPES = new Set([
  'PROPOSAL',
  'REPORT',
  'DOCUMENTATION',
  'FYP_I',
  'FYP_II',
  'OTHER',
]);

export function parseReviewStatusFilter(value: string | null | undefined): ReviewStatusFilter {
  const normalized = (value || 'all').toLowerCase();
  if (normalized === 'pending' || normalized === 'approved' || normalized === 'rejected') {
    return normalized;
  }
  return 'all';
}

export function isTrackableSubmissionFileType(fileType?: string | null) {
  return TRACKABLE_FILE_TYPES.has((fileType || '').toUpperCase());
}

export function matchesReviewStatus(
  status: string | null | undefined,
  filter: ReviewStatusFilter,
) {
  const normalized = (status || 'PENDING').toUpperCase();

  if (filter === 'all') {
    return true;
  }
  if (filter === 'pending') {
    return !APPROVED_STATUSES.has(normalized) && !REJECTED_STATUSES.has(normalized);
  }
  if (filter === 'approved') {
    return APPROVED_STATUSES.has(normalized);
  }
  if (filter === 'rejected') {
    return REJECTED_STATUSES.has(normalized);
  }
  return true;
}

export function isSubmissionReviewFinalized(status?: string | null) {
  const normalized = (status || '').toUpperCase();
  return APPROVED_STATUSES.has(normalized) || REJECTED_STATUSES.has(normalized);
}
