
import React from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../firebase/config';

const YEAR = 2026;

export default function Admin() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState(null);
  const [error, setError] = React.useState('');

  const checkAdmin = async (currentUser) => {
    setIsAdmin(false);
    setStats(null);

    if (!currentUser || !db) {
      setChecking(false);
      return;
    }

    setChecking(true);

    try {
      const adminDoc = await getDoc(
        doc(db, 'admins', currentUser.uid)
      );

      setIsAdmin(
        adminDoc.exists() &&
        adminDoc.data().role === 'admin'
      );
    } catch (err) {
      setError(`Unable to verify administrator access: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  React.useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setChecking(false);
      setError('Firebase is not configured for this deployment.');
      return;
    }

    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setError('');
      await checkAdmin(currentUser);
    });
  }, []);

  const login = async () => {
    setError('');

    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(`Google sign-in failed: ${err.message}`);
    }
  };

  const refreshCounts = async () => {
    if (!isAdmin || !db) return;

    setLoading(true);
    setError('');

    try {
      const votesQuery = query(
        collection(db, 'votes'),
        where('year', '==', YEAR)
      );

      const codesQuery = query(
        collection(db, 'voterCodes'),
        where('year', '==', YEAR)
      );

      const [votesResult, codesResult] = await Promise.all([
        getCountFromServer(votesQuery),
        getCountFromServer(codesQuery),
      ]);

      const votes = votesResult.data().count;
      const codes = codesResult.data().count;

      setStats({
        votes,
        codes,
        remaining: Math.max(codes - votes, 0),
        percentage: codes
          ? Math.min(Math.round((votes / codes) * 100), 100)
          : 0,
      });
    } catch (err) {
      setError(`Unable to load vote statistics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isAdmin) refreshCounts();
  }, [isAdmin]);

  if (!firebaseConfigured) {
    return (
      <div className="panel">
        Firebase is not configured. Check your GitHub Actions
        Firebase environment secrets and redeploy.
      </div>
    );
  }

  if (checking) {
    return <div className="panel">Checking administrator access…</div>;
  }

  if (!user) {
    return (
      <section className="pageHead">
        <div className="eyebrow">RESTRICTED AREA</div>
        <h1>Admin control room.</h1>
        <p>Sign in with your authorised Google account to continue.</p>
        <button className="primary" onClick={login}>
          Sign in with Google
        </button>
        {error && <p className="message">{error}</p>}
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="pageHead">
        <div className="eyebrow">ACCESS NOT AUTHORISED</div>
        <h1>Administrator access required.</h1>
        <p>
          Signed in as {user.email || 'Google user'}.
          This account is not yet authorised.
        </p>
        <div className="panel">
          <p>Administrator UID</p>
          <code>{user.uid}</code>
          <p className="muted">
            Copy this UID and create the administrator document
            in Firestore as described in the setup instructions.
            Then recheck access.
          </p>
          <button
            className="secondary"
            onClick={() => checkAdmin(user)}
          >
            Recheck access
          </button>
        </div>
        <button className="secondary" onClick={() => signOut(auth)}>
          Sign out
        </button>
        {error && <p className="message">{error}</p>}
      </section>
    );
  }

  return (
    <>
      <div className="pageHead">
        <div className="eyebrow">ADMIN • {YEAR}</div>
        <h1>Voting control room.</h1>
        <p>
          Monitor ballot submissions for Balon Dor Rank {YEAR}.
        </p>
        <p className="muted">Signed in as {user.email}</p>
        <button
          className="secondary"
          onClick={refreshCounts}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh vote statistics'}
        </button>
        {' '}
        <button className="secondary" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>

      {error && <p className="message">{error}</p>}

      {stats && (
        <>
          <div className="adminGrid">
            <div className="panel">
              <span className="muted">Ballots submitted</span>
              <h2>{stats.votes}</h2>
            </div>

            <div className="panel">
              <span className="muted">Voter codes issued</span>
              <h2>{stats.codes}</h2>
            </div>

            <div className="panel">
              <span className="muted">Outstanding ballots</span>
              <h2>{stats.remaining}</h2>
            </div>
          </div>

          <section className="panel">
            <h3>Participation progress</h3>
            <h2>{stats.percentage}%</h2>
            <div
              role="progressbar"
              aria-label="Voting participation"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats.percentage}
              style={{
                height: 12,
                background: '#e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${stats.percentage}%`,
                  background: '#c9a227',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p className="muted">
              {stats.votes} of {stats.codes} issued voter codes
              have submitted ballots.
            </p>
          </section>
        </>
      )}

      {!stats && !loading && (
        <section className="panel">
          Statistics have not loaded yet. Use Refresh vote statistics.
        </section>
      )}
    </>
  );
}
