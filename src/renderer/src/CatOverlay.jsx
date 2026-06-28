import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import characterVideo from '../assets/character-stretch.webm';
import './cat.css';

function CatOverlay() {
  const videoRef = useRef(null);
  const hitTargetRef = useRef(null);
  const previewRef = useRef(false);
  const interactiveRef = useRef(false);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    const unsubscribe = window.catAlarm?.onCatPlay?.((options) => {
      const preview = Boolean(options?.preview);
      previewRef.current = preview;
      interactiveRef.current = preview;
      setIsPreview(preview);
      if (preview) {
        void window.catAlarm?.setCatInteractive?.(true);
      }

      if (!videoRef.current) return;
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
    });

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const setInteractive = (interactive) => {
      if (previewRef.current || interactiveRef.current === interactive) return;
      interactiveRef.current = interactive;
      void window.catAlarm?.setCatInteractive?.(interactive);
    };

    const handleMouseMove = (event) => {
      const hitTarget = hitTargetRef.current;
      if (!hitTarget) return;

      setInteractive(document.elementFromPoint(event.clientX, event.clientY) === hitTarget);
    };

    const handleMouseLeave = () => setInteractive(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (!previewRef.current) {
        void window.catAlarm?.setCatInteractive?.(false);
      }
    };
  }, []);

  function restartTimer() {
    if (isPreview) return;
    interactiveRef.current = false;
    void window.catAlarm?.restartTimer?.();
  }

  return (
    <main className={`character-scene ${isPreview ? 'is-preview' : 'is-alarm'}`}>
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
      {!isPreview && (
        <button
          ref={hitTargetRef}
          className="character-hit-target"
          type="button"
          aria-label="타이머 다시 시작"
          onClick={restartTimer}
        />
      )}
    </main>
  );
}

const root = createRoot(document.querySelector('#root'));
root.render(<CatOverlay />);

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.unmount());
}
