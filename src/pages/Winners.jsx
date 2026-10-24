import React from 'react';
import { Trophy } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HISTORICAL, NOMINEES_2026 } from '../data/data';

// Dynamic Wikipedia portrait component styled to fill the winner card backdrop
function WinnerPortrait({ name }) {
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
        <Trophy size={48} color="#c9a227" style={{ opacity: 0.3 }} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={`${name} portrait`} 
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.65)' }} 
    />
  );
}

export default function Winners() {
  const [winner2026, setWinner2026] = React.useState(null);

  React.useEffect(() => {
    async function load2026Winner() {
      try {
        const snap = await getDoc(doc(db, 'results', '2026'));
        if (snap.exists() && snap.data().rankings?.length > 0) {
          setWinner2026(snap.data().rankings[0]);
        }
      } catch (err) {
        console.error('Error fetching 2026 winner:', err);
      }
    }
    load2026Winner();
  }, []);

  return (
    <>
      <div className="pageHead">
        <div className="eyebrow">THE WINNERS</div>
        <h1>Champions.</h1>
        <p>The player who finished first in each edition of the Balon d'Or Rank.</p>
      </div>

      <div className="winnerGrid" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* 2026 Winner Card */}
        <div 
          className="winnerCard current" 
          key="2026" 
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '12px',
            minWidth: '240px',
            minHeight: '340px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.25rem',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            border: '2px solid #c9a227',
            background: '#121212',
            textAlign: 'left'
          }}
        >
          {winner2026?.image ? (
            <img 
              src={winner2026.image} 
              alt={winner2026.name} 
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.65)' }} 
            />
          ) : (
            <WinnerPortrait name={winner2026?.name} />
          )}

          {/* Dark gradient overlay for text readability */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 15%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)', zIndex: 1 }} />

          {/* Top Badge */}
          <div style={{ zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ background: '#c9a227', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              EDITION 2026
            </span>
            <Trophy size={20} color="#c9a227" />
          </div>

          {/* Bottom Content */}
          <div style={{ zIndex: 2 }}>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', margin: '0 0 0.2rem 0', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {winner2026 ? winner2026.name : 'TBA'}
            </h2>
            {winner2026?.club && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>
                {winner2026.club}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff' }}>
                {winner2026 ? winner2026.points : '—'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                {winner2026 ? 'points' : 'Voting in progress'}
              </span>
            </div>
          </div>
        </div>

        {/* Historical Winner Cards (2025, 2024) */}
        {[2025, 2024].map((y) => {
          const w = HISTORICAL[y]?.[0];
          const historicalPlayerName = w ? w[0] : '';

          return (
            <div 
              className="winnerCard" 
              key={y}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px',
                minWidth: '240px',
                minHeight: '340px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#121212',
                textAlign: 'left'
              }}
            >
              <WinnerPortrait name={historicalPlayerName} />

              {/* Dark gradient overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 15%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)', zIndex: 1 }} />

              {/* Top Badge */}
              <div style={{ zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  EDITION {y}
                </span>
                <Trophy size={20} color="rgba(255,255,255,0.7)" />
              </div>

              {/* Bottom Content */}
              <div style={{ zIndex: 2 }}>
                <h2 style={{ color: '#fff', fontSize: '1.4rem', margin: '0 0 0.2rem 0', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {historicalPlayerName || '—'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff' }}>
                    {w ? w[1] : ''}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                    {w ? 'points' : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </>
  );
}
