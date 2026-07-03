import { db, doc, getDoc, setDoc, arrayUnion, arrayRemove } from '../api/firebase-client.js';

const FOLLOWS_COLLECTION = 'follows';

export async function isFollowing(followerUid, sellerUid) {
  if (!followerUid || followerUid === sellerUid) return false;

  const snap = await getDoc(doc(db, FOLLOWS_COLLECTION, followerUid));
  if (!snap.exists()) return false;

  const following = snap.data().following || [];
  return following.includes(sellerUid);
}

export async function followUser(followerUid, sellerUid) {
  if (!followerUid || followerUid === sellerUid) {
    throw new Error('Cannot follow yourself');
  }

  await setDoc(
    doc(db, FOLLOWS_COLLECTION, followerUid),
    { following: arrayUnion(sellerUid) },
    { merge: true }
  );
}

export async function unfollowUser(followerUid, sellerUid) {
  if (!followerUid) return;

  await setDoc(
    doc(db, FOLLOWS_COLLECTION, followerUid),
    { following: arrayRemove(sellerUid) },
    { merge: true }
  );
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
