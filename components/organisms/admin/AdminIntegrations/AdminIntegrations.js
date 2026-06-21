'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './AdminIntegrations.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import { adminConfigService } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';

/* ============================================================
 * Catálogo didático de integrações.
 * Cada serviço explica "para que serve" e mostra onde pegar as chaves.
 * - kind: 'gateway' | 'integration' (define qual endpoint usar)
 * - config: campos NÃO-secretos (vêm de volta da API e pré-preenchem)
 * - secrets: campos secretos (NUNCA voltam; só enviamos quando preenchidos)
 * ============================================================ */
const CATALOG = [
  {
    category: 'Pagamento',
    items: [
      {
        kind: 'gateway',
        key: 'mercado_pago',
        match: { provider: 'mercado_pago' },
        provider: 'mercado_pago',
        icon: 'card',
        logo: '/app/mercadopago.png',
        name: 'Mercado Pago',
        purpose: 'Receber pagamentos no checkout — cartão de crédito, Pix e boleto.',
        hasEnvironment: true,
        link: 'https://www.mercadopago.com.br/developers/panel/app',
        steps: [
          'Acesse o painel de desenvolvedores e faça login.',
          'Crie uma aplicação e abra "Credenciais".',
          'Copie as credenciais (escolha Produção ou Teste).',
        ],
        config: [
          { name: 'public_key', label: 'Public Key', placeholder: 'APP_USR-...' },
          { name: 'client_id', label: 'Client ID', placeholder: 'Ex.: 1234567890' },
        ],
        secrets: [
          { name: 'access_token', label: 'Access Token' },
          { name: 'client_secret', label: 'Client Secret' },
          { name: 'webhook_secret', label: 'Webhook Secret' },
        ],
      },
    ],
  },
  {
    category: 'Frete',
    items: [
      {
        kind: 'integration',
        key: 'melhor_envio',
        match: { service: 'melhor_envio' },
        service: 'melhor_envio',
        icon: 'truck',
        name: 'Melhor Envio',
        purpose: 'Cotar valores de frete e gerar etiquetas de envio.',
        link: 'https://melhorenvio.com.br/painel/gerenciar/tokens',
        steps: [
          'Entre no painel do Melhor Envio.',
          'Vá em Gerenciar → Tokens.',
          'Gere um token de acesso e copie-o.',
        ],
        config: [{ name: 'from_cep', label: 'CEP de origem', placeholder: '00000-000' }],
        secrets: [{ name: 'token', label: 'Token de acesso' }],
      },
    ],
  },
  {
    category: 'E-mail',
    items: [
      {
        kind: 'integration',
        key: 'resend',
        match: { service: 'resend' },
        service: 'resend',
        icon: 'mail',
        name: 'Resend',
        purpose: 'Enviar e-mails transacionais (verificação, pedidos, recuperação de senha). Plano grátis: 3.000/mês.',
        link: 'https://resend.com/api-keys',
        steps: [
          'Crie a conta em resend.com e verifique seu domínio (ou use o domínio de teste).',
          'Vá em API Keys → Create API Key.',
          'Copie a chave (começa com "re_") e cole abaixo.',
        ],
        config: [
          { name: 'sender_email', label: 'E-mail remetente', placeholder: 'no-reply@feiradorolo.com' },
          { name: 'sender_name', label: 'Nome do remetente', placeholder: 'Feira do Rolo' },
        ],
        secrets: [{ name: 'api_key', label: 'API Key (re_...)' }],
      },
      {
        kind: 'integration',
        key: 'brevo',
        match: { service: 'brevo' },
        service: 'brevo',
        icon: 'mail',
        name: 'Brevo',
        purpose: 'Enviar e-mails transacionais (confirmações, recuperação de senha).',
        link: 'https://app.brevo.com/settings/keys/api',
        steps: [
          'Acesse Settings → SMTP & API → API Keys.',
          'Crie uma API key (v3).',
          'Copie a chave gerada.',
        ],
        config: [
          { name: 'sender_email', label: 'E-mail remetente', placeholder: 'contato@feiradorolo.com' },
          { name: 'sender_name', label: 'Nome do remetente', placeholder: 'Feira do Rolo' },
        ],
        secrets: [{ name: 'api_key', label: 'API Key (v3)' }],
      },
    ],
  },
  {
    category: 'WhatsApp',
    items: [
      {
        kind: 'integration',
        key: 'zapi',
        match: { service: 'zapi' },
        service: 'zapi',
        icon: 'chat',
        name: 'Z-API (WhatsApp)',
        purpose: 'Enviar códigos de verificação por WhatsApp (verificação de telefone).',
        link: 'https://app.z-api.io/',
        steps: [
          'Crie a conta e uma instância em app.z-api.io e conecte seu número (QR Code).',
          'Copie o ID da Instância e o Token (na tela da instância).',
          'Em Segurança, copie o Account Security Token (Client-Token).',
        ],
        config: [{ name: 'instance_id', label: 'ID da Instância', placeholder: 'Ex.: 3D1F...' }],
        secrets: [
          { name: 'token', label: 'Token da Instância' },
          { name: 'client_token', label: 'Account Security Token (Client-Token)' },
        ],
      },
    ],
  },
  {
    category: 'Storage',
    items: [
      {
        kind: 'integration',
        key: 'firebase',
        match: { service: 'firebase' },
        service: 'firebase',
        icon: 'package',
        name: 'Firebase Storage',
        purpose: 'Armazenar imagens de produtos e avatares dos usuários.',
        link: 'https://console.firebase.google.com/',
        steps: [
          'Crie um projeto e ative o Storage.',
          'Vá em Configurações do projeto → Contas de serviço.',
          'Gere a chave privada (arquivo JSON) e cole abaixo.',
        ],
        config: [
          { name: 'project_id', label: 'Project ID', placeholder: 'meu-projeto' },
          { name: 'bucket', label: 'Bucket', placeholder: 'meu-projeto.appspot.com' },
        ],
        secrets: [{ name: 'service_account_json', label: 'Service Account (JSON)', textarea: true }],
      },
    ],
  },
  {
    category: 'Notificações Push',
    items: [
      {
        kind: 'integration',
        key: 'fcm',
        match: { service: 'fcm' },
        service: 'fcm',
        icon: 'bell',
        name: 'Firebase Cloud Messaging',
        purpose: 'Enviar notificações push para o aplicativo.',
        link: 'https://console.firebase.google.com/',
        steps: [
          'Abra o projeto no console do Firebase.',
          'Vá em Configurações do projeto → Cloud Messaging.',
          'Copie a chave do servidor (Server key).',
        ],
        config: [],
        secrets: [{ name: 'server_key', label: 'Server Key' }],
      },
      {
        kind: 'integration',
        key: 'onesignal',
        match: { service: 'onesignal' },
        service: 'onesignal',
        icon: 'bell',
        name: 'OneSignal',
        purpose: 'Notificações push multiplataforma (web e app).',
        link: 'https://dashboard.onesignal.com/',
        steps: [
          'Crie um app no dashboard do OneSignal.',
          'Abra Settings → Keys & IDs.',
          'Copie o App ID e a REST API Key.',
        ],
        config: [{ name: 'app_id', label: 'App ID', placeholder: 'xxxxxxxx-xxxx-...' }],
        secrets: [{ name: 'rest_api_key', label: 'REST API Key' }],
      },
    ],
  },
];

const ENVIRONMENTS = [
  { value: 'production', label: 'Produção' },
  { value: 'test', label: 'Teste' },
];

/* Status derivado dos flags mascarados. */
function deriveStatus(item, record) {
  if (!record) return { tone: 'off', label: 'Não configurado' };
  if (record.is_active) return { tone: 'active', label: 'Ativo' };
  return { tone: 'configured', label: 'Configurado' };
}

/* Encontra o registro existente correspondente ao item do catálogo. */
function findRecord(item, gateways, integrations, environment) {
  if (item.kind === 'gateway') {
    const list = gateways.filter((g) => g.provider === item.match.provider);
    return (
      list.find((g) => g.environment === environment) || list[0] || null
    );
  }
  return integrations.find((i) => i.service === item.match.service) || null;
}

/* Quais segredos já estão configurados (para mostrar "configurado ✓"). */
function secretConfigured(item, record) {
  if (!record) return {};
  const out = {};
  for (const s of item.secrets) {
    if (item.kind === 'gateway') {
      const flag = 'has' + s.name.split('_').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
      out[s.name] = !!record[flag];
    } else {
      out[s.name] = !!record.hasCredentials;
    }
  }
  return out;
}

function ServiceCard({ item, category, gateways, integrations, onReload }) {
  const { toast } = useToast();
  const [environment, setEnvironment] = useState('production');

  const record = useMemo(
    () => findRecord(item, gateways, integrations, environment),
    [item, gateways, integrations, environment]
  );

  // Estados locais dos campos (config + secrets).
  const [config, setConfig] = useState({});
  const [secrets, setSecrets] = useState({});
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);

  // Sincroniza ambiente do gateway com o registro encontrado.
  useEffect(() => {
    if (item.kind === 'gateway' && record && record.environment) {
      setEnvironment((env) => (env === record.environment ? env : record.environment));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record && record.id]);

  // Pré-preenche config não-secreta a partir do registro mascarado.
  useEffect(() => {
    const next = {};
    for (const f of item.config) {
      if (item.kind === 'gateway') {
        next[f.name] = record && record[f.name] != null ? record[f.name] : '';
      } else {
        const c = (record && record.config) || {};
        next[f.name] = c[f.name] != null ? c[f.name] : '';
      }
    }
    setConfig(next);
    setSecrets({});
    setLabel((record && record.label) || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record && record.id, item.key]);

  const status = deriveStatus(item, record);
  const secretFlags = secretConfigured(item, record);

  async function handleSave() {
    setSaving(true);
    try {
      let data;
      if (item.kind === 'gateway') {
        data = {
          provider: item.provider,
          environment,
          label: label || `${item.name} (${environment})`,
        };
        for (const f of item.config) {
          if (config[f.name] !== '' && config[f.name] != null) data[f.name] = config[f.name];
        }
        // segredos em claro: só enviar os preenchidos
        for (const s of item.secrets) {
          const v = secrets[s.name];
          if (v && v.trim() !== '') data[s.name] = v;
        }
        if (record) await adminConfigService.updateGateway(record.id, data);
        else await adminConfigService.createGateway(data);
      } else {
        const cfg = {};
        for (const f of item.config) {
          if (config[f.name] !== '' && config[f.name] != null) cfg[f.name] = config[f.name];
        }
        const creds = {};
        for (const s of item.secrets) {
          const v = secrets[s.name];
          if (v && v.trim() !== '') creds[s.name] = v;
        }
        data = {
          service: item.service,
          environment: 'production',
          label: label || item.name,
          config: cfg,
        };
        if (Object.keys(creds).length) data.credentials = creds;
        if (record) await adminConfigService.updateIntegration(record.id, data);
        else await adminConfigService.createIntegration(data);
      }
      toast({ title: 'Salvo', description: `${item.name} atualizado com sucesso.`, variant: 'success' });
      await onReload();
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: (e && e.message) || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (!record) {
      toast({
        title: 'Configure primeiro',
        description: 'Salve as credenciais antes de ativar.',
        variant: 'destructive',
      });
      return;
    }
    setActivating(true);
    try {
      if (item.kind === 'gateway') await adminConfigService.activateGateway(record.id);
      else await adminConfigService.activateIntegration(record.id);
      toast({ title: 'Ativado', description: `${item.name} está ativo.`, variant: 'success' });
      await onReload();
    } catch (e) {
      toast({
        title: 'Erro ao ativar',
        description: (e && e.message) || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  }

  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <span className={styles.cardIcon}>
          {item.logo ? <img src={item.logo} alt="" className={styles.cardLogo} /> : <Icon name={item.icon} size={22} />}
        </span>
        <div className={styles.cardTitle}>
          {category && <span className={styles.cardCat}>{category}</span>}
          <h4>{item.name}</h4>
          <p>{item.purpose}</p>
        </div>
        <span className={`${styles.badge} ${styles['badge_' + status.tone]}`}>
          {status.tone === 'active' && <Icon name="check" size={13} />}
          {status.label}
        </span>
      </header>

      <div className={styles.help}>
        <div className={styles.helpTitle}>
          <Icon name="bulb" size={15} />
          Onde pegar as chaves:
        </div>
        <a className={styles.helpLink} href={item.link} target="_blank" rel="noreferrer noopener">
          {item.link}
        </a>
        <ol className={styles.steps}>
          {item.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      <div className={styles.fields}>
        {item.hasEnvironment && (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Ambiente</span>
            <select
              className={styles.select}
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env.value} value={env.value}>
                  {env.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Apelido (opcional)</span>
          <input
            className={styles.input}
            type="text"
            value={label}
            placeholder={item.name}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        {item.config.map((f) => (
          <label key={f.name} className={styles.field}>
            <span className={styles.fieldLabel}>{f.label}</span>
            <input
              className={styles.input}
              type="text"
              value={config[f.name] ?? ''}
              placeholder={f.placeholder || ''}
              onChange={(e) => setConfig((c) => ({ ...c, [f.name]: e.target.value }))}
            />
          </label>
        ))}

        {item.secrets.map((s) => (
          <label key={s.name} className={`${styles.field} ${s.textarea ? styles.fieldWide : ''}`}>
            <span className={styles.fieldLabel}>
              {s.label}
              {secretFlags[s.name] && <span className={styles.secretOk}>configurado ✓</span>}
            </span>
            {s.textarea ? (
              <textarea
                className={styles.textarea}
                rows={4}
                value={secrets[s.name] ?? ''}
                placeholder="•••• (deixe em branco para manter)"
                onChange={(e) => setSecrets((v) => ({ ...v, [s.name]: e.target.value }))}
              />
            ) : (
              <input
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={secrets[s.name] ?? ''}
                placeholder="•••• (deixe em branco para manter)"
                onChange={(e) => setSecrets((v) => ({ ...v, [s.name]: e.target.value }))}
              />
            )}
          </label>
        ))}
      </div>

      <footer className={styles.cardActions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={handleActivate}
          disabled={activating || !record || status.tone === 'active'}
        >
          <Icon name="bolt" size={15} />
          {status.tone === 'active' ? 'Ativo' : activating ? 'Ativando…' : 'Ativar'}
        </button>
      </footer>
    </article>
  );
}

/* Card informativo (somente leitura) sobre a validação de CNPJ via ReceitaWS.
 * Não há chaves nem campos para configurar — é automático na verificação do vendedor. */
function ReceitaWsCard() {
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <span className={styles.cardIcon}>
          <Icon name="shield" size={22} />
        </span>
        <div className={styles.cardTitle}>
          <span className={styles.cardCat}>Validação de Documentos</span>
          <h4>ReceitaWS — Validação de CNPJ</h4>
          <p>
            Consultada automaticamente para validar o CNPJ do vendedor durante a verificação da conta.
          </p>
        </div>
        <span className={`${styles.badge} ${styles.badge_active}`}>
          <Icon name="check" size={13} />
          Automático
        </span>
      </header>

      <div className={styles.help}>
        <div className={styles.helpTitle}>
          <Icon name="bulb" size={15} />
          Como funciona:
        </div>
        <ul className={styles.steps}>
          <li>
            <strong>Não requer chave:</strong> é um serviço público e gratuito — não há nada a
            configurar aqui.
          </li>
          <li>
            <strong>Limite:</strong> cerca de 3 consultas por minuto no plano gratuito.
          </li>
          <li>
            <strong>Cobertura:</strong> valida apenas CNPJ; o CPF passa só por validação de formato.
          </li>
          <li>
            Para volume maior, a ReceitaWS oferece planos pagos com limites ampliados.
          </li>
        </ul>
        <a
          className={styles.helpLink}
          href="https://receitaws.com.br/"
          target="_blank"
          rel="noreferrer noopener"
        >
          Saiba mais — receitaws.com.br
        </a>
      </div>
    </article>
  );
}

export default function AdminIntegrations() {
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [gateways, setGateways] = useState([]);
  const [integrations, setIntegrations] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setUnauth(false);
    try {
      const [g, i] = await Promise.all([
        adminConfigService.gateways(),
        adminConfigService.integrations(),
      ]);
      setGateways(Array.isArray(g) ? g : []);
      setIntegrations(Array.isArray(i) ? i : []);
    } catch (e) {
      if (e && e.status === 401) setUnauth(true);
      setGateways([]);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loading}>Carregando integrações…</div>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className={styles.wrap}>
        <div className={styles.unauth}>
          <Icon name="shield" size={28} />
          <p>Faça login como administrador para configurar as integrações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        <span className={styles.bannerIcon}>🔒</span>
        As chaves são criptografadas no servidor e nunca são exibidas de volta.
      </div>

      <div className={styles.grid}>
        <ReceitaWsCard />
        {CATALOG.flatMap((group) =>
          group.items.map((item) => (
            <ServiceCard
              key={item.key}
              item={item}
              category={group.category}
              gateways={gateways}
              integrations={integrations}
              onReload={load}
            />
          ))
        )}
      </div>
    </div>
  );
}
