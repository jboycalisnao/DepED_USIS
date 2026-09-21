import type { SrcyMemberRecord } from './srcyMembershipService';
import type { SrcyDomRecord } from './srcyDomService';
import type { MemberMisTrainingItem } from '../mis/MemberMisDocument';
import { loadSrcyDomRecords } from './srcyDomService';
import { loadMemberHistory } from './srcyMembershipService';
import { loadMemberTrainings } from '../../trainings/services/srcyTrainingService';
import { getStoredSrcyAccess } from '../../auth/services/srcyAccess';

export type CachedMemberDetails = {
  memberId: string;
  domBatch: SrcyDomRecord | null;
  allDoms: SrcyDomRecord[];
  history: SrcyMemberRecord[];
  trainings: MemberMisTrainingItem[];
  cachedAt: number;
};

// In-memory cache map - scoped to the authenticated session, resets when the page is reloaded.
const memberDetailsMap = new Map<string, CachedMemberDetails>();
let cachedDomList: SrcyDomRecord[] | null = null;
let activeSessionToken: string | null = null;

function verifySessionConsistency(): void {
  const access = getStoredSrcyAccess();
  const currentToken = access?.token || access?.id || access?.username || 'anonymous-session';
  if (activeSessionToken && activeSessionToken !== currentToken) {
    // Authenticated coordinator changed; invalidate cache
    memberDetailsMap.clear();
    cachedDomList = null;
  }
  activeSessionToken = currentToken;
}

/**
 * Checks if a member's details and DOM history are already cached in this session.
 */
export function getCachedMemberDetails(memberId: string): CachedMemberDetails | null {
  if (!memberId) return null;
  verifySessionConsistency();
  return memberDetailsMap.get(memberId) || null;
}

/**
 * Stores a member's resolved details and DOM history into the session cache.
 */
export function setCachedMemberDetails(
  memberId: string,
  data: {
    domBatch: SrcyDomRecord | null;
    allDoms: SrcyDomRecord[];
    history: SrcyMemberRecord[];
    trainings?: MemberMisTrainingItem[];
  }
): void {
  if (!memberId) return;
  verifySessionConsistency();
  memberDetailsMap.set(memberId, {
    memberId,
    domBatch: data.domBatch,
    allDoms: data.allDoms,
    history: data.history,
    trainings: data.trainings || [],
    cachedAt: Date.now(),
  });
}

/**
 * Retrieves cached DOM records if available in memory for this session.
 */
export function getCachedDomRecords(): SrcyDomRecord[] | null {
  verifySessionConsistency();
  return cachedDomList;
}

/**
 * Sets cached DOM records for the session.
 */
export function setCachedDomRecords(records: SrcyDomRecord[]): void {
  verifySessionConsistency();
  cachedDomList = records;
}

/**
 * Removes a member or all members from the details cache (e.g. after edit, renew, or delete).
 */
export function invalidateMemberDetailsCache(memberId?: string): void {
  if (memberId) {
    memberDetailsMap.delete(memberId);
  } else {
    memberDetailsMap.clear();
  }
}

/**
 * Clears all cached DOM and member data in the active session.
 */
export function clearAllSrcySessionCache(): void {
  memberDetailsMap.clear();
  cachedDomList = null;
  activeSessionToken = null;
}

/**
 * High-level accessor that retrieves a member's details from the session cache
 * if already opened, or loads them from the database and saves to cache.
 */
export async function fetchOrGetCachedMemberDetails(
  member: SrcyMemberRecord,
  forceRefresh: boolean = false
): Promise<CachedMemberDetails> {
  verifySessionConsistency();

  if (!forceRefresh) {
    const existing = memberDetailsMap.get(member.id);
    if (existing) {
      return existing;
    }
  }

  // Use cached DOM list if available to prevent redundant DOM queries
  let domList = cachedDomList;
  if (!domList || forceRefresh) {
    domList = await loadSrcyDomRecords();
    cachedDomList = domList;
  }

  // Fetch member's multi-term history and trainings concurrently
  const [historyList, trainingList] = await Promise.all([
    loadMemberHistory(member),
    loadMemberTrainings(member.id, member.learnerLrn),
  ]);
  const foundDom = member.domId ? domList.find((d) => d.id === member.domId) || null : null;

  const resolved: CachedMemberDetails = {
    memberId: member.id,
    domBatch: foundDom,
    allDoms: domList,
    history: historyList,
    trainings: trainingList,
    cachedAt: Date.now(),
  };

  memberDetailsMap.set(member.id, resolved);
  return resolved;
}
