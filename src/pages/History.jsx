import React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HISTORICAL } from '../data/data';
import YearSelector from '../components/YearSelector';
import RankingList from '../components/RankingList';

export default function History() {
  const [year, setYear] = React.useState(2025);
  const [rows2026, setRows2026] = React.useState([]);

  React.useEffect(() => {
    async function loadHistory2026() {
      if (year === 2026) {
        try {
          const snap = await getDoc(doc(db, 'results', '2026'));
          if (snap.exists()) {
            const data = snap.data().rankings || [];
            setRows2026(data.map(r => ({ name: r.name, points: r.points, club: r.club, image: r.image })));
          } else {
            setRows2026([]);
          }
        } catch (err) {
          console.error('Error loading 2026 history:', err);
        }
      }
    }
    loadHistory2026();
  }, [year]);

  const rows = year === 2026 
    ? rows2026 
    : (HISTORICAL[year] || []).map(([name, points]) => ({ name, points }));

  return (
    <>
      <div className="pageHead">
        <div className="eyebrow">ARCHIVE</div>
        <h1>History.</h1>
        <p>Explore previous community ballots and compare how the ranking evolved.</p>
      </div>
      <YearSelector year={year} setYear={setYear} />
      <RankingList rows={rows} />
    </>
  );
}
