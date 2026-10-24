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

// Dynamic Wikipedia portrait component styled to fill the card backdrop
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

  if (!src || failed) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.2rem', color: '#777', fontWeight: 'bold' }}>{name}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={`${name} portrait`} 
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} 
    />
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
            <div className="podium" style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
              {rows.slice(0, 3).map((r, i) => {
                const matchedPlayer = NOMINEES_2026?.find(p => p.name.toLowerCase() === r.name.toLowerCase() || p.id === r.playerId);
                const activeImage = r.image || matchedPlayer?.image;

                return (
                  <div
                    className={'pod ' + (i === 0 ? 'winner' : '')}
                    key={r.name}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '12px',
                      minWidth: '220px',
                      minHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '1.25rem',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                      border: i === 0 ? '2px solid #c9a227' : '1px solid rgba(255,255,255,0.1)',
                      background: '#121212'
                    }}
                  >
                    {/* Background Image filling the card */}
                    {activeImage ? (
                      <img 
                        src={activeImage} 
                        alt={r.name} 
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }} 
                      />
                    ) : (
                      <PodiumPortrait name={r.name} />
                    )}

                    {/* Dark gradient overlay to ensure text readability */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)', zIndex: 1 }} />

                    {/* Top Badge */}
                    <div style={{ zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: i === 0 ? '#c9a227' : 'rgba(255,255,255,0.2)', color: i === 0 ? '#000' : '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        #{i + 1}
                      </span>
                    </div>

                    {/* Bottom Content */}
                    <div style={{ zIndex: 2, textAlign: 'left' }}>
                      <h2 style={{ color: '#fff', fontSize: '1.3rem', margin: '0 0 0.2rem 0', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{r.name}</h2>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 0.8rem 0' }}>{r.club || matchedPlayer?.club || ''}</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>{r.points}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>points</span>
                      </div>
                    </div>
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
