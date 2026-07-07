import {
  db,
  doc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
} from '../api/firebase-client.js';

const FOLLOWS_COLLECTION = 'follows';
const USERS_COLLECTION = 'users';

export async function isFollowing(followerUid, sellerUid) {
  if (!followerUid || followerUid === sellerUid) return false;

  const snap = await getDoc(doc(db, FOLLOWS_COLLECTION, followerUid));
  if (!snap.exists()) return false;

  const following = snap.data().following || [];
  return following.includes(sellerUid);
}

// Both the follows-array write and the two stats counters must land
// together -- if one write succeeded and the other failed, the counter
// shown on profile.html would drift from what isFollowing() actually
// reports, and that drift has no natural way to self-correct later.
// writeBatch() is all-or-nothing, so that can't happen.
export async function followUser(followerUid, sellerUid) {
  if (!followerUid || followerUid === sellerUid) {
    throw new Error('Cannot follow yourself');
  }

  const batch = writeBatch(db);
  batch.set(
    doc(db, FOLLOWS_COLLECTION, followerUid),
    { following: arrayUnion(sellerUid) },
    { merge: true }
  );
  batch.set(
    doc(db, USERS_COLLECTION, sellerUid),
    { stats: { followers: increment(1) } },
    { merge: true }
  );
  batch.set(
    doc(db, USERS_COLLECTION, followerUid),
    { stats: { following: increment(1) } },
    { merge: true }
  );
  await batch.commit();
}

export async function unfollowUser(followerUid, sellerUid) {
  if (!followerUid) return;

  const batch = writeBatch(db);
  batch.set(
    doc(db, FOLLOWS_COLLECTION, followerUid),
    { following: arrayRemove(sellerUid) },
    { merge: true }
  );
  batch.set(
    doc(db, USERS_COLLECTION, sellerUid),
    { stats: { followers: increment(-1) } },
    { merge: true }
  );
  batch.set(
    doc(db, USERS_COLLECTION, followerUid),
    { stats: { following: increment(-1) } },
    { merge: true }
  );
  await batch.commit();
}

export async function toggleFollow(followerUid, sellerUid) {
  const alreadyFollowing = await isFollowing(followerUid, sellerUid);

  if (alreadyFollowing) {
    await unfollowUser(followerUid, sellerUid);
    return false;
  }

  await followUser(followerUid, sellerUid);
  return true;
}
