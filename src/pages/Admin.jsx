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
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../firebase/config';

const YEAR = 2026;

function dateLabel(value) {
  if (!value) return '—';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
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

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
  const [votingClosed, setVotingClosed] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  const checkAdmin = async (currentUser) => {
    setIsAdmin(false);
    if (!currentUser || !db) {
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
      setIsAdmin(adminDoc.exists() && adminDoc.data().role === 'admin');
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
      const [codeSnap, voteSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'voterCodes'), where('year', '==', YEAR))),
        getDocs(query(collection(db, 'votes'), where('year', '==', YEAR))),
        getDoc(doc(db, 'settings', 'voting')),
      ]);

      const codeRows = codeSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
      const voteRows = voteSnap.docs.map((item) => ({ id: item.id, ...item.data() }));

      codeRows.sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));
      voteRows.sort((a, b) => dateValue(b.submittedAt) - dateValue(a.submittedAt));

      setCodes(codeRows);
      setVotes(voteRows);

      if (settingsSnap.exists()) {
        setVotingClosed(settingsSnap.data().isOpen === false);
      }
    } catch (err) {
      setError(`Unable to load admin data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isAdmin) refreshData();
  }, [isAdmin]);

  const toggleVotingStatus = async () => {
    try {
      const newStatus = !votingClosed; 
      await setDoc(doc(db, 'settings', 'voting'), { isOpen: !newStatus }, { merge: true });
      setVotingClosed(newStatus);
      setMessage(newStatus ? 'Voting has been closed successfully.' : 'Voting has been reopened.');
    } catch (err) {
      setError(`Failed to update voting status: ${err.message}`);
    }
  };
  
  const publishRankings = async () => {
    if (!votingClosed) {
      setError('You must close voting before revealing the final rankings.');
      return;
    }

    if (!votes.length) {
      setError('No ballots were found in Firestore. Nothing to reveal.');
      return;
    }

    setPublishing(true);
    setError('');
    setMessage('');

    try {
      const scores = {};

      votes.forEach((vote) => {
        if (!Array.isArray(vote.rankings)) return;

        vote.rankings.slice(0, 30).forEach((item, index) => {
          const name = playerLabel(item).trim();
          if (!name || name === 'Unknown player') return;

          const rawRank = Number(playerRank(item, index));
          const rank = Number.isFinite(rawRank) && rawRank >= 1 && rawRank <= 30
            ? rawRank
            : index + 1;
          const points = 31 - rank; 
          const club = item && typeof item === 'object' ? item.club || '' : '';
          const image = item && typeof item === 'object' ? item.image || '' : '';

          if (!scores[name]) {
            scores[name] = {
              name,
              points: 0,
              votesCount: 0,
              firstPlaceVotes: 0,
              club,
              image,
            };
          }

          scores[name].points += points;
          scores[name].votesCount += 1;
          if (rank === 1) scores[name].firstPlaceVotes += 1;
          if (!scores[name].club && club) scores[name].club = club;
          if (!scores[name].image && image) scores[name].image = image;
        });
      });

      const sortedRankings = Object.values(scores).sort(
        (a, b) =>
          b.points - a.points ||
          b.firstPlaceVotes - a.firstPlaceVotes ||
          b.votesCount - a.votesCount ||
          a.name.localeCompare(b.name)
      );

      const finalized = sortedRankings.map((player, index) => ({
        rank: index + 1,
        name: player.name,
        club: player.club,
        image: player.image,
        points: player.points,
        votesCount: player.votesCount,
        firstPlaceVotes: player.firstPlaceVotes,
      }));

      await setDoc(doc(db, 'results', String(YEAR)), {
        year: YEAR,
        published: true,
        rankings: finalized,
        totalBallots: votes.length,
        publishedAt: new Date(),
      });

      setMessage(`2026 rankings published successfully from ${votes.length} ballots.`);
    } catch (err) {
      setError(`Failed to publish rankings: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  // Helper to calculate live leaderboard array for admin review
  const computeLiveLeaderboard = () => {
    const scores = {};
    votes.forEach((vote) => {
      if (!Array.isArray(vote.rankings)) return;
      vote.rankings.slice(0, 30).forEach((item, index) => {
        const name = playerLabel(item).trim();
        if (!name || name === 'Unknown player') return;
        const rawRank = Number(playerRank(item, index));
        const rank = Number.isFinite(rawRank) && rawRank >= 1 && rawRank <= 30 ? rawRank : index + 1;
        const points = 31 - rank;
        const club = item && typeof item === 'object' ? item.club || '' : '';

        if (!scores[name]) {
          scores[name] = { name, points: 0, votesCount: 0, firstPlaceVotes: 0, club };
        }
        scores[name].points += points;
        scores[name].votesCount += 1;
        if (rank === 1) scores[name].firstPlaceVotes += 1;
        if (!scores[name].club && club) scores[name].club = club;
      });
    });

    return Object.values(scores).sort(
      (a, b) =>
        b.points - a.points ||
        b.firstPlaceVotes - a.firstPlaceVotes ||
        b.votesCount - a.votesCount ||
        a.name.localeCompare(b.name)
    ).map((p, index) => ({ ...p, overallRank: index + 1 }));
  };

  const liveLeaderboard = computeLiveLeaderboard();

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

  // Export 3-column analysis dataset: Each Voter Code appears 30 times with Player Name and Rank
  const exportAnalysisDataset = () => {
    const flattenedRows = [['Voter Code', 'Player Name', 'Rank', 'Points']];
    votes.forEach((vote) => {
      const code = vote.voterCode || 'UNKNOWN';
      if (Array.isArray(vote.rankings)) {
        vote.rankings.forEach((item, index) => {
          const name = playerLabel(item).trim();
          const rnk = Number(playerRank(item, index));
          const pts = 31 - rnk;
          flattenedRows.push([code, name, rnk, pts]);
        });
      }
    });

    downloadCsv(flattenedRows, `Balon-Dor-${YEAR}-Analysis-Flat-Dataset.csv`);
  };

  if (!firebaseConfigured) return <div className="panel">Firebase is not configured.</div>;
  if (checking) return <div className="panel">Checking administrator access…</div>;

  if (!user) {
    return (
      <section className="pageHead">
        <div className="eyebrow">RESTRICTED AREA</div>
        <h1>Admin control room.</h1>
        <p>Sign in with your authorised Google account to continue.</p>
        <button className="primary" onClick={login}>Sign in with Google</button>
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
          <button className="secondary" onClick={() => checkAdmin(user)}>Recheck access</button>
        </div>
        <button className="secondary" onClick={() => signOut(auth)}>Sign out</button>
        {error && <p className="message">{error}</p>}
      </section>
    );
  }

  const usedCodes = codes.filter((code) => code.status === 'used').length;
  const availableCodes = codes.filter((code) => code.status === 'available').length;
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
        <p>Manage voting lifecycle and monitor submitted ballots.</p>
        <p className="muted">Signed in as {user.email}</p>
        <button className="secondary" onClick={refreshData} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>{' '}
        <button className="secondary" onClick={() => signOut(auth)}>Sign out</button>
      </div>

      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      {/* Control Actions Section */}
      <section className="panel">
        <h2>Voting Controls</h2>
        <p className="muted">Control whether voters can submit new ballots and publish final results.</p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem', alignItems: 'center' }}>
          <button
            className={votingClosed ? 'primary' : 'secondary'}
            onClick={toggleVotingStatus}
          >
            {votingClosed ? 'Open Voting' : 'Close Voting'}
          </button>

          <button
            className="primary"
            onClick={publishRankings}
            disabled={!votingClosed || publishing}
            style={{ opacity: !votingClosed ? 0.6 : 1 }}
          >
            {publishing ? 'Publishing…' : 'Reveal 2026 Final Rankings'}
          </button>
        </div>

        <p className="muted" style={{ marginTop: '1rem' }}>
          Status: <strong>{votingClosed ? 'Closed (Submissions blocked)' : 'Open (Accepting votes)'}</strong>
        </p>
      </section>

      <div className="adminGrid">
        <div className="panel"><span className="muted">Ballots submitted</span><h2>{votes.length}</h2></div>
        <div className="panel"><span className="muted">Voter codes issued</span><h2>{codes.length}</h2></div>
        <div className="panel"><span className="muted">Codes available</span><h2>{availableCodes}</h2></div>
        <div className="panel"><span className="muted">Codes marked used</span><h2>{usedCodes}</h2></div>
      </div>

      {/* Live Leaderboard Table Section */}
      <section className="panel" style={{ marginTop: '2rem' }}>
        <h2>Live Leaderboard Preview</h2>
        <p className="muted">Current aggregate standing of players based on submitted votes before official publication.</p>
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player Name</th>
                <th>Club</th>
                <th>Total Points</th>
                <th>Votes Count</th>
                <th>1st Place Votes</th>
              </tr>
            </thead>
            <tbody>
              {liveLeaderboard.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem' }}>No votes submitted yet.</td></tr>
              ) : (
                liveLeaderboard.map((p) => (
                  <tr key={p.name}>
                    <td>#{p.overallRank}</td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.club || '—'}</td>
                    <td>{p.points} pts</td>
                    <td>{p.votesCount}</td>
                    <td>{p.firstPlaceVotes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Export & Data Section */}
      <section className="panel" style={{ marginTop: '2rem' }}>
        <h2>Analytics & Data Exports</h2>
        <p className="muted">Download code registers or flat datasets for offline statistical analysis.</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button className="secondary" onClick={exportCodeRegister}>Export Code Register CSV</button>
          <button className="secondary" onClick={exportBallots}>Export Ballot Register CSV</button>
          <button className="primary" onClick={exportAnalysisDataset}>Export Analysis Dataset (CSV)</button>
        </div>
      </section>

      {/* Code Register Table */}
      <section className="panel" style={{ marginTop: '2rem' }}>
        <h2>Voter code register</h2>
        <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search code..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }}
          />
          <select 
            value={codeFilter} 
            onChange={(e) => setCodeFilter(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="used">Used</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table>
            <thead>
              <tr><th>Voter code</th><th>Status</th><th>Created</th><th>Used</th></tr>
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
    </>
  );
}

function dateValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
