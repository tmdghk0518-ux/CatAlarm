import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const DEFAULT_DURATION = 30 * 60;
const MAX_MINUTES = 99;
const MAX_SECONDS = 59;
const DURATION_KEY = 'catAlarm.duration';
const CUSTOM_POSITION_KEY = 'catAlarm.customPosition';
const POSITIONS = [
  ['bottom-right', '우하단'],
  ['bottom-left', '좌하단'],
  ['top-right', '우상단'],
  ['top-left', '좌상단'],
  ['top', '상단'],
  ['bottom', '하단'],
  ['left', '좌측'],
  ['right', '우측'],
  ['center', '중앙'],
  ['random', '랜덤'],
  ['custom', '직접']
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadDuration() {
  const saved = Number(localStorage.getItem(DURATION_KEY));
  return Number.isFinite(saved) && saved > 0 ? clamp(saved, 1, MAX_MINUTES * 60 + MAX_SECONDS) : DEFAULT_DURATION;
}

function loadCustomPosition() {
  try {
    const value = JSON.parse(localStorage.getItem(CUSTOM_POSITION_KEY));
    return Number.isFinite(value?.x) && Number.isFinite(value?.y) ? value : null;
  } catch {
    return null;
  }
}

function splitTime(totalSeconds) {
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60
  };
}

function TimeField({ label, value, min, max, disabled, onChange }) {
  const commit = (nextValue) => onChange(clamp(nextValue, min, max));
  const handleInput = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 2);
    commit(digits === '' ? 0 : Number(digits));
  };

  return (
    <div className="time-wheel" aria-label={label}>
      <button type="button" aria-label={`${label} 올리기`} disabled={disabled || value >= max} onClick={() => commit(value + 1)}>
        ▲
      </button>
      <input
        aria-label={label}
        disabled={disabled}
        inputMode="numeric"
        maxLength={2}
        pattern="[0-9]*"
        value={pad(value)}
        onChange={handleInput}
        onFocus={(event) => event.target.select()}
      />
      <span>{label}</span>
      <button type="button" aria-label={`${label} 내리기`} disabled={disabled || value <= min} onClick={() => commit(value - 1)}>
        ▼
      </button>
    </div>
  );
}

function App() {
  const initialDuration = useMemo(loadDuration, []);
  const [duration, setDuration] = useState(initialDuration);
  const [remaining, setRemaining] = useState(initialDuration);
  const [progressRatio, setProgressRatio] = useState(1);
  const [status, setStatus] = useState('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [position, setPosition] = useState(localStorage.getItem('catAlarm.position') ?? 'bottom-right');
  const [customPosition, setCustomPosition] = useState(loadCustomPosition);
  const [size, setSize] = useState(Number(localStorage.getItem('catAlarm.size')) || 100);
  const [message, setMessage] = useState('준비 완료');
  const frameRef = useRef(null);
  const deadlineRef = useRef(0);

  const remainingTime = useMemo(() => splitTime(remaining), [remaining]);
  const durationTime = useMemo(() => splitTime(duration), [duration]);
  const ringStyle = {
    background: `conic-gradient(#c58b52 ${progressRatio * 360}deg, rgba(197, 139, 82, 0.18) 0deg)`
  };

  useEffect(() => {
    localStorage.setItem('catAlarm.position', position);
  }, [position]);

  useEffect(() => {
    localStorage.setItem('catAlarm.size', String(size));
  }, [size]);

  useEffect(() => {
    localStorage.setItem(DURATION_KEY, String(duration));
  }, [duration]);

  useEffect(() => {
    if (customPosition) {
      localStorage.setItem(CUSTOM_POSITION_KEY, JSON.stringify(customPosition));
    }
  }, [customPosition]);

  useEffect(() => {
    const unsubscribeMoved = window.catAlarm?.onCatMoved?.((bounds) => {
      setCustomPosition({ x: bounds.x, y: bounds.y });
      setPosition('custom');
      setMessage('직접 위치 저장됨');
    });
    const unsubscribeDismissed = window.catAlarm?.onCatDismissed?.(() => {
      setPreviewActive(false);
      setStatus('idle');
      setRemaining(duration);
      setProgressRatio(1);
      setMessage('준비 완료');
    });
    const unsubscribeRestart = window.catAlarm?.onCatRestart?.(() => {
      start(duration);
    });
    const unsubscribeError = window.catAlarm?.onCatError?.((error) => {
      setPreviewActive(false);
      setStatus('idle');
      setMessage(`표시 오류: ${error}`);
    });

    return () => {
      unsubscribeMoved?.();
      unsubscribeDismissed?.();
      unsubscribeRestart?.();
      unsubscribeError?.();
    };
  }, [duration]);

  function updateDuration(minutes, seconds) {
    const safeMinutes = clamp(Number(minutes) || 0, 0, MAX_MINUTES);
    const safeSeconds = clamp(Number(seconds) || 0, 0, MAX_SECONDS);
    const next = Math.max(1, safeMinutes * 60 + safeSeconds);
    setDuration(next);
    if (status === 'idle') {
      setRemaining(next);
      setProgressRatio(1);
    }
  }

  function start(seconds = remaining || duration) {
    window.cancelAnimationFrame(frameRef.current);
    window.catAlarm?.hideCat?.();
    setPreviewActive(false);
    deadlineRef.current = performance.now() + seconds * 1000;
    setRemaining(seconds);
    setProgressRatio(seconds / duration);
    setStatus('running');
    setMessage('타이머 실행 중');

    const renderFrame = () => {
      const msLeft = Math.max(0, deadlineRef.current - performance.now());
      setRemaining(Math.ceil(msLeft / 1000));
      setProgressRatio(Math.max(0, Math.min(1, msLeft / (duration * 1000))));

      if (msLeft <= 0) {
        window.cancelAnimationFrame(frameRef.current);
        showCat(false);
        return;
      }

      frameRef.current = window.requestAnimationFrame(renderFrame);
    };

    frameRef.current = window.requestAnimationFrame(renderFrame);
  }

  function pause() {
    if (status === 'paused') {
      start(remaining);
      return;
    }

    window.cancelAnimationFrame(frameRef.current);
    setStatus('paused');
    setMessage('일시정지');
  }

  function stop() {
    window.cancelAnimationFrame(frameRef.current);
    window.catAlarm?.hideCat?.();
    setPreviewActive(false);
    setStatus('idle');
    setRemaining(duration);
    setProgressRatio(1);
    setMessage('준비 완료');
  }

  function showCat(preview) {
    setPreviewActive(preview);
    setStatus(preview ? status : 'cat');
    setMessage(preview ? '드래그로 위치 조절' : '휴식 시간');

    window.catAlarm?.showCat?.({ position, customPosition, sizePercent: size, preview }).catch((error) => {
      setPreviewActive(false);
      setMessage(`표시 오류: ${error?.message ?? error}`);
    });
  }

  function closeSettings() {
    setSettingsOpen(false);
    if (previewActive) {
      window.catAlarm?.hideCat?.();
      setPreviewActive(false);
      setMessage('준비 완료');
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <button className="icon-button close-button" type="button" aria-label="닫기" onClick={() => window.catAlarm?.closeApp?.()}>
          ×
        </button>
        <div>
          <p>CatAlarm</p>
          <h1>휴식 타이머</h1>
        </div>
        <button className="icon-button" type="button" aria-label="설정" onClick={() => setSettingsOpen(true)}>
          ⚙
        </button>
      </header>

      <section className="timer-core">
        <div className="timer-ring" style={ringStyle}>
          <div className="timer-face">
            <strong>
              {pad(remainingTime.minutes)}:{pad(remainingTime.seconds)}
            </strong>
            <span>{message}</span>
          </div>
        </div>
      </section>

      <section className="duration-strip" aria-label="타이머 설정">
        <TimeField
          label="분"
          value={durationTime.minutes}
          min={0}
          max={MAX_MINUTES}
          disabled={status !== 'idle'}
          onChange={(minutes) => updateDuration(minutes, durationTime.seconds)}
        />
        <TimeField
          label="초"
          value={durationTime.seconds}
          min={0}
          max={MAX_SECONDS}
          disabled={status !== 'idle'}
          onChange={(seconds) => updateDuration(durationTime.minutes, seconds)}
        />
      </section>

      <div className="quick-row">
        {[5, 10, 30, 60].map((minutes) => (
          <button key={minutes} type="button" disabled={status !== 'idle'} onClick={() => updateDuration(minutes, 0)}>
            {minutes}분
          </button>
        ))}
      </div>

      <footer className="control-bar">
        <button className="primary" type="button" aria-label="시작" disabled={status === 'running' || status === 'cat'} onClick={() => start()}>
          ▶
        </button>
        <button type="button" aria-label={status === 'paused' ? '재개' : '일시정지'} disabled={status === 'idle' || status === 'cat'} onClick={pause}>
          {status === 'paused' ? '▶' : 'Ⅱ'}
        </button>
        <button type="button" aria-label="중지" disabled={status === 'idle'} onClick={stop}>
          ■
        </button>
      </footer>

      {settingsOpen && (
        <aside className="settings-layer" role="dialog" aria-modal="true" aria-label="설정">
          <section className="settings-panel">
            <div className="settings-head">
              <div>
                <p>Settings</p>
                <h2>등장 설정</h2>
              </div>
              <button className="icon-button" type="button" aria-label="닫기" onClick={closeSettings}>
                ×
              </button>
            </div>

            <div className="setting-block">
              <h3>위치</h3>
              <div className="position-grid">
                {POSITIONS.map(([value, label]) => (
                  <button className={position === value ? 'is-selected' : ''} key={value} type="button" onClick={() => setPosition(value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="size-slider">
              <span>크기</span>
              <strong>{size}%</strong>
              <input min="60" max="180" step="5" type="range" value={size} onChange={(event) => setSize(Number(event.target.value))} />
            </label>

            <button className="preview-button" type="button" onClick={() => showCat(true)}>
              화면 미리보기
            </button>
          </section>
        </aside>
      )}
    </main>
  );
}

createRoot(document.querySelector('#root')).render(<App />);
