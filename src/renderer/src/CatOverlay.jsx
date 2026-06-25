import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import sprite from '../assets/character-sprite.png';
import './cat.css';

function CatOverlay() {
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    window.catAlarm?.onCatPlay?.(() => {
      setPlayKey((value) => value + 1);
    });
  }, []);

  return (
    <main className="character-scene" key={playKey}>
      <div className="sprite-frame" aria-label="기지개를 펴는 캐릭터" role="img">
        <img className="sprite-strip" src={sprite} alt="" draggable="false" />
      </div>
    </main>
  );
}

createRoot(document.querySelector('#root')).render(<CatOverlay />);
