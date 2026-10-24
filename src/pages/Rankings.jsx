import React from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HISTORICAL, NOMINEES_2026 } from '../data/data';
import RankingList from '../components/RankingList';
import YearSelector from '../components/YearSelector';

const YEAR = 2026;

function getPlayerDetails(item) {
  if (!item) return { name: 'Unknown player', club: '', image: '' };
  
  // If it's already a plain string name
  if (typeof item === 'string') return { name: item, club: '', image: '' };

  // Check every possible property where the name or ID might live
  const rawName = item.name || item.playerName || item.nominee || item.title || item.playerId || item.id || '';

  // If we have a playerId, check NOMINEES_2026 first to grab the actual name
  const matchedPlayer = NOMINEES_2026?.find(p => p.id === item.playerId || p.name.toLowerCase() === String(rawName).toLowerCase());

  let cleanName = matchedPlayer?.name || String(rawName);
  if (cleanName.startsWith('p') && cleanName.length <= 4 && !matchedPlayer) {
    cleanName = `Player ${cleanName.substring(1)}`;
  }

  return {
    name: cleanName !== '' ? cleanName : 'Unknown player',
    club: item.club || matchedPlayer?.club || '',
    image: item.image || matchedPlayer?.image || '',
    points: item.points || 0
  };
}

// Dynamic Wikipedia portrait fetcher for podium cards
function PodiumPortrait({ name }) {
  const [src, setSrc] = React.useState('');
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setSrc('');
    setFailed(false);
    if (!name) return;
    const title = name.replaceAll(' ', '_');
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('No portrait')))
      .then(data => {
        if (active && data.thumbnail?.source) setSrc(data.thumbnail.source);
        else if (active) setFailed(true);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [name]);

  return (
    <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', margin: '0.5rem auto', border: '2px solid #c9a227', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src && !failed ? (
        <img src={src} alt={`${name} portrait`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: '0.70rem', color: '#666', textAlign: 'center', padding: '0 4px' }}>{name.split(' ').pop()}</span>
      )}
    </div>
  );
}

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
    rows = (HISTORICAL[year] || []).map(([name, points]) => {
      const matched = NOMINEES_2026?.find(p => p.name.toLowerCase() === name.toLowerCase());
      return { 
        name, 
        points, 
        club: matched?.club || '', 
        image: matched?.image || '' 
      };
    });
  } else {
    rows = (published?.rankings || []).map((r) => {
      const details = getPlayerDetails(r);
      return {
        name: details.name,
        club: details.club,
        image: details.image,
        points: r.points,
        rank: r.rank,
      };
    });
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
              {rows.slice(0, 3).map((r, i) => {
                const matchedPlayer = NOMINEES_2026?.find(p => p.name.toLowerCase() === r.name.toLowerCase() || p.id === r.playerId);

                return (
                  <div
                    className={'pod ' + (i === 0 ? 'winner' : '')}
                    key={r.name}
                    style={{ textAlign: 'center', padding: '1rem', background: '#fff', borderRadius: '8px', minWidth: '180px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                  >
                    <span>#{i + 1}</span>
                    
                    {/* Dynamic image rendering using stored image or Wikipedia fallback */}
                    {r.image ? (
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', margin: '0.5rem auto', border: '2px solid #c9a227', background: '#f0f0f0' }}>
                        <img src={r.image} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <PodiumPortrait name={r.name} />
                    )}

                    <h2>{r.name}</h2>
                    <p className="muted" style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>{r.club || matchedPlayer?.club || ''}</p>
                    <b>{r.points}</b>
                    <small>points</small>
                  </div>
                );
              })}
            </div>
          )}

          <RankingList rows={rows} />
        </>
      )}
    </>
  );
}
