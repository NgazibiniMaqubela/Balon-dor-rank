import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db, firebaseConfigured } from './config';
import { NOMINEES_2026 } from '../data/data'; // Import nominees to resolve names

export async function submitVote({year=2026, voterCode, rankings}) {
  if (!firebaseConfigured) return {mode:'demo', id:`demo-${Date.now()}`};
  if (!Array.isArray(rankings) || rankings.length !== 30) throw new Error('A complete 30-player ballot is required.');
  
  await signInAnonymously(auth);
  const normalizedCode = voterCode.trim().toUpperCase();
  const codeRef = doc(db, 'voterCodes', normalizedCode);
  const voteRef = doc(db, 'votes', `${year}_${normalizedCode}`);

  // Resolve player names alongside IDs, ranks, and points
  const resolvedRankings = rankings.map((item) => {
    const player = NOMINEES_2026.find(n => n.id === item.playerId);
    return {
      playerId: item.playerId,
      name: player ? player.name : (item.name || 'Unknown player'),
      rank: item.rank,
      points: item.points,
    };
  });

  await runTransaction(db, async tx => {
    const codeSnap = await tx.get(codeRef);
    if (!codeSnap.exists()) throw new Error('Invalid voter code. Check that the voterCodes document ID exactly matches the code you entered.');
    const code = codeSnap.data();
    if (code.year !== year || code.status !== 'available') throw new Error('This voter code is invalid or has already been used.');
    
    // Save the resolved rankings with clean player names
    tx.set(voteRef, {
      year,
      voterCode: normalizedCode,
      rankings: resolvedRankings,
      submittedAt: serverTimestamp(),
      uid: auth.currentUser.uid
    });
    
    tx.update(codeRef, { status: 'used', usedAt: serverTimestamp() });
  });

  return {mode:'firebase', id:voteRef.id};
}

export async function getPublishedResults(year=2026) {
  if (!firebaseConfigured) return null;
  const snap = await getDoc(doc(db, 'results', String(year)));
  if (!snap.exists()) return null;
  const data = snap.data();
  return data.published === true ? data : null;
}

export async function getVoteCount(year=2026) {
  // Intentionally not available to public clients. Individual ballots remain private.
  return null;
}
