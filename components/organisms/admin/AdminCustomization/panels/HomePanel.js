'use client';

import { useEffect, useState } from 'react';
import styles from '../AdminCustomization.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { adminConfigService, uploadImage } from '@/lib/api';

const POSITIONS = [
  { key: 'home_hero', title: 'Carrossel principal (Hero)' },
  { key: 'home_strip', title: 'Cards de acesso rápido' },
  { key: 'home_flash', title: 'Barra Flash Sale' },
  { key: 'app_promo', title: 'Bloco "Baixe o app"' },
];

const emptyForm = () => ({
  title: '',
  subtitle: '',
  cta_text: '',
  cta_url: '',
  background_type: 'color',
  background_color: '#FACC15',
  background_gradient: '',
  image_url: '',
  text_color: '',
  ends_at: '',
  icon: '',
  is_active: true,
});

// ISO -> formato aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
function isoToLocalInput(value) {
  if (!value) return '';
  try {
    return String(value).slice(0, 16);
  } catch {
    return '';
  }
}

export default function HomePanel() {
  const { toast } = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // editing: { position, id|null, form }
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    setUnauth(false);
    try {
      const data = await adminConfigService.banners();
      setBanners(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e && e.status === 401) setUnauth(true);
      else toast({ title: 'Erro ao carregar banners', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate(position) {
    setEditing({ position, id: null, form: emptyForm() });
  }

  function startEdit(banner) {
    setEditing({
      position: banner.position,
      id: banner.id,
      form: {
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        cta_text: banner.cta_text || '',
        cta_url: banner.cta_url || '',
        background_type: banner.background_type || 'color',
        background_color: banner.background_color || '#FACC15',
        background_gradient: banner.background_gradient || '',
        image_url: banner.image_url || '',
        text_color: banner.text_color || '',
        ends_at: isoToLocalInput(banner.ends_at),
        icon: banner.icon || '',
        is_active: banner.is_active !== false,
      },
    });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function setField(field, value) {
    setEditing((prev) => (prev ? { ...prev, form: { ...prev.form, [field]: value } } : prev));
  }

  async function handleImageUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadImage(file);
      const url = res && res.url;
      if (!url) throw new Error('Resposta sem URL');
      setField('image_url', url);
      toast({ title: 'Imagem enviada', variant: 'success' });
    } catch (e) {
      if (e && e.status === 401) setUnauth(true);
      toast({ title: 'Falha no upload', description: e?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!editing) return;
    const payload = { position: editing.position, ...editing.form };
    // converte datetime-local -> ISO para o cronômetro
    payload.ends_at = editing.form.ends_at
      ? new Date(editing.form.ends_at).toISOString()
      : null;
    setSaving(true);
    try {
      if (editing.id) {
        await adminConfigService.updateBanner(editing.id, payload);
        toast({ title: 'Banner atualizado', variant: 'success' });
      } else {
        await adminConfigService.createBanner(payload);
        toast({ title: 'Banner criado', variant: 'success' });
      }
      setEditing(null);
      await load();
    } catch (e) {
      if (e && e.status === 401) setUnauth(true);
      toast({ title: 'Não foi possível salvar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(banner) {
    if (!window.confirm(`Remover o banner "${banner.title || 'sem título'}"?`)) return;
    try {
      await adminConfigService.deleteBanner(banner.id);
      toast({ title: 'Banner removido', variant: 'success' });
      if (editing && editing.id === banner.id) setEditing(null);
      await load();
    } catch (e) {
      if (e && e.status === 401) setUnauth(true);
      toast({ title: 'Não foi possível remover', description: e?.message, variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Carregando banners…</div>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className={styles.panel}>
        <div className={styles.unauth}>
          <Icon name="shield" />
          <span>Faça login como administrador para editar.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>Personalização da Home</h3>
          <p>Gerencie os banners exibidos na página inicial, agrupados por posição.</p>
        </div>
      </div>

      {POSITIONS.map((pos) => {
        const items = banners
          .filter((b) => b.position === pos.key)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const formOpen = editing && editing.position === pos.key;

        return (
          <div key={pos.key} className={styles.card}>
            <div className={styles.cardTitle}>
              <Icon name="grid" />
              {pos.title}
            </div>

            {items.length === 0 && !formOpen && (
              <p className={styles.hint}>Nenhum banner cadastrado nesta posição.</p>
            )}

            {items.map((banner) => (
              <div key={banner.id} className={styles.listItem}>
                <Icon name="eye" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{banner.title || '(sem título)'}</div>
                  <div className={styles.hint}>
                    {banner.is_active !== false ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => startEdit(banner)}
                >
                  <Icon name="edit" />
                  Editar
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => remove(banner)}
                  aria-label="Remover banner"
                >
                  <Icon name="trash" />
                </button>
              </div>
            ))}

            {formOpen ? (
              <div className={styles.field} style={{ marginTop: 14, marginBottom: 0 }}>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Título</label>
                    <input
                      className={styles.input}
                      value={editing.form.title}
                      onChange={(e) => setField('title', e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Subtítulo</label>
                    <input
                      className={styles.input}
                      value={editing.form.subtitle}
                      onChange={(e) => setField('subtitle', e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Texto do botão</label>
                    <input
                      className={styles.input}
                      value={editing.form.cta_text}
                      onChange={(e) => setField('cta_text', e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Link do botão</label>
                    <input
                      className={styles.input}
                      value={editing.form.cta_url}
                      onChange={(e) => setField('cta_url', e.target.value)}
                      placeholder="/categoria/eletronicos"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tipo de fundo</label>
                    <select
                      className={styles.select}
                      value={editing.form.background_type || 'color'}
                      onChange={(e) => setField('background_type', e.target.value)}
                    >
                      <option value="color">Cor sólida</option>
                      <option value="gradient">Gradiente</option>
                      <option value="image">Imagem</option>
                    </select>
                  </div>

                  {editing.form.background_type === 'color' && (
                    <div className={styles.field}>
                      <label className={styles.label}>Cor de fundo</label>
                      <input
                        type="color"
                        className={styles.input}
                        value={editing.form.background_color || '#FACC15'}
                        onChange={(e) => setField('background_color', e.target.value)}
                      />
                    </div>
                  )}

                  {editing.form.background_type === 'gradient' && (
                    <div className={styles.field}>
                      <label className={styles.label}>Gradiente (CSS)</label>
                      <input
                        className={styles.input}
                        value={editing.form.background_gradient || ''}
                        onChange={(e) => setField('background_gradient', e.target.value)}
                        placeholder="linear-gradient(135deg, #1e3a8a, #7c3aed)"
                      />
                    </div>
                  )}

                  <div className={styles.field}>
                    <label className={styles.label}>Cor do texto</label>
                    <input
                      type="color"
                      className={styles.input}
                      value={editing.form.text_color || '#000000'}
                      onChange={(e) => setField('text_color', e.target.value)}
                    />
                    <span className={styles.hint}>Opcional. Cor do título e texto sobre o banner.</span>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Ícone</label>
                    <input
                      className={styles.input}
                      value={editing.form.icon}
                      onChange={(e) => setField('icon', e.target.value)}
                      placeholder="grid, plus, eye…"
                    />
                  </div>
                </div>

                {editing.form.background_type === 'image' && (
                  <div className={styles.field}>
                    <label className={styles.label}>Imagem de fundo</label>
                    <input
                      type="file"
                      accept="image/*"
                      className={styles.input}
                      disabled={uploading}
                      onChange={(e) => handleImageUpload(e.target.files && e.target.files[0])}
                    />
                    {uploading && <span className={styles.hint}>Enviando…</span>}
                    <input
                      className={styles.input}
                      style={{ marginTop: 8 }}
                      value={editing.form.image_url || ''}
                      onChange={(e) => setField('image_url', e.target.value)}
                      placeholder="https://… (ou faça upload acima)"
                    />
                    {editing.form.image_url && (
                      <img
                        src={editing.form.image_url}
                        alt="Pré-visualização do banner"
                        style={{ maxWidth: 180, borderRadius: 8, marginTop: 8 }}
                      />
                    )}
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.label}>Data/hora de término</label>
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={editing.form.ends_at || ''}
                    onChange={(e) => setField('ends_at', e.target.value)}
                  />
                  <span className={styles.hint}>Usado no cronômetro do Flash Sale.</span>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={editing.form.is_active}
                      onChange={(e) => setField('is_active', e.target.checked)}
                    />
                    Ativo
                  </label>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={save}
                    disabled={saving}
                  >
                    <Icon name="check" />
                    {editing.id ? 'Salvar alterações' : 'Criar banner'}
                  </button>
                  <button type="button" className={styles.addBtn} onClick={cancelEdit}>
                    <Icon name="close" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => startCreate(pos.key)}
                style={{ marginTop: 4 }}
              >
                <Icon name="plus" />
                Adicionar banner
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
