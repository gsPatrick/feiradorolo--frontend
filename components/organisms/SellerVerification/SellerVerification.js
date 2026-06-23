'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Modal from '@/components/organisms/Modal/Modal';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Checkbox from '@/components/atoms/Checkbox/Checkbox';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { verificationService, uploadImage, ApiError } from '@/lib/api';
import { cx } from '@/lib/cx';
import { maskCPF, maskCNPJ, onlyDigits, maskPhone, isCPF, isCNPJ } from '@/lib/masks';
import styles from './SellerVerification.module.css';

const STEPS = [
  { n: 1, label: 'Tipo de Loja' },
  { n: 2, label: 'Informações' },
  { n: 3, label: 'Finalizar' },
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const NATIONALITIES = ['Brasil', 'Portugal', 'Argentina', 'Estados Unidos', 'Outra'];

const MAX_UPLOAD = 4 * 1024 * 1024; // ~4MB
const ACCEPT = 'image/jpeg,image/jpg,image/png';

function friendlyError(e, fallback) {
  if (e instanceof ApiError && e.message) return e.message;
  return fallback;
}

/* ===== Bloco de verificação de um canal (e-mail/telefone) ===== */
function ContactChannel({
  title, icon, verified, onRequest, onConfirm, sentLabel, children,
}) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const [warn, setWarn] = useState('');

  async function request() {
    setSending(true);
    setWarn('');
    try {
      await onRequest();
      setSent(true);
      toast({ title: 'Código enviado!', variant: 'success', duration: 1800 });
    } catch (e) {
      setWarn(friendlyError(e, 'Não foi possível enviar o código. Tente novamente.'));
    } finally {
      setSending(false);
    }
  }

  async function confirm() {
    const clean = onlyDigits(code);
    if (clean.length !== 6) {
      setWarn('Digite o código de 6 dígitos.');
      return;
    }
    setConfirming(true);
    setWarn('');
    try {
      await onConfirm(clean);
      toast({ title: 'Verificado com sucesso!', variant: 'success', duration: 1800 });
    } catch (e) {
      setWarn(friendlyError(e, 'Código inválido ou expirado. Confira ou reenvie um novo.'));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className={styles.verifyBlock}>
      <div className={styles.verifyHead}>
        <span className={styles.verifyTitle}>
          <Icon name={icon} size={16} /> {title}
        </span>
        {verified && (
          <span className={styles.okBadge}>
            <Icon name="check" size={14} /> Verificado
          </span>
        )}
      </div>

      {children}

      {!verified && (
        <>
          <div className={styles.row}>
            <Button variant="outline" size="sm" loading={sending} onClick={request}>
              {sent ? 'Reenviar código' : sentLabel}
            </Button>
          </div>
          {sent && (
            <div className={styles.row}>
              <Input
                className={styles.grow}
                inputMode="numeric"
                maxLength={6}
                placeholder="Código de 6 dígitos"
                value={code}
                onChange={(e) => setCode(onlyDigits(e.target.value).slice(0, 6))}
              />
              <Button size="sm" loading={confirming} onClick={confirm}>Confirmar</Button>
            </div>
          )}
          {warn && <div className={styles.warn}>{warn}</div>}
        </>
      )}
    </div>
  );
}

/* ===== Caixa de upload de documento ===== */
function UploadBox({ label, url, uploading, onPick, onRemove }) {
  const ref = useRef(null);
  return (
    <div
      className={styles.uploadBox}
      onClick={() => !uploading && ref.current && ref.current.click()}
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className={styles.uploadPreview} />
          <button
            type="button"
            className={styles.uploadRemove}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label={`Remover ${label}`}
          >
            <Icon name="close" size={14} />
          </button>
        </>
      ) : (
        <>
          <span className={styles.uploadPlus}>
            <Icon name={uploading ? 'package' : 'plus'} size={20} />
          </span>
          <span className={styles.uploadLabel}>{uploading ? 'Enviando…' : label}</span>
          <span className={styles.uploadHint}>JPG ou PNG, até 4MB</span>
        </>
      )}
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          e.target.value = '';
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

/**
 * Wizard de Verificação de Vendedor (KYC) em 3 passos.
 * Props: open, onClose, user (usuário logado, p/ pré-preencher e-mail/nome),
 *        onSubmitted (callback após envio bem-sucedido).
 */
export default function SellerVerification({ open, onClose, user, onSubmitted }) {
  const { toast } = useToast();

  const [step, setStep] = useState(1);

  // Passo 1
  const [personType, setPersonType] = useState('PF');

  // Passo 2
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Passo 3
  const [fullName, setFullName] = useState('');
  const [nationality, setNationality] = useState('Brasil');
  const [document, setDocument] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [frontUploading, setFrontUploading] = useState(false);
  const [backUploading, setBackUploading] = useState(false);

  // QR facial
  const [qrUrl, setQrUrl] = useState('');
  const [qrExpires, setQrExpires] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isPJ = personType === 'PJ';

  // Reseta tudo ao abrir.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPersonType('PF');
    setEmailVerified(false);
    setPhoneVerified(false);
    setPhone('');
    setAgreed(false);
    setFullName((user && user.name) || '');
    setNationality('Brasil');
    setDocument('');
    setBirthDay(''); setBirthMonth(''); setBirthYear('');
    setFrontUrl(''); setBackUrl('');
    setQrUrl(''); setQrExpires(null); setSecondsLeft(0);
    setError('');
  }, [open, user]);

  // Pré-preenche o status já verificado do usuário ao abrir o passo 2.
  useEffect(() => {
    if (!open) return;
    verificationService
      .status()
      .then((s) => {
        if (s && s.email_verified) setEmailVerified(true);
        if (s && s.phone_verified) setPhoneVerified(true);
      })
      .catch(() => {});
  }, [open]);

  // Cronômetro do QR.
  useEffect(() => {
    if (!qrExpires) return undefined;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(qrExpires).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [qrExpires]);

  const generateQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await verificationService.facialSession();
      if (res && res.url) {
        setQrUrl(res.url);
        setQrExpires(res.expires_at || new Date(Date.now() + 10 * 60 * 1000).toISOString());
      }
    } catch (e) {
      toast({ title: 'Falha ao gerar QR', description: friendlyError(e, 'Tente novamente.'), variant: 'destructive' });
    } finally {
      setQrLoading(false);
    }
  }, [toast]);

  // Gera o QR ao entrar no passo 3 (se ainda não houver).
  useEffect(() => {
    if (open && step === 3 && !qrUrl && !qrLoading) generateQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  async function handleUpload(file, setUrl, setUploading) {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Envie uma imagem JPG ou PNG.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_UPLOAD) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é de 4MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const data = await uploadImage(file);
      if (data && data.url) setUrl(data.url);
    } catch (e) {
      toast({ title: 'Falha no upload', description: friendlyError(e, 'Tente novamente.'), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  const docValid = useMemo(() => {
    const d = onlyDigits(document);
    return isPJ ? isCNPJ(d) : isCPF(d);
  }, [document, isPJ]);

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1)), []);
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => String(now - 18 - i));
  }, []);

  const step2Valid = emailVerified && phoneVerified && agreed;
  const birthDate = birthDay && birthMonth && birthYear
    ? `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
    : '';
  const step3Valid = fullName.trim() && nationality && docValid && birthDate && frontUrl && backUrl;

  async function handleSubmit() {
    if (!step3Valid) {
      setError('Preencha todos os campos obrigatórios antes de enviar.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await verificationService.submitSeller({
        context: 'seller',
        person_type: personType,
        full_name: fullName.trim(),
        nationality,
        document: onlyDigits(document),
        birth_date: birthDate,
        document_front_url: frontUrl,
        document_back_url: backUrl,
      });
      toast({ title: 'Verificação enviada para análise', variant: 'success', duration: 2500 });
      if (onSubmitted) onSubmitted();
      onClose && onClose();
    } catch (e) {
      setError(friendlyError(e, 'Não foi possível enviar a verificação. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  }

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const qrExpired = qrExpires && secondsLeft <= 0;

  return (
    <Modal open={open} onClose={onClose} title="Verificação de Vendedor (KYC)" size="lg">
      <div className={styles.wrap}>
        {/* Indicador de passos */}
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className={cx(styles.step, step === s.n && styles.stepActive, step > s.n && styles.stepDone)}>
                <span className={styles.stepDot}>
                  {step > s.n ? <Icon name="check" size={15} /> : s.n}
                </span>
                <span className={styles.stepLabel}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <span className={cx(styles.stepBar, step > s.n && styles.stepBarDone)} />}
            </div>
          ))}
        </div>

        {/* ===== Passo 1 ===== */}
        {step === 1 && (
          <div className={styles.panel}>
            <p className={styles.sectionTitle}>Qual o tipo da sua loja?</p>
            <div className={styles.typeGrid}>
              {[
                { type: 'PF', icon: 'user', name: 'Loja Pessoal', desc: 'Vendo como pessoa física (CPF).' },
                { type: 'PJ', icon: 'store', name: 'Loja Empresarial', desc: 'Vendo como empresa (CNPJ).' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  className={cx(styles.typeCard, personType === opt.type && styles.typeCardActive)}
                  onClick={() => setPersonType(opt.type)}
                >
                  <div className={styles.typeCardTop}>
                    <span className={styles.typeIcon}><Icon name={opt.icon} size={22} /></span>
                    <span className={styles.radio}>{personType === opt.type && <span className={styles.radioDot} />}</span>
                  </div>
                  <span className={styles.typeName}>{opt.name}</span>
                  <span className={styles.typeDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
            <div className={styles.footer}>
              <span className={styles.footerSpacer} />
              <Button onClick={() => setStep(2)}>Próximo</Button>
            </div>
          </div>
        )}

        {/* ===== Passo 2 ===== */}
        {step === 2 && (
          <div className={styles.panel}>
            <p className={styles.sectionTitle}>Informações de Contato</p>

            <ContactChannel
              title="E-mail"
              icon="mail"
              verified={emailVerified}
              sentLabel="Enviar código"
              onRequest={() => verificationService.requestEmail()}
              onConfirm={async (code) => { await verificationService.confirmEmail(code); setEmailVerified(true); }}
            >
              <Input value={(user && user.email) || ''} disabled readOnly />
            </ContactChannel>

            <ContactChannel
              title="Telefone (WhatsApp)"
              icon="smartphone"
              verified={phoneVerified}
              sentLabel="Enviar código (WhatsApp)"
              onRequest={() => verificationService.requestPhone()}
              onConfirm={async (code) => { await verificationService.confirmPhone(code); setPhoneVerified(true); }}
            >
              <div className={styles.row}>
                <span className={styles.ddi}>+55</span>
                <Input
                  className={styles.grow}
                  inputMode="numeric"
                  placeholder="(11) 90000-0000"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  disabled={phoneVerified}
                />
              </div>
            </ContactChannel>

            <label className={styles.terms}>
              <Checkbox checked={agreed} onChange={setAgreed} />
              <span>
                Eu li e concordo com os{' '}
                <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>
                  Termos de Serviço
                </a>
                .
              </span>
            </label>

            <div className={styles.footer}>
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>Próximo</Button>
            </div>
          </div>
        )}

        {/* ===== Passo 3 ===== */}
        {step === 3 && (
          <div className={styles.panel}>
            <p className={styles.sectionTitle}>Identificação Fiscal &amp; Biometria</p>

            <div className={styles.field}>
              <label className={styles.label}>
                Nome Completo
                <span className={styles.counter}>{fullName.length}/120</span>
              </label>
              <Input
                value={fullName}
                maxLength={120}
                placeholder="Como no documento"
                onChange={(e) => setFullName(e.target.value.slice(0, 120))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Nacionalidade</label>
              <Select value={nationality} onChange={(e) => setNationality(e.target.value)} options={NATIONALITIES} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{isPJ ? 'CNPJ' : 'CPF'}</label>
              <Input
                value={document}
                inputMode="numeric"
                placeholder={isPJ ? '00.000.000/0000-00' : '000.000.000-00'}
                invalid={!!document && !docValid}
                onChange={(e) => setDocument(isPJ ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Data de Nascimento</label>
              <div className={styles.row}>
                <Select className={styles.grow} value={birthDay} onChange={(e) => setBirthDay(e.target.value)} placeholder="Dia" options={days} />
                <Select className={styles.grow} value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} placeholder="Mês"
                  options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
                <Select className={styles.grow} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="Ano" options={years} />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Documento de Identidade</label>
              <div className={styles.uploadGrid}>
                <UploadBox
                  label="Frente"
                  url={frontUrl}
                  uploading={frontUploading}
                  onPick={(f) => handleUpload(f, setFrontUrl, setFrontUploading)}
                  onRemove={() => setFrontUrl('')}
                />
                <UploadBox
                  label="Verso"
                  url={backUrl}
                  uploading={backUploading}
                  onPick={(f) => handleUpload(f, setBackUrl, setBackUploading)}
                  onRemove={() => setBackUrl('')}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Verificação Facial (Biometria)</label>
              <div className={styles.qrBlock}>
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.qrImg}
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                    alt="QR Code para verificação facial"
                  />
                ) : (
                  <div className={styles.qrPlaceholder}>{qrLoading ? 'Gerando QR…' : 'QR indisponível'}</div>
                )}
                <p className={styles.qrHint}>
                  Escaneie o QR no seu celular para tirar uma foto em tempo real e validar sua identidade facial.
                  O QR expira em 10 minutos.
                </p>
                {qrExpires && (
                  <span className={cx(styles.qrTimer, qrExpired && styles.qrTimerExpired)}>
                    {qrExpired ? 'QR expirado — gere um novo.' : `Expira em ${mmss}`}
                  </span>
                )}
                <Button variant="outline" size="sm" loading={qrLoading} onClick={generateQr}>
                  Gerar novo QR
                </Button>
              </div>
            </div>

            {error && <div className={styles.warn}>{error}</div>}

            <div className={styles.footer}>
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>Voltar</Button>
              <Button onClick={handleSubmit} loading={submitting} disabled={!step3Valid || submitting}>Enviar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
