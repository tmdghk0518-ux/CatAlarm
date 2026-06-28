import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import characterVideo from '../assets/character-stretch.webm';
import './cat.css';

function CatOverlay() {
  const videoRef = useRef(null);

  useEffect(() => {
    window.catAlarm?.onCatPlay?.(() => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
    });
  }, []);

  return (
    <main className="character-scene">
      <video
        ref={videoRef}
        className="character-video"
        src={characterVideo}
        aria-label="기지개를 켜는 캐릭터"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
    </main>
  );
}

const root = createRoot(document.querySelector('#root'));
root.render(<CatOverlay />);

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.unmount());
}
