import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import characterVideo from '../assets/character-stretch.webm';
import './cat.css';

function CatOverlay() {
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    window.catAlarm?.onCatPlay?.(() => {
      setPlayKey((value) => value + 1);
    });
  }, []);

  return (
    <main className="character-scene">
      <video
        key={playKey}
        className="character-video"
        src={characterVideo}
        aria-label="기지개를 켜는 캐릭터"
        autoPlay
        loop
        muted
        playsInline
      />
    </main>
  );
}

createRoot(document.querySelector('#root')).render(<CatOverlay />);
