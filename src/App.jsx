
import { useState, useEffect, useRef } from 'react';
import { useButton } from '@react-aria/button';
import { useTextField } from '@react-aria/textfield';
import io from 'socket.io-client';
import './App.css';

// Simple analog clock component for minute selection
// Add props for local cursor preview
function AnalogClock({ value, onChange, disabled, guesses = [], currentMinute = null, animate = false, showLocalCursor = false, localCursorMinute = null, localCursorColor = '#1976d2', localCursorName = '' }) {
  const size = 200;
  const center = size / 2;
  const radius = size / 2 - 20;
  const marks = Array.from({ length: 60 }, (_, i) => i);
  // For outer ring (minutes > 60)
  const outerRadius = radius + 32;
  const outerMarks = Array.from({ length: 60 }, (_, i) => i);


  // Drag state
  const dragging = useRef(false);

  function getMinuteFromEvent(e) {
    const svg = e.target.closest('svg');
    const rect = svg.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left - center;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top - center;
    let angle = Math.atan2(y, x);
    // Normalize angle to [0, 2PI)
    if (angle < -Math.PI / 2) angle += 2 * Math.PI;
    // 0 at top, increases clockwise
    let minute = Math.round(((angle + Math.PI / 2) / (2 * Math.PI)) * 60);
    if (minute < 0) minute += 60;
    // Calculate number of full turns (for > 60 min)
    const pointerDistance = Math.sqrt(x * x + y * y);
    let turns = 1;
    if (pointerDistance > radius - 10) {
      // If dragging outside the clock, count as more turns
      turns = Math.ceil((pointerDistance - (radius - 10)) / 40) + 1;
    }
    const totalMinutes = minute + 60 * (turns - 1);
    return totalMinutes === 0 ? 60 : totalMinutes;
  }

  function handlePointerDown(e) {
    if (disabled) return;
    dragging.current = true;
    const minute = getMinuteFromEvent(e);
    onChange && onChange(String(minute));
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e) {
    if (disabled || !dragging.current) return;
    const minute = getMinuteFromEvent(e);
    onChange && onChange(String(minute));
  }

  function handlePointerUp(e) {
    dragging.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  // For animation, use currentMinute if provided
  const minute = currentMinute !== null ? currentMinute : (Number(value) || 0);
  // Show hand for >60 min
  const handAngle = ((minute % 60) / 60) * 2 * Math.PI - Math.PI / 2;
  const handX = center + Math.cos(handAngle) * (radius - 30);
  const handY = center + Math.sin(handAngle) * (radius - 30);

  // Draw guesses as colored dots
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', background: '#fff', borderRadius: '50%', boxShadow: '0 0 8px #ccc', userSelect: 'none' }}
      onPointerDown={handlePointerDown}
      aria-label="Analog clock minute selector"
      tabIndex={disabled ? -1 : 0}
      role="slider"
      aria-valuenow={minute}
      aria-valuemin={1}
      aria-valuemax={60}
      aria-disabled={disabled}
      onPointerMove={showLocalCursor ? (e) => {
        if (disabled) return;
        if (e.buttons === 1) {
          const min = getMinuteFromEvent(e);
          onChange && onChange(String(min));
        }
      } : undefined}
    >
      {/* Main clock face */}
      <circle cx={center} cy={center} r={radius} fill="#f9f9f9" stroke="#bbb" strokeWidth="4" />
      {/* Outer ring for >60 min */}
      <circle cx={center} cy={center} r={outerRadius} fill="none" stroke="#1976d2" strokeWidth="6" opacity={0.25} />
      {/* Outer ring markers */}
      {outerMarks.map(i => {
        const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
        const x1 = center + Math.cos(a) * (outerRadius - 8);
        const y1 = center + Math.sin(a) * (outerRadius - 8);
        const x2 = center + Math.cos(a) * (outerRadius - (i % 5 === 0 ? 20 : 12));
        const y2 = center + Math.sin(a) * (outerRadius - (i % 5 === 0 ? 20 : 12));
        return <line key={"outer-"+i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1976d2" strokeWidth={i % 5 === 0 ? 3 : 1} opacity={0.5} />;
      })}
      {/* Inner ring markers */}
      {marks.map(i => {
        const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
        const x1 = center + Math.cos(a) * (radius - 8);
        const y1 = center + Math.sin(a) * (radius - 8);
        const x2 = center + Math.cos(a) * (radius - (i % 5 === 0 ? 20 : 12));
        const y2 = center + Math.sin(a) * (radius - (i % 5 === 0 ? 20 : 12));
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#888" strokeWidth={i % 5 === 0 ? 3 : 1} />;
      })}
      {/* Guesses as dots */}
      {guesses.map(({ minute: m, color, gray, name }, idx) => {
        if (m === null || m === undefined) return null;
        const isOuter = m > 60;
        const a = ((m % 60) / 60) * 2 * Math.PI - Math.PI / 2;
        const ring = isOuter ? outerRadius - 20 : (radius - 40);
        const dotX = center + Math.cos(a) * ring;
        const dotY = center + Math.sin(a) * ring;
        return (
          <g key={idx} pointerEvents="none">
            <circle cx={dotX} cy={dotY} r={10} fill={gray ? '#bbb' : color} stroke="#333" strokeWidth="2" />
            <text x={dotX} y={dotY + 5} textAnchor="middle" fontSize="10" fill="#222" style={{ pointerEvents: 'none', userSelect: 'none' }}>{name[0]}</text>
          </g>
        );
      })}
      {/* Local user's guess preview (not yet submitted) */}
      {showLocalCursor && localCursorMinute && !disabled && (
        (() => {
          const m = Number(localCursorMinute);
          if (!m) return null;
          const isOuter = m > 60;
          const a = ((m % 60) / 60) * 2 * Math.PI - Math.PI / 2;
          const ring = isOuter ? outerRadius - 20 : (radius - 40);
          const dotX = center + Math.cos(a) * ring;
          const dotY = center + Math.sin(a) * ring;
          return (
            <g pointerEvents="none">
              <circle cx={dotX} cy={dotY} r={10} fill={localCursorColor} stroke="#333" strokeWidth="2" opacity={0.5} />
              <text x={dotX} y={dotY + 5} textAnchor="middle" fontSize="10" fill="#222" style={{ pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>{localCursorName[0]}</text>
            </g>
          );
        })()
      )}
      {/* Hand */}
      <line x1={center} y1={center} x2={handX} y2={handY} stroke="#1976d2" strokeWidth="5" />
      {/* Center dot */}
      <circle cx={center} cy={center} r={7} fill="#1976d2" />
      {/* Minute label (not clickable) */}
      <text x={center} y={center + 40} textAnchor="middle" fontSize="32" fill="#333" style={{ pointerEvents: 'none', userSelect: 'none' }}>{minute || 0} min</text>
    </svg>
  );
}

const socket = io('http://localhost:4000');

function App() {
  const [sessionId, setSessionId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [userName, setUserName] = useState('');
  const [joined, setJoined] = useState(false);
  const [guess, setGuess] = useState('');
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [winner, setWinner] = useState(null);
  const [session, setSession] = useState(null);
  const [bet, setBet] = useState('');

  // React Aria hooks

  const sessionRef = useRef();
  const { labelProps: sessionLabelProps, inputProps: sessionInputProps } = useTextField({
    label: 'Session ID',
    value: sessionId,
    onChange: setSessionId,
    isRequired: true,
    inputElementType: 'text',
  }, sessionRef);

  const sessionNameRef = useRef();
  const { labelProps: sessionNameLabelProps, inputProps: sessionNameInputProps } = useTextField({
    label: 'Session Name',
    value: sessionName,
    onChange: setSessionName,
    isRequired: false,
    inputElementType: 'text',
  }, sessionNameRef);

  const nameRef = useRef();
  const { labelProps: nameLabelProps, inputProps: nameInputProps } = useTextField({
    label: 'Your Name',
    value: userName,
    onChange: setUserName,
    isRequired: true,
    inputElementType: 'text',
  }, nameRef);


  // No text field for guess, use analog clock instead

  const betRef = useRef();
  const { labelProps: betLabelProps, inputProps: betInputProps } = useTextField({
    label: 'Your Bet (stakes)',
    value: bet,
    onChange: (val) => setBet(val),
    isRequired: true,
    inputElementType: 'text',
    type: 'text',
    name: 'bet',
    autoComplete: 'off',
  }, betRef);

  const joinButtonRef = useRef();
  const { buttonProps: joinButtonProps } = useButton({
    onPress: () => {
      if (sessionId && userName) {
        socket.emit('joinSession', { sessionId, userName, sessionName });
        setJoined(true);
      }
    },
    isDisabled: !(sessionId && userName),
  }, joinButtonRef);

  const guessButtonRef = useRef();
  // User can always update their guess before meeting starts

  const { buttonProps: guessButtonProps } = useButton({
    onPress: () => {
      if (guess && bet && sessionId && !meetingStarted) {
        socket.emit('submitGuess', { sessionId, guess: guess.toString(), bet: bet.toString() });
      }
    },
    isDisabled: !(guess && bet && joined) || meetingStarted,
  }, guessButtonRef);

  const startButtonRef = useRef();
  const { buttonProps: startButtonProps } = useButton({
    onPress: () => {
      setMeetingStarted(true);
      // Optionally, emit a socket event to notify all users
      socket.emit('startMeeting', { sessionId });
    },
    isDisabled: meetingStarted || !joined,
  }, startButtonRef);

  useEffect(() => {
    socket.on('sessionUpdate', (data) => {
      setSession(data);
    });
    socket.on('meetingStarted', (payload) => {
      setMeetingStarted(true);
      setMeetingEnded(false);
      setWinner(null);
      if (payload && typeof payload.elapsed === 'number') {
        setElapsed(payload.elapsed);
      } else {
        setElapsed(0);
      }
    });
    socket.on('meetingEnded', ({ elapsed, winner }) => {
      setMeetingEnded(true);
      setMeetingStarted(false);
      setElapsed(elapsed);
      setWinner(winner);
    });
    return () => {
      socket.off('sessionUpdate');
      socket.off('meetingStarted');
      socket.off('meetingEnded');
    };
  }, []);

  // Animate clock when meeting started
  useEffect(() => {
    if (meetingStarted && !meetingEnded) {
      const interval = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000 * 1); // 1 second = 1 minute for demo
      return () => clearInterval(interval);
    }
  }, [meetingStarted, meetingEnded]);

  // Prepare guesses for clock (only show if submitted)
  const guessList = session && session.users ? Object.entries(session.users).map(([id, name], idx) => {
    const g = session.guesses && session.guesses[id] ? session.guesses[id] : null;
    const minute = g && g.guess ? Number(g.guess) : null;
    // Assign a color per user
    const color = ["#1976d2", "#e53935", "#43a047", "#fbc02d", "#8e24aa", "#00897b", "#6d4c41"][idx % 7];
    // Gray out if passed
    const gray = meetingStarted && elapsed > 0 && minute !== null && elapsed > minute;
    // Only show if guess is submitted
    if (minute === null || isNaN(minute)) return null;
    return { minute, color, gray, name };
  }).filter(Boolean) : [];

  // Find local user's color
  const myIdx = session && session.users ? Object.values(session.users).findIndex(n => n === userName) : 0;
  const myColor = ["#1976d2", "#e53935", "#43a047", "#fbc02d", "#8e24aa", "#00897b", "#6d4c41"][myIdx % 7];

  return (
    <main>
      <h1>Meeting Time Gambling</h1>
      {!joined ? (
        <form className="card" onSubmit={e => { e.preventDefault(); joinButtonProps.onPress(); }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label {...sessionLabelProps}>Session ID</label><br />
            <input {...sessionInputProps} ref={sessionRef} style={{ marginRight: 8 }} />
            <button
              type="button"
              style={{ padding: '4px 12px', fontSize: 14 }}
              onClick={() => {
                // Generate 4 random uppercase letters/numbers
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let id = '';
                for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
                setSessionId(id);
              }}
            >
              Create Session
            </button>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label {...sessionNameLabelProps}>Session Name</label><br />
            <input {...sessionNameInputProps} ref={sessionNameRef} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label {...nameLabelProps}>Your Name</label><br />
            <input {...nameInputProps} ref={nameRef} />
          </div>
          <button {...joinButtonProps} ref={joinButtonRef}>
            Join Session
          </button>
        </form>
      ) : (
        <section className="card">
          <div style={{ marginBottom: 16 }}>
            <label id="clock-label">Select Your Guess (minutes)</label><br />
            <AnalogClock
              value={guess}
              onChange={!meetingStarted ? setGuess : undefined}
              disabled={meetingStarted || meetingEnded}
              guesses={guessList}
              currentMinute={meetingStarted ? elapsed : null}
              animate={meetingStarted}
              aria-labelledby="clock-label"
              showLocalCursor={!guess && !meetingStarted && !meetingEnded && joined}
              localCursorMinute={guess}
              localCursorColor={myColor}
              localCursorName={userName}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label {...betLabelProps}>Your Bet (stakes)</label><br />
            <input {...betInputProps} ref={betRef} disabled={meetingStarted || meetingEnded} />
          </div>
          <button {...guessButtonProps} ref={guessButtonRef} disabled={meetingStarted || meetingEnded}>
            Submit Guess
          </button>
          <button {...startButtonProps} ref={startButtonRef} style={{ marginLeft: 16 }} disabled={meetingStarted || meetingEnded}>
            Start Meeting
          </button>
          <button
            style={{ marginLeft: 16 }}
            disabled={!meetingStarted || meetingEnded}
            onClick={() => {
              setMeetingEnded(true);
              setMeetingStarted(false);
              // Find winner: closest guess not over elapsed
              const valid = guessList.filter(g => g.minute !== null && g.minute <= elapsed && !isNaN(g.minute));
              let winner = null;
              if (valid.length > 0) {
                const closest = valid.reduce((a, b) => (elapsed - a.minute < elapsed - b.minute ? a : b));
                winner = closest;
              }
              setWinner(winner);
              socket.emit('meetingEnded', { sessionId, elapsed, winner });
            }}
          >
            End Meeting
          </button>
          <h2 style={{ marginTop: 32 }}>
            Session: <span style={{ fontWeight: 'normal' }}>{sessionId}</span>
          </h2>
          <div style={{ margin: '8px 0', fontSize: 16 }}>
            <label htmlFor="sessionNameEdit"><strong>Session Name:</strong></label>{' '}
            <input
              id="sessionNameEdit"
              type="text"
              value={session?.sessionName || sessionName}
              onChange={e => {
                setSessionName(e.target.value);
                // Update session name for all users
                socket.emit('joinSession', { sessionId, userName, sessionName: e.target.value });
              }}
              disabled={!joined}
              style={{ fontSize: 16, marginLeft: 8, minWidth: 120 }}
            />
          </div>
          <div style={{ margin: '8px 0', fontSize: 16 }}>
            <strong>Connected Users:</strong>
            <ul style={{ listStyle: 'disc', marginLeft: 24 }}>
              {session && session.users && Object.entries(session.users).map(([id, name], idx) => {
                // Show user's color and a circle
                return (
                  <li key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: ["#1976d2", "#e53935", "#43a047", "#fbc02d", "#8e24aa", "#00897b", "#6d4c41"][idx % 7], border: '2px solid #333' }} />
                    {name}
                  </li>
                );
              })}
            </ul>
          </div>
          <div style={{ margin: '16px 0', fontSize: 18 }}>
            {meetingStarted && !meetingEnded && <span>Elapsed: {elapsed} min</span>}
            {meetingEnded && (
              winner ? <span>Winner: <strong>{winner.name}</strong> ({winner.minute} min)</span> : <span>No winner</span>
            )}
          </div>
          <ul style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
            {session && session.users && Object.entries(session.users).map(([id, name]) => (
              <li key={id}>
                <strong>{name}:</strong> {session.guesses && session.guesses[id] && session.guesses[id].guess !== undefined && session.guesses[id].bet !== undefined
                  ? `${session.guesses[id].guess} min, Bet: ${session.guesses[id].bet}`
                  : <em>No guess yet</em>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default App;
