'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from '../AdminCustomization.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { adminConfigService } from '@/lib/api';
import ContentEditor from './ContentEditor';

const EMPTY_DRAFT = {
  slug: '',
  title: '',
  subtitle: '',
  icon: '',
  is_published: true,
  contentText: '{}',
  isNew: true,
  kind: 'content',
  content: {},
  faqTitle: '',
  categories: [],
};

function normalizeCategories(content) {
  const cats = content?.categories || [];
  if (!Array.isArray(cats)) return [];
  return cats.map((c) => ({
    title: c?.title || '',
    icon: c?.icon || '',
    questions: Array.isArray(c?.questions)
      ? c.questions.map((q) => ({ question: q?.question || '', answer: q?.answer || '' }))
      : [],
  }));
}

function pageToDraft(page) {
  let contentText = '{}';
  try {
    contentText = JSON.stringify(page.content ?? {}, null, 2);
  } catch {
    contentText = '{}';
  }
  const content = page.content ?? {};
  return {
    slug: page.slug || '',
    title: page.title || '',
    subtitle: page.subtitle || '',
    icon: page.icon || '',
    is_published: page.is_published !== false,
    contentText,
    isNew: false,
    kind: page.kind || 'content',
    content,
    faqTitle: content?.faqTitle || '',
    categories: normalizeCategories(content),
  };
}

export default function PagesPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [pages, setPages] = useState([]);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUnauth(false);
    try {
      const data = await adminConfigService.pages();
      setPages(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err && err.status === 401) {
        setUnauth(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: (err && err.message) || 'Não foi possível carregar as páginas.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function selectPage(page) {
    setDraft(pageToDraft(page));
  }

  function startNew() {
    setDraft({ ...EMPTY_DRAFT });
  }

  function setField(key, value) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  // Atualiza o objeto de conteúdo (editor amigável) mantendo o JSON em sincronia.
  function setContent(obj) {
    setDraft((d) => {
      if (!d) return d;
      let contentText = d.contentText;
      try {
        contentText = JSON.stringify(obj, null, 2);
      } catch {
        /* mantém o anterior */
      }
      return { ...d, content: obj, contentText };
    });
  }

  const isFaq = !!draft && draft.kind === 'faq';

  function updateCategories(updater) {
    setDraft((d) => (d ? { ...d, categories: updater(d.categories || []) } : d));
  }

  function addCategory() {
    updateCategories((cats) => [...cats, { title: '', icon: '', questions: [] }]);
  }

  function removeCategory(ci) {
    updateCategories((cats) => cats.filter((_, i) => i !== ci));
  }

  function setCategoryField(ci, key, value) {
    updateCategories((cats) => cats.map((c, i) => (i === ci ? { ...c, [key]: value } : c)));
  }

  function addQuestion(ci) {
    updateCategories((cats) =>
      cats.map((c, i) =>
        i === ci ? { ...c, questions: [...(c.questions || []), { question: '', answer: '' }] } : c
      )
    );
  }

  function removeQuestion(ci, qi) {
    updateCategories((cats) =>
      cats.map((c, i) =>
        i === ci ? { ...c, questions: (c.questions || []).filter((_, j) => j !== qi) } : c
      )
    );
  }

  function setQuestionField(ci, qi, key, value) {
    updateCategories((cats) =>
      cats.map((c, i) =>
        i === ci
          ? {
              ...c,
              questions: (c.questions || []).map((q, j) => (j === qi ? { ...q, [key]: value } : q)),
            }
          : c
      )
    );
  }

  async function handleSave() {
    if (!draft) return;
    const slug = (draft.slug || '').trim();
    if (!slug) {
      toast({ variant: 'destructive', title: 'Slug obrigatório', description: 'Informe o slug da página.' });
      return;
    }

    let content;
    if (isFaq) {
      const categories = (draft.categories || []).map((c) => ({
        ...c,
        count: (c.questions || []).length,
      }));
      content = { ...(draft.content || {}), faqTitle: draft.faqTitle, categories };
    } else {
      // Editor amigável: o objeto de conteúdo é a fonte da verdade.
      content = draft.content || {};
    }

    setSaving(true);
    try {
      await adminConfigService.savePage(slug, {
        title: draft.title,
        subtitle: draft.subtitle,
        icon: draft.icon,
        is_published: draft.is_published,
        content,
      });
      toast({ title: 'Página salva', description: `"${slug}" foi salva com sucesso.` });
      await load();
      setDraft((d) => (d ? { ...d, slug, isNew: false } : d));
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: (err && err.message) || 'Não foi possível salvar a página.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug) {
    if (!slug) return;
    if (typeof window !== 'undefined' && !window.confirm(`Remover a página "${slug}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await adminConfigService.deletePage(slug);
      toast({ title: 'Página removida', description: `"${slug}" foi removida.` });
      if (draft && draft.slug === slug) setDraft(null);
      await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: (err && err.message) || 'Não foi possível remover a página.',
      });
    }
  }

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Carregando páginas…</div>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className={styles.panel}>
        <div className={styles.unauth}>
          <p>Faça login como administrador para editar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>Páginas &amp; FAQ</h3>
          <p>Edite as páginas institucionais e perguntas frequentes do site.</p>
        </div>
        <button type="button" className={styles.addBtn} onClick={startNew}>
          <Icon name="arrow-right" size={16} />
          Nova página
        </button>
      </div>

      <div className={styles.grid2}>
        {/* Lista */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Páginas ({pages.length})</div>
          {pages.length === 0 && <div className={styles.hint}>Nenhuma página cadastrada ainda.</div>}
          {pages.map((page) => (
            <div key={page.slug} className={styles.listItem}>
              <button
                type="button"
                className={styles.addBtn}
                style={{ flex: 1, justifyContent: 'flex-start', border: 'none', background: 'transparent', textAlign: 'left' }}
                onClick={() => selectPage(page)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 600 }}>{page.title || page.slug}</span>
                  <span className={styles.hint}>{page.slug}</span>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={styles.hint}>· {page.kind || 'content'}</span>
                    <span className={styles.hint}>· {page.is_published !== false ? 'publicado' : 'oculto'}</span>
                  </span>
                </div>
              </button>
              <button
                type="button"
                className={styles.removeBtn}
                aria-label={`Remover ${page.slug}`}
                title="Remover"
                onClick={() => handleDelete(page.slug)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className={styles.card}>
          {!draft ? (
            <div className={styles.hint}>Selecione uma página à esquerda ou crie uma nova para editar.</div>
          ) : (
            <>
              <div className={styles.cardTitle}>{draft.isNew ? 'Nova página' : `Editando: ${draft.slug}`}</div>

              {draft.isNew && (
                <div className={styles.field}>
                  <label className={styles.label}>Slug</label>
                  <input
                    className={styles.input}
                    value={draft.slug}
                    placeholder="ex.: politica-de-privacidade"
                    onChange={(e) => setField('slug', e.target.value)}
                  />
                  <span className={styles.hint}>Identificador da URL. Não pode ser alterado depois de criado.</span>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Título</label>
                <input
                  className={styles.input}
                  value={draft.title}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Subtítulo</label>
                <input
                  className={styles.input}
                  value={draft.subtitle}
                  onChange={(e) => setField('subtitle', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Ícone</label>
                <input
                  className={styles.input}
                  value={draft.icon}
                  placeholder="nome do ícone"
                  onChange={(e) => setField('icon', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
                  <input
                    type="checkbox"
                    checked={!!draft.is_published}
                    onChange={(e) => setField('is_published', e.target.checked)}
                  />
                  Publicado
                </label>
              </div>

              {isFaq ? (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>Título da seção de perguntas</label>
                    <input
                      className={styles.input}
                      value={draft.faqTitle}
                      placeholder="ex.: Perguntas Frequentes"
                      onChange={(e) => setField('faqTitle', e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Categorias ({(draft.categories || []).length})</label>
                    {(draft.categories || []).length === 0 && (
                      <span className={styles.hint}>Nenhuma categoria ainda. Adicione uma abaixo.</span>
                    )}

                    {(draft.categories || []).map((cat, ci) => (
                      <div key={ci} className={styles.card} style={{ marginTop: 8 }}>
                        <div className={styles.listItem} style={{ alignItems: 'flex-end' }}>
                          <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <div className={styles.field} style={{ flex: '2 1 200px', margin: 0 }}>
                              <label className={styles.label}>Título da categoria</label>
                              <input
                                className={styles.input}
                                value={cat.title}
                                placeholder="ex.: Pedidos e Entregas"
                                onChange={(e) => setCategoryField(ci, 'title', e.target.value)}
                              />
                            </div>
                            <div className={styles.field} style={{ flex: '1 1 120px', margin: 0 }}>
                              <label className={styles.label}>Ícone (opcional)</label>
                              <input
                                className={styles.input}
                                value={cat.icon}
                                placeholder="ex.: truck"
                                onChange={(e) => setCategoryField(ci, 'icon', e.target.value)}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            title="Remover categoria"
                            aria-label="Remover categoria"
                            onClick={() => removeCategory(ci)}
                          >
                            ×
                          </button>
                        </div>

                        <div style={{ marginTop: 8, paddingLeft: 8 }}>
                          <span className={styles.hint}>Perguntas ({(cat.questions || []).length})</span>
                          {(cat.questions || []).map((q, qi) => (
                            <div key={qi} className={styles.listItem} style={{ alignItems: 'flex-start', marginTop: 8 }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div className={styles.field} style={{ margin: 0 }}>
                                  <label className={styles.label}>Pergunta</label>
                                  <input
                                    className={styles.input}
                                    value={q.question}
                                    placeholder="ex.: Como rastrear meu pedido?"
                                    onChange={(e) => setQuestionField(ci, qi, 'question', e.target.value)}
                                  />
                                </div>
                                <div className={styles.field} style={{ margin: 0 }}>
                                  <label className={styles.label}>Resposta</label>
                                  <textarea
                                    className={styles.textarea}
                                    style={{ minHeight: 80 }}
                                    value={q.answer}
                                    onChange={(e) => setQuestionField(ci, qi, 'answer', e.target.value)}
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                className={styles.removeBtn}
                                title="Remover pergunta"
                                aria-label="Remover pergunta"
                                onClick={() => removeQuestion(ci, qi)}
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            className={styles.addBtn}
                            style={{ marginTop: 8 }}
                            onClick={() => addQuestion(ci)}
                          >
                            <Icon name="arrow-right" size={14} />
                            Adicionar pergunta
                          </button>
                        </div>
                      </div>
                    ))}

                    <button type="button" className={styles.addBtn} style={{ marginTop: 8 }} onClick={addCategory}>
                      <Icon name="arrow-right" size={16} />
                      Adicionar categoria
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label}>Conteúdo da página</label>
                  <span className={styles.hint}>
                    Edite os textos de cada bloco. As alterações são salvas na API e refletem no site.
                  </span>
                  <ContentEditor
                    value={draft.content}
                    onChange={(obj) => setContent(obj)}
                    styles={styles}
                  />

                  <details style={{ marginTop: 14 }}>
                    <summary className={styles.hint} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Avançado: editar como JSON
                    </summary>
                    <textarea
                      className={styles.textarea}
                      style={{ minHeight: 200, fontFamily: 'monospace', marginTop: 8 }}
                      value={draft.contentText}
                      spellCheck={false}
                      onChange={(e) => setField('contentText', e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.addBtn}
                      style={{ marginTop: 8 }}
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(draft.contentText || '{}');
                          setContent(parsed);
                          toast({ title: 'JSON aplicado ao editor.' });
                        } catch {
                          toast({ variant: 'destructive', title: 'JSON inválido', description: 'Corrija a estrutura e tente novamente.' });
                        }
                      }}
                    >
                      <Icon name="check" size={14} /> Aplicar JSON
                    </button>
                  </details>
                </div>
              )}

              <div className={styles.actions}>
                <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
                {!draft.isNew && (
                  <button type="button" className={styles.removeBtn} title="Remover" onClick={() => handleDelete(draft.slug)} style={{ width: 'auto', padding: '0 12px' }}>
                    Remover
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
