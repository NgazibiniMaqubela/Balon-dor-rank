import React from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HISTORICAL } from '../data/data';
import RankingList from '../components/RankingList';
import YearSelector from '../components/YearSelector';

const YEAR = 2026;

export default function Rankings() {
  const [year, setYear] = React.useState(2026);
  const [published, setPublished] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (year !== 2026) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'results', String(YEAR)),
      (docSnap) => {
        if (docSnap.exists()) {
          setPublished(docSnap.data());
        } else {
          setPublished(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching published results:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [year]);

  let rows = [];
  if (year !== 2026) {
    rows = (HISTORICAL[year] || []).map(([name, points]) => ({ name, points }));
  } else {
    rows = (published?.rankings || []).map((r) => ({
      name: r.name,
      club: r.club,
      image: r.image,
      points: r.points,
      rank: r.rank,
    }));
  }

  const hasResults = year !== 2026 || rows.length > 0;

  return (
    <>
      <div className="pageHead">
        <div className="eyebrow">COMMUNITY RESULTS</div>
        <h1>Rankings.</h1>
        <p>
          {year === 2026
            ? 'Official consolidated community results for 2026.'
            : `Archive rankings for ${year}.`}
        </p>
      </div>

      <YearSelector year={year} setYear={setYear} />

      {loading && year === 2026 ? (
        <div className="panel">Loading 2026 rankings…</div>
      ) : year === 2026 && !hasResults ? (
        <div className="panel empty">
          <h3>2026 voting is open</h3>
          <p className="muted">
            The leaderboard is currently hidden. Once voting closes and the final results are published from the admin control room, the 2026 ranking will appear here.
          </p>
        </div>
      ) : (
        <>
          {rows.length > 0 && (
            <div className="podium" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              {rows.slice(0, 3).map((r, i) => (
                <div
                  className={'pod ' + (i === 0 ? 'winner' : '')}
                  key={r.name}
                  style={{ textAlign: 'center', padding: '1rem', background: '#fff', borderRadius: '8px', minWidth: '180px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                >
                  <span>#{i + 1}</span>
                  {r.image ? (
                    <img
                      src={r.image}
                      alt={r.name}
                      style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', margin: '0.5rem auto', display: 'block', border: '2px solid #c9a227' }}
                    />
                  ) : null}
                  <h2>{r.name}</h2>
                  <p className="muted" style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>{r.club || ''}</p>
                  <b>{r.points}</b>
                  <small>points</small>
                </div>
              ))}
            </div>
          )}

          <RankingList rows={rows} />
        </>
      )}
    </>
  );
}
