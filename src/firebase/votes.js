import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db, firebaseConfigured } from './config';

export async function submitVote({year=2026,voterCode,rankings}) {
  if (!firebaseConfigured) return {mode:'demo', id:`demo-${Date.now()}`};
  if (!Array.isArray(rankings) || rankings.length !== 30) throw new Error('A complete 30-player ballot is required.');
  await signInAnonymously(auth);
  const normalizedCode=voterCode.trim().toUpperCase();
  const codeRef = doc(db,'voterCodes',normalizedCode);
  const voteRef = doc(db,'votes',`${year}_${normalizedCode}`);
  await runTransaction(db, async tx => {
    const codeSnap = await tx.get(codeRef);
    if (!codeSnap.exists()) throw new Error('Invalid voter code.');
    const code = codeSnap.data();
    if (code.year !== year || code.status !== 'available') throw new Error('This voter code is invalid or has already been used.');
    tx.set(voteRef,{year,voterCode:normalizedCode,rankings,submittedAt:serverTimestamp(),uid:auth.currentUser.uid});
    tx.update(codeRef,{status:'used',usedAt:serverTimestamp()});
  });
  return {mode:'firebase',id:voteRef.id};
}

export async function getPublishedResults(year=2026) {
  if (!firebaseConfigured) return null;
  const snap=await getDoc(doc(db,'results',String(year)));
  if (!snap.exists()) return null;
  const data=snap.data();
  return data.published===true ? data : null;
}

export async function getVoteCount(year=2026) {
  // Intentionally not available to public clients. Individual ballots remain private.
  return null;
}
