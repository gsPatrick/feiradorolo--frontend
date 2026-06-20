'use client';

import { useEffect, useState } from 'react';
import styles from '../AdminCustomization.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import { adminConfigService } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';

const SOCIAL_FIELDS = [
  { key: 'facebook', label: 'Facebook', icon: 'facebook', placeholder: 'https://facebook.com/sua-pagina' },
  { key: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: 'https://instagram.com/seu-perfil' },
  { key: 'tiktok', label: 'TikTok', icon: null, placeholder: 'https://tiktok.com/@seu-perfil' },
  { key: 'youtube', label: 'YouTube', icon: null, placeholder: 'https://youtube.com/@seu-canal' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'chat', placeholder: '+55 11 99999-9999 ou link wa.me' },
  { key: 'x', label: 'X (Twitter)', icon: null, placeholder: 'https://x.com/seu-perfil' },
];

const EMPTY_LINKS = { facebook: '', instagram: '', tiktok: '', youtube: '', whatsapp: '', x: '' };

export default function SocialPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);

  const [links, setLinks] = useState(EMPTY_LINKS);
  const [logoUrl, setLogoUrl] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await adminConfigService.settings();
        if (!active) return;
        const map = {};
        (Array.isArray(list) ? list : []).forEach((s) => {
          map[s.key] = s.value;
        });
        const social = map['social.links'] || {};
        setLinks({ ...EMPTY_LINKS, ...social });
        setLogoUrl(map['branding.logo_url'] || '');
        setFromEmail(map['mail.from_email'] || '');
        setFromName(map['mail.from_name'] || '');
      } catch (e) {
        if (!active) return;
        if (e && e.status === 401) setUnauth(true);
        else toast({ title: 'Erro ao carregar', description: (e && e.message) || '', variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  const setLink = (key, value) => setLinks((prev) => ({ ...prev, [key]: value }));

  const saveSocial = async () => {
    setSavingSocial(true);
    try {
      await adminConfigService.updateSetting('social.links', links);
      toast({ title: 'Redes sociais salvas', variant: 'success' });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: (e && e.message) || '', variant: 'destructive' });
    } finally {
      setSavingSocial(false);
    }
  };

  const saveBrand = async () => {
    setSavingBrand(true);
    try {
      await adminConfigService.updateSetting('branding.logo_url', logoUrl);
      await adminConfigService.updateSetting('mail.from_email', fromEmail);
      await adminConfigService.updateSetting('mail.from_name', fromName);
      toast({ title: 'Marca & contato salvos', variant: 'success' });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: (e && e.message) || '', variant: 'destructive' });
    } finally {
      setSavingBrand(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Carregando…</div>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className={styles.panel}>
        <div className={styles.unauth}>
          <Icon name="lock" size={28} />
          <span>Faça login como administrador para editar.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>Redes &amp; Contato</h3>
          <p>Gerencie as redes sociais, o logo e o e-mail de contato do site.</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <Icon name="instagram" size={18} />
          Redes sociais
        </div>

        {SOCIAL_FIELDS.map((f) => (
          <div className={styles.field} key={f.key}>
            <label className={styles.label}>
              {f.icon ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={f.icon} size={15} />
                  {f.label}
                </span>
              ) : (
                f.label
              )}
            </label>
            <input
              className={styles.input}
              type="text"
              value={links[f.key] || ''}
              placeholder={f.placeholder}
              onChange={(e) => setLink(f.key, e.target.value)}
            />
          </div>
        ))}

        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={saveSocial} disabled={savingSocial}>
            <Icon name="check" size={16} />
            {savingSocial ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <Icon name="store" size={18} />
          Marca &amp; Contato
        </div>

        <div className={styles.field}>
          <label className={styles.label}>URL do logo</label>
          <input
            className={styles.input}
            type="text"
            value={logoUrl}
            placeholder="https://… (vazio usa o texto)"
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          <span className={styles.hint}>Deixe vazio para exibir o nome em texto.</span>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>E-mail de contato</label>
            <input
              className={styles.input}
              type="email"
              value={fromEmail}
              placeholder="contato@feiradorolo.com"
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nome do remetente</label>
            <input
              className={styles.input}
              type="text"
              value={fromName}
              placeholder="Feira do Rolo"
              onChange={(e) => setFromName(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={saveBrand} disabled={savingBrand}>
            <Icon name="check" size={16} />
            {savingBrand ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
