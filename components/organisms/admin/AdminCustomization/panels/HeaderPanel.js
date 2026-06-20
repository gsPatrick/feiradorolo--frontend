'use client';

import { useEffect, useState } from 'react';
import styles from '../AdminCustomization.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { adminConfigService } from '@/lib/api';

const KEY_TOPBAR = 'branding.topbar_message';
const KEY_PRIMARY = 'nav.primary_menu';
const KEY_LEGAL = 'nav.legal_links';

/** Normaliza um array de links vindo da API para [{ label, href }]. */
function toLinks(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    label: (item && item.label) || '',
    href: (item && item.href) || '',
  }));
}

/** Editor reutilizável de lista de links (label + href). */
function LinkListEditor({
  title,
  items,
  onUpdate,
  onAdd,
  onRemove,
  onSave,
  onRestore,
  saving,
}) {
  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>
        <Icon name="menu" size={18} />
        {title}
      </h4>

      {items.map((item, i) => (
        <div className={styles.listItem} key={i}>
          <input
            className={styles.input}
            type="text"
            placeholder="Rótulo"
            value={item.label}
            onChange={(e) => onUpdate(i, 'label', e.target.value)}
          />
          <input
            className={styles.input}
            type="text"
            placeholder="/destino"
            value={item.href}
            onChange={(e) => onUpdate(i, 'href', e.target.value)}
          />
          <button
            type="button"
            className={styles.removeBtn}
            aria-label="Remover link"
            onClick={() => onRemove(i)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}

      <div className={styles.actions}>
        <button type="button" className={styles.addBtn} onClick={onAdd}>
          <Icon name="plus" size={16} />
          Adicionar link
        </button>
      </div>

      <div className={styles.actions} style={{ marginTop: 14 }}>
        <button
          type="button"
          className={styles.saveBtn}
          disabled={saving}
          onClick={onSave}
        >
          <Icon name="check" size={16} />
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          className={styles.addBtn}
          disabled={saving}
          onClick={onRestore}
        >
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}

export default function HeaderPanel() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [saving, setSaving] = useState(null);

  const [topbar, setTopbar] = useState('');
  const [primaryMenu, setPrimaryMenu] = useState([]);
  const [legalLinks, setLegalLinks] = useState([]);

  async function load() {
    setLoading(true);
    setUnauth(false);
    try {
      const list = await adminConfigService.settings();
      const map = {};
      (Array.isArray(list) ? list : []).forEach((s) => {
        if (s && s.key) map[s.key] = s.value;
      });
      setTopbar(typeof map[KEY_TOPBAR] === 'string' ? map[KEY_TOPBAR] : '');
      setPrimaryMenu(toLinks(map[KEY_PRIMARY]));
      setLegalLinks(toLinks(map[KEY_LEGAL]));
    } catch (err) {
      if (err && err.status === 401) {
        setUnauth(true);
      } else {
        toast({
          title: 'Erro ao carregar',
          description: (err && err.message) || 'Tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSetting(key, value, label) {
    setSaving(key);
    try {
      await adminConfigService.updateSetting(key, value);
      toast({ title: 'Salvo', description: `${label} atualizado com sucesso.`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: (err && err.message) || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  }

  async function restore(key, label) {
    setSaving(key);
    try {
      await adminConfigService.restoreSetting(key);
      toast({ title: 'Restaurado', description: `${label} voltou ao padrão.`, variant: 'success' });
      await load();
    } catch (err) {
      toast({
        title: 'Erro ao restaurar',
        description: (err && err.message) || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  }

  /* Helpers para editar arrays de links. */
  function updateLink(setList, index, fieldName, val) {
    setList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [fieldName]: val } : item))
    );
  }
  function addLink(setList) {
    setList((prev) => [...prev, { label: '', href: '' }]);
  }
  function removeLink(setList, index) {
    setList((prev) => prev.filter((_, i) => i !== index));
  }

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
          <Icon name="shield" size={32} />
          <p>Faça login como administrador para editar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>Header</h3>
          <p>Personalize a barra superior e os menus de navegação.</p>
        </div>
      </div>

      {/* Topbar */}
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>
          <Icon name="chat" size={18} />
          Mensagem da barra superior
        </h4>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="topbar-message">
            Texto
          </label>
          <input
            id="topbar-message"
            className={styles.input}
            type="text"
            value={topbar}
            placeholder="Ex.: Frete grátis acima de R$ 99"
            onChange={(e) => setTopbar(e.target.value)}
          />
          <span className={styles.hint}>Exibido no topo de todas as páginas.</span>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={saving === KEY_TOPBAR}
            onClick={() => saveSetting(KEY_TOPBAR, topbar, 'Mensagem da barra superior')}
          >
            <Icon name="check" size={16} />
            {saving === KEY_TOPBAR ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            className={styles.addBtn}
            disabled={saving === KEY_TOPBAR}
            onClick={() => restore(KEY_TOPBAR, 'Mensagem da barra superior')}
          >
            Restaurar padrão
          </button>
        </div>
      </div>

      <LinkListEditor
        title="Menu principal"
        items={primaryMenu}
        saving={saving === KEY_PRIMARY}
        onUpdate={(i, f, v) => updateLink(setPrimaryMenu, i, f, v)}
        onAdd={() => addLink(setPrimaryMenu)}
        onRemove={(i) => removeLink(setPrimaryMenu, i)}
        onSave={() =>
          saveSetting(
            KEY_PRIMARY,
            primaryMenu.map((l) => ({ label: l.label, href: l.href })),
            'Menu principal'
          )
        }
        onRestore={() => restore(KEY_PRIMARY, 'Menu principal')}
      />

      <LinkListEditor
        title="Links legais"
        items={legalLinks}
        saving={saving === KEY_LEGAL}
        onUpdate={(i, f, v) => updateLink(setLegalLinks, i, f, v)}
        onAdd={() => addLink(setLegalLinks)}
        onRemove={(i) => removeLink(setLegalLinks, i)}
        onSave={() =>
          saveSetting(
            KEY_LEGAL,
            legalLinks.map((l) => ({ label: l.label, href: l.href })),
            'Links legais'
          )
        }
        onRestore={() => restore(KEY_LEGAL, 'Links legais')}
      />
    </div>
  );
}
