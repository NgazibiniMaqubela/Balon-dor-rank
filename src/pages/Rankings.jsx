import React from 'react';
import {getPublishedResults} from '../firebase/votes';
import {HISTORICAL} from '../data/data';
import RankingList from '../components/RankingList';
import YearSelector from '../components/YearSelector';

function rowsFor(year,published){
  if(year!==2026)return HISTORICAL[year].map(([name,points])=>({name,points}));
  return (published?.rows||[]).map(r=>({name:r.name,playerId:r.playerId,points:r.points}));
}

export default function Rankings(){
  const[year,setYear]=React.useState(2026);
  const[published,setPublished]=React.useState(null);
  React.useEffect(()=>{setPublished(null);if(year===2026)getPublishedResults(2026).then(setPublished).catch(()=>setPublished(null));},[year]);
  const rows=rowsFor(year,published);
  const has=year!==2026||rows.length>0;
  return <><div className="pageHead"><div className="eyebrow">COMMUNITY RESULTS</div><h1>Rankings.</h1><p>2026 results remain private until the administrator publishes the final results.</p></div><YearSelector year={year} setYear={setYear}/>{year===2026&&!has?<div className="panel empty"><h3>2026 voting is open</h3><p className="muted">The leaderboard is currently hidden. Once voting closes and the final results are published, the 2026 ranking will appear here.</p></div>:<><div className="podium">{rows.slice(0,3).map((r,i)=><div className={'pod '+(i===0?'winner':'')} key={r.name}><span>#{i+1}</span><h2>{r.name}</h2><b>{r.points}</b><small>points</small></div>)}</div><RankingList rows={rows}/></>}</>
}
