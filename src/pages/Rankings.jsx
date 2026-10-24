import React from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const YEAR = 2026;

export default function Rankings() {
  const [rankings, setRankings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    // Real-time listener for published rankings
    const unsubscribe = onSnapshot(
      doc(db, 'rankings', String(YEAR)),
      (docSnap) => {
        if (docSnap.exists()) {
          setRankings(docSnap.data().rankings || []);
        } else {
          setRankings([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching rankings:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const topThree = rankings.slice(0, 3);
  const remaining = rankings.slice(3);

  return (
    <div className="page">
      <div className="pageHead">
        <div className="eyebrow">FINAL RESULTS • {YEAR}</div>
        <h1>The Official Rankings.</h1>
        <p>Consolidated results from all verified community ballots.</p>
      </div>

      {loading ? (
        <div className="panel">Loading final rankings…</div>
      ) : rankings.length === 0 ? (
        <div className="panel">
          <h2>Rankings not yet revealed</h2>
          <p className="muted">
            The administrator has not yet published the final 2026 results. Check back soon!
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Section */}
          <div
            className="podiumGrid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {topThree.map((player, idx) => (
              <div key={player.name} className="panel" style={{ textAlign: 'center', position: 'relative' }}>
                <span className="eyebrow" style={{ color: '#c9a227' }}>#{idx + 1} Position</span>
                {player.image ? (
                  <img
                    src={player.image}
                    alt={player.name}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      margin: '1rem auto',
                      border: '3px solid #c9a227',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: '#e5e7eb',
                      margin: '1rem auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    {player.name ? player.name.charAt(0) : '?'}
                  </div>
                )}
                <h3>{player.name}</h3>
                <p className="muted">{player.club || '—'}</p>
                <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>{player.points} Points</p>
              </div>
            ))}
          </div>

          {/* Remaining Rankings Table */}
          <div className="panel">
            <h2>Full Standings</h2>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Club</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {remaining.map((player) => (
                    <tr key={player.name}>
                      <td>#{player.rank}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {player.image && (
                            <img
                              src={player.image}
                              alt=""
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          )}
                          <span>{player.name}</span>
                        </div>
                      </td>
                      <td>{player.club || '—'}</td>
                      <td>{player.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
