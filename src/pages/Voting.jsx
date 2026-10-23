import React from 'react';
import { CheckCircle2, RotateCcw, ShieldCheck, AlertTriangle, UserRound, ArrowRightLeft } from 'lucide-react';
import { NOMINEES_2026 } from '../data/data';
import { submitVote } from '../firebase/votes';

function PlayerPortrait({ name }) {
  const [src, setSrc] = React.useState('');
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setSrc('');
    setFailed(false);
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
    <div className="playerPortrait">
      {src && !failed ? <img src={src} alt={`${name} portrait`} loading="lazy" onError={() => setFailed(true)} /> : <span className="portraitFallback"><UserRound size={30} /></span>}
    </div>
  );
}

export default function Voting() {
  const [rankByPlayer, setRankByPlayer] = React.useState({});
  const [code, setCode] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [pendingChange, setPendingChange] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const rankedCount = Object.values(rankByPlayer).filter(rank => Number.isInteger(rank)).length;
  const usedRanks = React.useMemo(() => {
    const result = {};
    Object.entries(rankByPlayer).forEach(([playerId, rank]) => {
      if (Number.isInteger(rank)) result[rank] = playerId;
    });
    return result;
  }, [rankByPlayer]);

  const chooseRank = (playerId, rawRank) => {
    setStatus('');
    if (rawRank === '') {
      setRankByPlayer(previous => {
        const next = { ...previous };
        delete next[playerId];
        return next;
      });
      setPendingChange(null);
      return;
    }
    const rank = Number(rawRank);
    const ownerId = usedRanks[rank];
    if (ownerId && ownerId !== playerId) {
      setPendingChange({ playerId, rank, ownerId, previousRank: rankByPlayer[playerId] ?? null });
      return;
    }
    setRankByPlayer(previous => ({ ...previous, [playerId]: rank }));
    setPendingChange(null);
  };

  const resolveDuplicate = (swap) => {
    if (!pendingChange) return;
    const { playerId, rank, ownerId, previousRank } = pendingChange;
    setRankByPlayer(previous => {
      const next = { ...previous };
      if (swap && previousRank !== null) next[ownerId] = previousRank;
      else delete next[ownerId];
      next[playerId] = rank;
      return next;
    });
    setPendingChange(null);
    setStatus(swap && previousRank !== null
      ? `Ranks swapped: ${rank} and ${previousRank}.`
      : `Rank ${rank} assigned to ${NOMINEES_2026.find(player => player.id === playerId)?.name}; the other player is now unranked.`);
  };

  const reset = () => {
    setRankByPlayer({});
    setPendingChange(null);
    setStatus('All ranks cleared. Start assigning positions from 1 to 30.');
  };

  const submit = async () => {
    if (!code.trim()) return setStatus('Enter your voter code first.');
    if (rankedCount !== NOMINEES_2026.length) return setStatus(`Rank all 30 players before submitting. You have ranked ${rankedCount} of 30.`);
    const ranks = Object.values(rankByPlayer);
    if (new Set(ranks).size !== 30 || ranks.some(rank => rank < 1 || rank > 30)) return setStatus('Each player must have a unique rank from 1 to 30.');

    const rankings = NOMINEES_2026.map(player => ({
      playerId: player.id,
      rank: rankByPlayer[player.id],
      points: 31 - rankByPlayer[player.id],
    })).sort((a, b) => a.rank - b.rank);

    setSubmitting(true);
    setStatus('Submitting your ballot…');
    try {
      const result = await submitVote({ voterCode: code, rankings });
      setSubmitted(true);
      setStatus(result.mode === 'demo'
        ? 'Demo vote saved on this device. Firebase is not connected yet.'
        : 'Vote submitted successfully. Your ballot is locked.');
    } catch (error) {
      setStatus(error.message || 'Unable to submit vote.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return <div className="center"><CheckCircle2 size={62} /><div className="eyebrow">BALLOT RECEIVED</div><h1 className="success">Your vote is in.</h1><p className="muted">Thanks for taking part in Balon Dor Rank 2026. Your ballot has been locked.</p><p className="message">{status}</p></div>;

  return <>
    <div className="pageHead">
      <div className="eyebrow">2026 BALLOT</div>
      <h1>Give every rank a name.</h1>
      <p>Choose a unique position for each nominee. Rank 1 earns 30 points; rank 30 earns 1 point. If you reuse a rank, we'll flag it before applying the change.</p>
    </div>

    <div className="ballotProgress panel">
      <div><strong>{rankedCount} / 30</strong><span>players ranked</span></div>
      <div className="progressTrack" aria-label={`${rankedCount} of 30 players ranked`}><span style={{ width: `${rankedCount / 30 * 100}%` }} /></div>
      <div className="progressPoints">{rankedCount === 30 ? 'Ballot complete' : `${30 - rankedCount} left`}</div>
    </div>

    {pendingChange && <div className="duplicateWarning" role="alert">
      <AlertTriangle size={22} />
      <div className="duplicateCopy">
        <strong>Rank {pendingChange.rank} is already in use.</strong>
        <p><b>{NOMINEES_2026.find(p => p.id === pendingChange.ownerId)?.name}</b> currently holds rank {pendingChange.rank}. {NOMINEES_2026.find(p => p.id === pendingChange.playerId)?.name} can't use the same position.</p>
        <div className="duplicateActions">
          {pendingChange.previousRank !== null && <button className="primary" onClick={() => resolveDuplicate(true)}><ArrowRightLeft size={15} /> Swap ranks</button>}
          <button className="secondary" onClick={() => resolveDuplicate(false)}>Use rank here</button>
          <button className="textButton" onClick={() => setPendingChange(null)}>Cancel</button>
        </div>
        <small>{pendingChange.previousRank !== null ? 'Swap ranks to keep both players ranked, or assign this rank here and leave the other player unranked.' : 'Assign this rank here to unrank the player who currently holds it, or cancel.'}</small>
      </div>
    </div>}

    <div className="votingWorkspace">
      <section className="playerCardGrid" aria-label="2026 nominees">
        {NOMINEES_2026.map((player) => {
          const rank = rankByPlayer[player.id] ?? '';
          const points = rank ? 31 - rank : null;
          const isPending = pendingChange?.playerId === player.id;
          return <article className={`playerCard ${rank ? 'isRanked' : ''} ${isPending ? 'isPending' : ''}`} key={player.id}>
            <div className="playerCardTop">
              <PlayerPortrait name={player.name} />
              <div className="playerCardName"><h3>{player.name}</h3><span>{rank ? `Rank ${rank}` : 'Not ranked yet'}</span></div>
              {rank && <div className="rankBadge">#{rank}</div>}
            </div>
            <div className="rankControl">
              <label htmlFor={`rank-${player.id}`}>Assign rank</label>
              <select id={`rank-${player.id}`} value={rank} onChange={event => chooseRank(player.id, event.target.value)} aria-label={`Assign rank to ${player.name}`}>
                <option value="">Choose 1–30</option>
                {Array.from({ length: 30 }, (_, index) => index + 1).map(position => <option value={position} key={position}>{position}{usedRanks[position] && usedRanks[position] !== player.id ? ` · used by ${NOMINEES_2026.find(p => p.id === usedRanks[position])?.name}` : ''}</option>)}
              </select>
              <span className="pointsValue">{points === null ? '— pts' : `${points} pts`}</span>
            </div>
          </article>;
        })}
      </section>

      <aside className="panel submitBox ballotSubmitBox">
        <ShieldCheck size={21} />
        <h3>Submit ballot</h3>
        <p className="muted submitIntro">Your ballot must contain every rank exactly once.</p>
        <div className="submitSummary"><span>Ranked</span><strong>{rankedCount}/30</strong></div>
        <div className="submitSummary"><span>Unique ranks used</span><strong>{Object.keys(usedRanks).length}/30</strong></div>
        <label htmlFor="code">Voter code</label>
        <input id="code" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="e.g. BALON26-A7F2" autoComplete="off" />
        <small className="muted">Each voter code can submit one ballot.</small>
        <button className="primary full" onClick={submit} disabled={submitting || rankedCount !== 30}>{submitting ? 'Submitting…' : 'Submit my vote'}</button>
        <button className="secondary full" onClick={reset} disabled={submitting}><RotateCcw size={15} /> Clear all ranks</button>
        {status && <p className="message" role="status">{status}</p>}
      </aside>
    </div>
  </>;
}
