import React from 'react';
import { Trophy } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HISTORICAL } from '../data/data';

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

      <div className="winnerGrid">
        <div className="winnerCard current" key="2026" style={{ textAlign: 'center' }}>
          <span>EDITION 2026</span>
          {winner2026?.image ? (
            <img
              src={winner2026.image}
              alt={winner2026.name}
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', margin: '0.5rem auto', border: '3px solid #c9a227' }}
            />
          ) : (
            <div className="trophy"><Trophy size={48} /></div>
          )}
          <h2>{winner2026 ? winner2026.name : 'TBA'}</h2>
          <b>{winner2026 ? `${winner2026.points} points` : 'Voting in progress'}</b>
          {winner2026?.club && <p className="muted" style={{ fontSize: '0.85rem' }}>{winner2026.club}</p>}
        </div>

        {[2025, 2024].map((y) => {
          const w = HISTORICAL[y]?.[0];
          return (
            <div className="winnerCard" key={y}>
              <span>EDITION {y}</span>
              <div className="trophy"><Trophy size={48} /></div>
              <h2>{w ? w[0] : '—'}</h2>
              <b>{w ? `${w[1]} points` : ''}</b>
            </div>
          );
        })}
      </div>
    </>
  );
}
