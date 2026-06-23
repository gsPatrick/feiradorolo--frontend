'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './SearchBar.module.css';
import Icon from '../../atoms/Icon/Icon';
import { productService } from '@/lib/api';

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

  // Autocomplete (sugestões)
  const [suggestions, setSuggestions] = useState([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const formRef = useRef(null);
  const debounceRef = useRef(null);
  const reqRef = useRef(0);

  function setText(text) {
    if (!controlled) setInner(text);
    onChange && onChange(text);
  }

  // Busca sugestões com debounce (~250ms) quando o dropdown está aberto.
  useEffect(() => {
    if (!sugOpen) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const reqId = (reqRef.current += 1);
      try {
        const list = await productService.suggestions(current);
        if (reqId !== reqRef.current) return; // ignora respostas obsoletas
        setSuggestions(Array.isArray(list) ? list : []);
        setActiveIdx(-1);
      } catch {
        if (reqId === reqRef.current) setSuggestions([]);
      }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [current, sugOpen]);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    if (!sugOpen) return undefined;
    function onDoc(e) {
      if (formRef.current && !formRef.current.contains(e.target)) setSugOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [sugOpen]);

  function pickSuggestion(term) {
    setText(term);
    setSugOpen(false);
    onSubmit && onSubmit(term);
  }

  function handleKeyDown(e) {
    if (!sugOpen || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIdx].term);
    } else if (e.key === 'Escape') {
      setSugOpen(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSugOpen(false);
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
      <form
        ref={formRef}
        className={styles.bar}
        onSubmit={handleSubmit}
        role="search"
        autoComplete="off"
      >
        <Icon name="search" size={20} className={styles.lead} />
        <input
          className={styles.input}
          value={current}
          placeholder={placeholder}
          aria-label="Buscar"
          role="combobox"
          aria-expanded={sugOpen}
          aria-autocomplete="list"
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setSugOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {sugOpen && suggestions.length > 0 && (
          <ul className={styles.suggestions} role="listbox">
            {suggestions.map((s, i) => (
              <li key={`${s.term}-${i}`} role="option" aria-selected={i === activeIdx}>
                <button
                  type="button"
                  className={`${styles.sugItem} ${i === activeIdx ? styles.sugActive : ''}`}
                  // onMouseDown evita que o blur feche o dropdown antes do clique.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickSuggestion(s.term);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  <Icon name="search" size={16} className={styles.sugIcon} />
                  <span className={styles.sugText}>{s.term}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
