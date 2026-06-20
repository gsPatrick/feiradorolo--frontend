'use client';

import { useEffect, useState } from 'react';
import styles from '../AdminCustomization.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import { adminConfigService } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';

const CARD_KEYS = {
  identity: ['app.name', 'branding.company_cnpj', 'branding.footer_tagline'],
  payment: 'footer.payment_card',
  protection: 'footer.protection_card',
};

const EMPTY_CARD = { title: '', subtitle: '', body: '', link_text: '', link_url: '' };

export default function FooterPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [saving, setSaving] = useState('');

  const [appName, setAppName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [tagline, setTagline] = useState('');
  const [paymentCard, setPaymentCard] = useState({ ...EMPTY_CARD });
  const [protectionCard, setProtectionCard] = useState({ ...EMPTY_CARD });

  const applySettings = (list) => {
    const map = {};
    (Array.isArray(list) ? list : []).forEach((s) => {
      map[s.key] = s.value;
    });
    setAppName(map['app.name'] ?? '');
    setCnpj(map['branding.company_cnpj'] ?? '');
    setTagline(map['branding.footer_tagline'] ?? '');
    setPaymentCard({ ...EMPTY_CARD, ...(map['footer.payment_card'] || {}) });
    setProtectionCard({ ...EMPTY_CARD, ...(map['footer.protection_card'] || {}) });
  };

  const load = async () => {
    setLoading(true);
    try {
      const list = await adminConfigService.settings();
      applySettings(list);
      setUnauth(false);
    } catch (err) {
      if (err?.status === 401) setUnauth(true);
      else toast({ title: 'Erro ao carregar', description: err?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveIdentity = async () => {
    setSaving('identity');
    try {
      await Promise.all([
        adminConfigService.updateSetting('app.name', appName),
        adminConfigService.updateSetting('branding.company_cnpj', cnpj),
        adminConfigService.updateSetting('branding.footer_tagline', tagline),
      ]);
      toast({ title: 'Identidade do rodapé salva', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving('');
    }
  };

  const saveCard = async (key, value, label) => {
    setSaving(key);
    try {
      await adminConfigService.updateSetting(key, value);
      toast({ title: `${label} salvo`, variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving('');
    }
  };

  const restore = async (keys, label) => {
    const list = Array.isArray(keys) ? keys : [keys];
    setSaving(`restore:${list[0]}`);
    try {
      await Promise.all(list.map((k) => adminConfigService.restoreSetting(k)));
      const fresh = await adminConfigService.settings();
      applySettings(fresh);
      toast({ title: `${label} restaurado`, variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao restaurar', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving('');
    }
  };

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Carregando painel…</div>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className={styles.panel}>
        <div className={styles.unauth}>
          <Icon name="lock" size={32} />
          <p>Faça login como administrador para editar.</p>
        </div>
      </div>
    );
  }

  const renderCard = (title, iconName, key, state, setState, label) => (
    <div className={styles.card}>
      <div className={styles.cardTitle}>
        {iconName && <Icon name={iconName} size={18} />}
        {title}
      </div>
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.label}>Título</label>
          <input
            className={styles.input}
            value={state.title}
            onChange={(e) => setState({ ...state, title: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Subtítulo</label>
          <input
            className={styles.input}
            value={state.subtitle}
            onChange={(e) => setState({ ...state, subtitle: e.target.value })}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Texto</label>
        <textarea
          className={styles.textarea}
          value={state.body}
          onChange={(e) => setState({ ...state, body: e.target.value })}
        />
      </div>
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.label}>Texto do link</label>
          <input
            className={styles.input}
            value={state.link_text}
            onChange={(e) => setState({ ...state, link_text: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>URL do link</label>
          <input
            className={styles.input}
            value={state.link_url}
            onChange={(e) => setState({ ...state, link_url: e.target.value })}
          />
        </div>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.saveBtn}
          disabled={!!saving}
          onClick={() => saveCard(key, state, label)}
        >
          <Icon name="check" size={16} />
          {saving === key ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          className={styles.addBtn}
          disabled={!!saving}
          onClick={() => restore(key, label)}
        >
          Restaurar padrão
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>Rodapé</h3>
          <p>Personalize a identidade e os cards informativos do rodapé.</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <Icon name="store" size={18} />
          Identidade do rodapé
        </div>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Nome da marca</label>
            <input
              className={styles.input}
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>CNPJ</label>
            <input
              className={styles.input}
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Texto descritivo (tagline)</label>
          <textarea
            className={styles.textarea}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
          <span className={styles.hint}>Texto curto exibido na coluna principal do rodapé.</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.saveBtn} disabled={!!saving} onClick={saveIdentity}>
            <Icon name="check" size={16} />
            {saving === 'identity' ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            className={styles.addBtn}
            disabled={!!saving}
            onClick={() => restore(CARD_KEYS.identity, 'Identidade do rodapé')}
          >
            Restaurar padrão
          </button>
        </div>
      </div>

      {renderCard('Card de Pagamento', 'card', CARD_KEYS.payment, paymentCard, setPaymentCard, 'Card de Pagamento')}
      {renderCard('Card de Proteção', 'shield', CARD_KEYS.protection, protectionCard, setProtectionCard, 'Card de Proteção')}
    </div>
  );
}
