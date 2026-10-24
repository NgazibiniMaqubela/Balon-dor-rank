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
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../firebase/config';

const YEAR = 2026;

function dateLabel(value) {
  if (!value) return '—';

  const date = typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString();
}

function playerLabel(item) {
  if (typeof item === 'string') return item;

  if (item && typeof item === 'object') {
    return (
      item.playerName ??
      item.player ??
      item.name ??
      item.nominee ??
      item.title ??
      item.id ??
      JSON.stringify(item)
    );
  }

  return String(item ?? 'Unknown player');
}

function playerRank(item, index) {
  if (item && typeof item === 'object') {
    return item.rank ?? item.position ?? item.ranking ?? index + 1;
  }

  return index + 1;
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) =>
    row.map((value) => {
      const text = String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [codes, setCodes] = React.useState([]);
  const [votes, setVotes] = React.useState([]);
  const [codeFilter, setCodeFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');

  const checkAdmin = async (currentUser) => {
    setIsAdmin(false);

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

  const refreshData = async () => {
    if (!isAdmin || !db) return;

    setLoading(true);
    setError('');

    try {
      const [codeSnap, voteSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'voterCodes'),
          where('year', '==', YEAR)
        )),
        getDocs(query(
          collection(db, 'votes'),
          where('year', '==', YEAR)
        )),
      ]);

      const codeRows = codeSnap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const voteRows = voteSnap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      codeRows.sort((a, b) =>
        dateValue(b.createdAt) - dateValue(a.createdAt)
      );

      voteRows.sort((a, b) =>
        dateValue(b.submittedAt) - dateValue(a.submittedAt)
      );

      setCodes(codeRows);
      setVotes(voteRows);
    } catch (err) {
      setError(`Unable to load admin data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isAdmin) refreshData();
  }, [isAdmin]);

  const exportCodeRegister = () => {
    downloadCsv([
      ['Voter Code', 'Year', 'Status', 'Created At', 'Used At'],
      ...codes.map((code) => [
        code.id,
        code.year,
        code.status,
        dateLabel(code.createdAt),
        dateLabel(code.usedAt),
      ]),
    ], `Balon-Dor-${YEAR}-Voter-Code-Register.csv`);
  };

  const exportBallots = () => {
    downloadCsv([
      ['Vote ID', 'Voter Code', 'Submitted At', 'Ranking Count', 'Rankings'],
      ...votes.map((vote) => [
        vote.id,
        vote.voterCode,
        dateLabel(vote.submittedAt),
        Array.isArray(vote.rankings) ? vote.rankings.length : 0,
        JSON.stringify(vote.rankings ?? []),
      ]),
    ], `Balon-Dor-${YEAR}-Ballot-Register.csv`);
  };

  if (!firebaseConfigured) {
    return <div className="panel">Firebase is not configured.</div>;
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
        <p>Signed in as {user.email || 'Google user'}.</p>
        <div className="panel">
          <p>Administrator UID</p>
          <code>{user.uid}</code>
          <p className="muted">
            Add this UID as an admins document in Firestore if
            this account should be an administrator.
          </p>
          <button className="secondary" onClick={() => checkAdmin(user)}>
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

  const usedCodes = codes.filter((code) => code.status === 'used').length;
  const availableCodes = codes.filter(
    (code) => code.status === 'available'
  ).length;
  const participation = codes.length
    ? Math.min(Math.round((votes.length / codes.length) * 100), 100)
    : 0;

  const visibleCodes = codes.filter((code) => {
    const matchesStatus = codeFilter === 'all' || code.status === codeFilter;
    const matchesSearch = code.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <>
      <div className="pageHead">
        <div className="eyebrow">ADMIN • {YEAR}</div>
        <h1>Voting control room.</h1>
        <p>Manage voter codes and monitor submitted ballots.</p>
        <p className="muted">Signed in as {user.email}</p>
        <button
          className="secondary"
          onClick={refreshData}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>{' '}
        <button className="secondary" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>

      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      <div className="adminGrid">
        <div className="panel">
          <span className="muted">Ballots submitted</span>
          <h2>{votes.length}</h2>
        </div>
        <div className="panel">
          <span className="muted">Voter codes issued</span>
          <h2>{codes.length}</h2>
        </div>
        <div className="panel">
          <span className="muted">Codes still available</span>
          <h2>{availableCodes}</h2>
        </div>
        <div className="panel">
          <span className="muted">Codes marked used</span>
          <h2>{usedCodes}</h2>
        </div>
      </div>

      <section className="panel">
        <h2>Participation progress</h2>
        <h3>{participation}%</h3>
        <div
          role="progressbar"
          aria-label="Voting participation"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={participation}
          style={{
            height: 12,
            background: '#e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%',
            width: `${participation}%`,
            background: '#c9a227',
          }} />
        </div>
        <p className="muted">
          {votes.length} ballots submitted out of {codes.length} issued codes.
          Refresh to update these figures.
        </p>
      </section>

      <section className="panel">
        <h2>Voter Code Management</h2>
        <p className="muted">
          Voter codes are managed directly via the Firebase Console to keep the app on the free Spark plan.
        </p>
        <p>
          To issue new codes, navigate to your <strong>Firestore Database</strong> in the Firebase Console, 
          open the <code>voterCodes</code> collection, and add a new document where the <strong>Document ID</strong> is your custom code (e.g., <code>BDR26-A7K9-P2MX</code>) with fields:
        </p>
        <ul>
          <li><code>year</code> (Number): <code>2026</code></li>
          <li><code>status</code> (String): <code>available</code></li>
        </ul>
      </section>

      <section className="panel">
        <h2>Voter code register</h2>
        <p className="muted">
          The full register contains code IDs and status—not individual
          ballot rankings.
        </p>
        <div className="adminGrid">
          <div>
            <label htmlFor="codeSearch">Search by code</label>
            <input
              id="codeSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search voter code"
            />
          </div>
          <div>
            <label htmlFor="codeFilter">Filter status</label>
            <select
              id="codeFilter"
              value={codeFilter}
              onChange={(event) => setCodeFilter(event.target.value)}
            >
              <option value="all">All codes</option>
              <option value="available">Available</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>
        <button className="secondary" onClick={exportCodeRegister}>
          Export full code register CSV
        </button>
        <p className="muted">
          Showing {visibleCodes.length} of {codes.length} codes.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Voter code</th>
                <th>Status</th>
                <th>Created</th>
                <th>Used</th>
              </tr>
            </thead>
            <tbody>
              {visibleCodes.map((code) => (
                <tr key={code.id}>
                  <td>{code.id}</td>
                  <td>{code.status || 'Unknown'}</td>
                  <td>{dateLabel(code.createdAt)}</td>
                  <td>{dateLabel(code.usedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Submitted ballots</h2>
        <p className="muted">
          Rankings are private and visible only in this administrator view.
          Keep exported ballot data secure.
        </p>
        <button className="secondary" onClick={exportBallots}>
          Export ballot register CSV
        </button>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Voter code</th>
                <th>Submitted</th>
                <th>Rankings</th>
              </tr>
            </thead>
            <tbody>
              {votes.map((vote) => (
                <tr key={vote.id}>
                  <td>{vote.voterCode || '—'}</td>
                  <td>{dateLabel(vote.submittedAt)}</td>
                  <td>
                    <details>
                      <summary>
                        View {Array.isArray(vote.rankings)
                          ? vote.rankings.length
                          : 0} entries
                      </summary>
                      {Array.isArray(vote.rankings) ? (
                        <ol>
                          {vote.rankings.map((item, index) => (
                            <li key={`${vote.id}-${index}`}>
                              {playerRank(item, index)}. {playerLabel(item)}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p>No ranking list found in this ballot.</p>
                      )}
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {votes.length === 0 && (
          <p className="muted">No ballots have been submitted yet.</p>
        )}
      </section>
    </>
  );
}

function dateValue(value) {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}