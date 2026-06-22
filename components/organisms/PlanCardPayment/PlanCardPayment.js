'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PlanCardPayment.module.css';
import { cx } from '@/lib/cx';
import { onlyDigits, maskCPF } from '@/lib/masks';
import Modal from '@/components/organisms/Modal/Modal';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Icon from '@/components/atoms/Icon/Icon';
import { paymentService, planService, ApiError } from '@/lib/api';

const MP_SDK_SRC = 'https://sdk.mercadopago.com/js/v2';

const BRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Carrega o SDK do Mercado Pago uma única vez (mesmo padrão do checkout).
function loadMercadoPagoSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MP_SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.MercadoPago));
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o SDK do Mercado Pago.')));
      if (window.MercadoPago) resolve(window.MercadoPago);
      return;
    }
    const script = document.createElement('script');
    script.src = MP_SDK_SRC;
    script.async = true;
    script.onload = () => resolve(window.MercadoPago);
    script.onerror = () => reject(new Error('Falha ao carregar o SDK do Mercado Pago.'));
    document.body.appendChild(script);
  });
}

function maskCardNumber(v) {
  const d = onlyDigits(v).slice(0, 16);
  return d.replace(/(.{4})/g, '$1 ').trim();
}
function maskExpiry(v) {
  const d = onlyDigits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

// Mensagem amigável a partir do status_detail do gateway (cartão recusado).
function cardStatusMessage(detail) {
  const map = {
    cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente.',
    cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
    cc_rejected_bad_filled_date: 'Data de validade inválida.',
    cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
    cc_rejected_bad_filled_other: 'Dados do cartão incorretos.',
    cc_rejected_call_for_authorize: 'Autorize o pagamento com o seu banco.',
    cc_rejected_card_disabled: 'Cartão desabilitado. Contate o seu banco.',
    cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro meio.',
    cc_rejected_max_attempts: 'Muitas tentativas. Use outro cartão.',
    cc_rejected_duplicated_payment: 'Pagamento duplicado.',
  };
  return map[detail] || 'Pagamento não autorizado. Tente outro cartão ou meio de pagamento.';
}

function isApproved(status) {
  const s = String(status || '').toLowerCase();
  return s === 'approved' || s === 'paid' || s === 'active';
}

/**
 * Modal de pagamento de plano com CARTÃO de crédito + opção de salvar o cartão
 * para renovação automática. Tokeniza via Mercado Pago.js (mesmo mecanismo do
 * checkout) e chama planService.subscribe(planId, { card: {...} }).
 *
 * Props:
 *  - open, onClose
 *  - plan: { id, name, price, ... }
 *  - userCpf: CPF do usuário logado (pré-preenche o titular)
 *  - onSuccess(res): chamado quando a assinatura é ativada
 */
export default function PlanCardPayment({ open, onClose, plan, userCpf, onSuccess }) {
  const mpRef = useRef(null);
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '', cpf: '' });
  const [saveCard, setSaveCard] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Inicializa o SDK ao abrir (public key do gateway ativo).
  useEffect(() => {
    if (!open) return;
    let active = true;
    paymentService
      .publicKey()
      .then(async (res) => {
        const key = res && res.public_key;
        if (!active || !key || mpRef.current) return;
        try {
          const MP = await loadMercadoPagoSdk();
          if (active && MP) mpRef.current = new MP(key, { locale: 'pt-BR' });
        } catch {
          /* SDK indisponível: tratado ao tentar pagar */
        }
      })
      .catch(() => {
        /* gateway não configurado: tratado ao tentar pagar */
      });
    return () => {
      active = false;
    };
  }, [open]);

  // Pré-preenche o CPF do titular com o do usuário logado.
  useEffect(() => {
    if (open && userCpf) setCard((c) => (c.cpf ? c : { ...c, cpf: maskCPF(userCpf) }));
  }, [open, userCpf]);

  // Reseta o estado a cada nova abertura.
  useEffect(() => {
    if (open) {
      setError('');
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open, plan && plan.id]);

  async function handlePay() {
    if (submitting) return;
    setError('');
    const mp = mpRef.current;
    if (!mp) {
      setError('Pagamento por cartão indisponível no momento. Tente o Pix.');
      return;
    }
    const numberDigits = onlyDigits(card.number);
    const cpfDigits = onlyDigits(card.cpf);
    const exp = onlyDigits(card.expiry);
    if (numberDigits.length < 13 || !card.name.trim() || exp.length < 4 || card.cvv.length < 3) {
      setError('Preencha todos os dados do cartão.');
      return;
    }
    if (cpfDigits.length !== 11) {
      setError('Informe um CPF válido do titular.');
      return;
    }
    setSubmitting(true);
    try {
      const mm = exp.slice(0, 2);
      const yy = exp.slice(2, 4);
      const yyyy = `20${yy}`;

      // Detecta a bandeira a partir do BIN.
      const bin = numberDigits.slice(0, 8);
      const { results } = await mp.getPaymentMethods({ bin });
      const paymentMethodId = results && results[0] && results[0].id;
      if (!paymentMethodId) {
        throw new Error('Cartão não reconhecido. Verifique o número informado.');
      }

      // Tokeniza o cartão (nunca enviamos o cartão cru ao backend).
      const tk = await mp.createCardToken({
        cardNumber: numberDigits,
        cardholderName: card.name,
        cardExpirationMonth: mm,
        cardExpirationYear: yyyy,
        securityCode: card.cvv,
        identificationType: 'CPF',
        identificationNumber: cpfDigits,
      });
      if (!tk || !tk.id) throw new Error('Não foi possível validar o cartão. Revise os dados.');

      const res = await planService.subscribe(plan.id, {
        card: {
          token: tk.id,
          payment_method_id: paymentMethodId,
          save_card: saveCard,
        },
      });

      const status =
        (res && (res.status || (res.payment && res.payment.status) || (res.gateway && res.gateway.status))) ||
        'approved';
      const statusDetail = res && res.gateway && res.gateway.status_detail;

      if (isApproved(status) || status === 'pending' || status === 'in_process') {
        setSuccess(true);
        if (typeof onSuccess === 'function') onSuccess(res);
      } else {
        setError(cardStatusMessage(statusDetail));
      }
    } catch (e) {
      // Erros do SDK costumam vir como array em e.cause.
      const msg =
        (Array.isArray(e && e.cause) && e.cause[0] && e.cause[0].description) ||
        (e instanceof ApiError ? e.message : null) ||
        (e && e.message) ||
        'Não foi possível processar o cartão.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!plan) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className={styles.modalTitle}>
          <Icon name="card" size={22} className={styles.titleIcon} />
          Pagar com cartão
        </span>
      }
      footer={
        success ? (
          <Button onClick={onClose}>Concluir</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handlePay} loading={submitting}>
              Pagar {BRL(plan.price)}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div className={styles.success}>
          <Icon name="check" size={48} className={styles.successIcon} />
          <div className={styles.successTitle}>Assinatura ativada!</div>
          <p className={styles.successText}>
            Seu plano {plan.name} está ativo. Você já pode publicar seus anúncios.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.planRow}>
            <span>Plano</span>
            <strong>{plan.name}</strong>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <Icon name="sparkle" size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Número do cartão</label>
            <Input
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
              value={card.number}
              onChange={(e) => setCard((c) => ({ ...c, number: maskCardNumber(e.target.value) }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nome no cartão</label>
            <Input
              placeholder="JOÃO DA SILVA"
              value={card.name}
              onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>CPF do titular</label>
            <Input
              placeholder="000.000.000-00"
              inputMode="numeric"
              value={card.cpf}
              onChange={(e) => setCard((c) => ({ ...c, cpf: maskCPF(e.target.value) }))}
            />
          </div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Validade</label>
              <Input
                placeholder="MM/AA"
                inputMode="numeric"
                value={card.expiry}
                onChange={(e) => setCard((c) => ({ ...c, expiry: maskExpiry(e.target.value) }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>CVV</label>
              <Input
                placeholder="123"
                inputMode="numeric"
                maxLength={4}
                value={card.cvv}
                onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
          </div>

          <label className={cx(styles.saveRow, saveCard && styles.saveRowOn)}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
            />
            <span className={styles.saveText}>
              <strong>Salvar cartão para renovação automática</strong>
              <span className={styles.saveSub}>
                Seu plano renova sozinho ao vencer. Você pode cancelar quando quiser.
              </span>
            </span>
          </label>

          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>{BRL(plan.price)}</strong>
          </div>
          <p className={styles.secure}>
            <Icon name="shield" size={14} /> Pagamento seguro via Mercado Pago
          </p>
        </>
      )}
    </Modal>
  );
}
