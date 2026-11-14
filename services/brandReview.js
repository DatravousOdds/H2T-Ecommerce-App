"use strict";

// Admin review rules for Upcoming Brand applications, kept free of Firestore
// (same split as shipstationTracking.js's planTrackingUpdate) so they can be
// checked without a database. server.js reads/writes; this file decides.

// Every admin action, in one table: the status it must start from, the
// status it moves to, the note the owner must be given (if any), and the
// email that tells them.
const BRAND_ADMIN_ACTIONS = {
  approved: { from: 'pending_review', to: 'approved_awaiting_assets', email: 'BRAND_APPROVED' },
  rejected: { from: 'pending_review', to: 'rejected', email: 'BRAND_REJECTED',
    notesRequired: 'Add a note explaining why the application was rejected.' },
  publish: { from: 'assets_submitted', to: 'published', email: 'BRAND_PUBLISHED' },
  request_changes: { from: 'assets_submitted', to: 'approved_awaiting_assets', email: 'BRAND_CHANGES_REQUESTED',
    notesRequired: 'Add a note telling the owner what to change.' },
  // Visibility toggles. The owner's status page shows the change; no email.
  unpublish: { from: 'published', to: 'unpublished', email: null },
  republish: { from: 'unpublished', to: 'published', email: null },
};

// The action for a decision string, or null. hasOwn so a value like
// "toString" can't match something on Object.prototype.
function getBrandAction(decision) {
  return Object.hasOwn(BRAND_ADMIN_ACTIONS, decision) ? BRAND_ADMIN_ACTIONS[decision] : null;
}

// What an admin action does to an application: { conflict } if it's in the
// wrong status, otherwise { update } -- the fields to write. decidedAt is
// passed in (not created here) so the caller can reuse it in the email.
function planBrandAction(application, decision, { reviewerNotes, decidedAt, adminUid }) {
  const action = getBrandAction(decision);
  if (application.status !== action.from) {
    return { conflict: `This application changed since you loaded it (status: ${application.status}). Refresh to see the latest.` };
  }

  const update = { status: action.to, reviewedAt: decidedAt, reviewedByUserId: adminUid };
  // Actions that email the owner replace the note; the toggles keep the last one
  if (action.email) update.reviewerNotes = reviewerNotes || null;
  if (decision === 'rejected') update.rejectedAt = decidedAt;
  // First publish only, so pausing and republishing doesn't make a brand "New" again
  if (action.to === 'published' && !application.publishedAt) update.publishedAt = decidedAt;
  if (decision === 'unpublish') update.unpublishedAt = decidedAt;

  return { update };
}

module.exports = { BRAND_ADMIN_ACTIONS, getBrandAction, planBrandAction };

// Self-check: node services/brandReview.js
if (require.main === module) {
  const assert = require('assert');
  const ctx = { reviewerNotes: 'note', decidedAt: 'T2', adminUid: 'admin1' };

  // Wrong starting status is a conflict, never a write
  assert.ok(planBrandAction({ status: 'published' }, 'approved', ctx).conflict);
  assert.ok(planBrandAction({ status: 'pending_review' }, 'publish', ctx).conflict);

  // Reject records when, so the reapply cooldown can be computed
  const rejected = planBrandAction({ status: 'pending_review' }, 'rejected', ctx).update;
  assert.deepStrictEqual([rejected.status, rejected.rejectedAt, rejected.reviewerNotes], ['rejected', 'T2', 'note']);

  // First publish sets publishedAt (starts the "New" badge)
  const first = planBrandAction({ status: 'assets_submitted' }, 'publish', ctx).update;
  assert.deepStrictEqual([first.status, first.publishedAt], ['published', 'T2']);

  // Republish keeps the original publishedAt and the last note
  const again = planBrandAction({ status: 'unpublished', publishedAt: 'T1' }, 'republish', ctx).update;
  assert.strictEqual(again.status, 'published');
  assert.ok(!('publishedAt' in again) && !('reviewerNotes' in again));

  // Request changes sends the owner back to uploading, with the note
  const changes = planBrandAction({ status: 'assets_submitted' }, 'request_changes', ctx).update;
  assert.deepStrictEqual([changes.status, changes.reviewerNotes], ['approved_awaiting_assets', 'note']);

  // Unpublish records when, and leaves the note alone
  const paused = planBrandAction({ status: 'published', publishedAt: 'T1' }, 'unpublish', ctx).update;
  assert.deepStrictEqual([paused.status, paused.unpublishedAt, 'reviewerNotes' in paused], ['unpublished', 'T2', false]);

  // Only real actions are accepted
  assert.strictEqual(getBrandAction('toString'), null);
  assert.strictEqual(getBrandAction('delete'), null);

  console.log('brandReview self-check passed');
}
