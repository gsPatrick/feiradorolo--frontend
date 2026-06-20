'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './SearchBar.module.css';
import Icon from '../../atoms/Icon/Icon';

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Buscar produtos, marcas e muito mais...',
}) {
  const [inner, setInner] = useState('');
  const controlled = value !== undefined;
  const current = controlled ? value : inner;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);

  function setText(text) {
    if (!controlled) setInner(text);
    onChange && onChange(text);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit && onSubmit(current);
  }

  function startVoice() {
    const SR =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setError('Seu navegador não suporta busca por voz. Tente o Chrome no computador ou celular.');
      setListening(true);
      return;
    }
    setError('');
    setInterim('');
    setText(''); // limpa a busca anterior ao iniciar uma nova fala
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        const q = finalText.trim();
        setText(q);
        setInterim(q);
        stopVoice();
        // pequena pausa para o usuário ver o que foi captado, então busca.
        setTimeout(() => onSubmit && onSubmit(q), 350);
      }
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Permissão do microfone negada. Libere o acesso ao microfone nas configurações do navegador.');
      } else if (event.error === 'no-speech') {
        setError('Não ouvi nada. Toque no microfone e fale novamente.');
      } else if (event.error !== 'aborted') {
        setError('Não foi possível usar o microfone. Tente novamente.');
      }
    };
    rec.onend = () => {
      recRef.current = null;
      // só fecha o overlay se não houver erro a exibir
      setListening((wasOpen) => wasOpen && false);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError('Não foi possível iniciar o microfone.');
      setListening(true);
    }
  }

  function stopVoice() {
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      recRef.current = null;
    }
  }

  function closeOverlay() {
    stopVoice();
    setListening(false);
    setInterim('');
    setError('');
  }

  // Garante que o reconhecimento pare ao desmontar.
  useEffect(() => () => stopVoice(), []);

  return (
    <>
      <form className={styles.bar} onSubmit={handleSubmit} role="search">
        <Icon name="search" size={20} className={styles.lead} />
        <input
          className={styles.input}
          value={current}
          placeholder={placeholder}
          aria-label="Buscar"
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="button"
          className={`${styles.mic} ${listening ? styles.micActive : ''}`}
          aria-label="Busca por voz"
          onClick={startVoice}
        >
          <Icon name="mic" size={20} />
        </button>
        <button type="submit" className={styles.go} aria-label="Buscar">
          <Icon name="search" size={20} />
        </button>
      </form>

      {listening && (
        <div className={styles.voiceOverlay} role="dialog" aria-modal="true" onClick={closeOverlay}>
          <div className={styles.voiceModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.voiceClose} aria-label="Fechar" onClick={closeOverlay}>
              <Icon name="close" size={18} />
            </button>

            {error ? (
              <>
                <div className={`${styles.voiceMicWrap} ${styles.voiceErr}`}>
                  <Icon name="mic" size={30} />
                </div>
                <p className={styles.voiceTitle}>Ops…</p>
                <p className={styles.voiceHint}>{error}</p>
                <button type="button" className={styles.voiceRetry} onClick={startVoice}>
                  Tentar novamente
                </button>
              </>
            ) : (
              <>
                <div className={styles.voiceMicWrap}>
                  <span className={styles.voicePulse} />
                  <Icon name="mic" size={30} />
                </div>
                <p className={styles.voiceTitle}>Ouvindo…</p>
                <p className={styles.voiceHint}>
                  {interim ? `“${interim}”` : 'Fale o que você procura'}
                </p>
                <button type="button" className={styles.voiceStop} onClick={closeOverlay}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
