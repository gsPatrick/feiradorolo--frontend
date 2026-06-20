'use client';

/**
 * Editor recursivo e AMIGÁVEL (sem JSON) para o conteúdo das páginas
 * institucionais. Percorre o objeto `content` e gera inputs para cada campo:
 * strings → input/textarea, números/booleanos → controles próprios, arrays →
 * listas com adicionar/remover, objetos → grupos aninhados. Funciona com
 * qualquer estrutura (quem-somos, planos-e-taxas, como-vender, etc.).
 */
import Icon from '@/components/atoms/Icon/Icon';

const LABELS = {
  header: 'Cabeçalho', title: 'Título', subtitle: 'Subtítulo', text: 'Texto', body: 'Texto',
  description: 'Descrição', label: 'Rótulo', name: 'Nome', value: 'Valor', price: 'Preço',
  cta: 'Botão', cta_text: 'Texto do botão', cta_url: 'Link do botão', url: 'Link', link: 'Link',
  icon: 'Ícone', stats: 'Números', values: 'Valores', features: 'Recursos', steps: 'Passos',
  faq: 'Perguntas frequentes', question: 'Pergunta', answer: 'Resposta', items: 'Itens',
  benefits: 'Benefícios', plans: 'Planos', mission: 'Missão', vision: 'Visão', team: 'Equipe',
  alert: 'Aviso', note: 'Nota', tips: 'Dicas', courses: 'Cursos', resources: 'Materiais',
  webinars: 'Webinars', achievement: 'Conquista', requirements: 'Requisitos', pricing: 'Preços',
  categoriesTable: 'Tabela de categorias', commissions: 'Comissões', duration_days: 'Duração (dias)',
  period: 'Período', role: 'Cargo', email: 'E-mail', phone: 'Telefone', strip: 'Faixa',
  timeline: 'Linha do tempo', timelineTitle: 'Título da linha do tempo', valuesTitle: 'Título dos valores',
  teamTitle: 'Título da equipe', helpLinks: 'Links de ajuda', successMessage: 'Mensagem de sucesso',
  placeholder: 'Texto de exemplo', options: 'Opções', heading: 'Título', subheading: 'Subtítulo',
};

// Campos estruturais/visuais que NÃO são copy — mantidos no conteúdo (layout e
// ícones preservados), mas ocultos do editor. Só textos são editáveis.
const HIDDEN_KEYS = new Set([
  'icon', 'icons', 'id', 'key', 'slug', 'url', 'link', 'href', 'cta_url', 'ctaUrl',
  'image', 'img', 'image_url', 'imageUrl', 'background', 'background_type', 'background_color',
  'background_gradient', 'color', 'colors', 'variant', 'tone', 'size', 'position', 'order',
]);

function humanize(key) {
  if (LABELS[key]) return LABELS[key];
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Cria um item novo a partir do molde: zera os textos editáveis, mas PRESERVA
// os campos estruturais/visuais (ícone, cor…) do molde para manter o layout.
function emptyLike(sample) {
  if (typeof sample === 'string') return '';
  if (typeof sample === 'number') return 0;
  if (typeof sample === 'boolean') return false;
  if (Array.isArray(sample)) return [];
  if (sample && typeof sample === 'object') {
    const o = {};
    for (const k of Object.keys(sample)) o[k] = HIDDEN_KEYS.has(k) ? sample[k] : emptyLike(sample[k]);
    return o;
  }
  return '';
}

function FieldNode({ label, value, onChange, styles, depth, longHint }) {
  if (typeof value === 'string') {
    const long = value.length > 60 || longHint;
    return (
      <div className={styles.field}>
        <label className={styles.label}>{label}</label>
        {long ? (
          <textarea
            className={styles.textarea}
            style={{ minHeight: 70 }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
        )}
      </div>
    );
  }
  if (typeof value === 'number') {
    return (
      <div className={styles.field}>
        <label className={styles.label}>{label}</label>
        <input
          className={styles.input}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </div>
    );
  }
  if (typeof value === 'boolean') {
    return (
      <div className={styles.field}>
        <label className={styles.label} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
          {label}
        </label>
      </div>
    );
  }
  if (Array.isArray(value)) {
    return <ArrayNode label={label} value={value} onChange={onChange} styles={styles} depth={depth} />;
  }
  if (value && typeof value === 'object') {
    return (
      <div className={styles.field}>
        <label className={styles.label}>{label}</label>
        <div className={styles.card} style={{ marginTop: 6, background: 'var(--bg-1, #f8fafc)' }}>
          <ObjectNode value={value} onChange={onChange} styles={styles} depth={depth + 1} />
        </div>
      </div>
    );
  }
  return null;
}

function ArrayNode({ label, value, onChange, styles, depth }) {
  const sample = value.length ? value[0] : '';
  const longKey = /text|body|answer|description/i.test(label);
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label} ({value.length})
      </label>
      {value.map((item, i) => (
        <div key={i} className={styles.card} style={{ marginTop: 8 }}>
          <div className={styles.listItem} style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {item && typeof item === 'object' && !Array.isArray(item) ? (
                <ObjectNode
                  value={item}
                  onChange={(nv) => {
                    const next = [...value];
                    next[i] = nv;
                    onChange(next);
                  }}
                  styles={styles}
                  depth={depth + 1}
                />
              ) : (
                <FieldNode
                  label={`Item ${i + 1}`}
                  value={item}
                  longHint={longKey}
                  onChange={(nv) => {
                    const next = [...value];
                    next[i] = nv;
                    onChange(next);
                  }}
                  styles={styles}
                  depth={depth + 1}
                />
              )}
            </div>
            <button
              type="button"
              className={styles.removeBtn}
              title="Remover item"
              aria-label="Remover item"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={styles.addBtn}
        style={{ marginTop: 8 }}
        onClick={() => onChange([...value, emptyLike(sample)])}
      >
        <Icon name="plus" size={14} /> Adicionar
      </button>
    </div>
  );
}

function ObjectNode({ value, onChange, styles, depth }) {
  return Object.entries(value)
    .filter(([k]) => !HIDDEN_KEYS.has(k))
    .map(([k, v]) => (
      <FieldNode
        key={k}
        label={humanize(k)}
        value={v}
        onChange={(nv) => onChange({ ...value, [k]: nv })}
        styles={styles}
        depth={depth}
      />
    ));
}

export default function ContentEditor({ value, onChange, styles }) {
  const obj = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  if (!Object.keys(obj).length) {
    return (
      <div className={styles.hint}>
        Esta página ainda não tem conteúdo estruturado. Use o modo avançado (JSON) abaixo para definir os blocos.
      </div>
    );
  }
  return <ObjectNode value={obj} onChange={onChange} styles={styles} depth={0} />;
}
