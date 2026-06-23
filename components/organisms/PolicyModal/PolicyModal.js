'use client';

import Modal from '../Modal/Modal';
import styles from './PolicyModal.module.css';
import Icon from '../../atoms/Icon/Icon';

/**
 * Conteúdo base das políticas do marketplace. `kind` seleciona qual mostrar.
 * Texto genérico de marketplace — pode ser ajustado via SiteConfig no futuro.
 */
export const POLICIES = {
  protected: {
    icon: 'shield',
    title: 'Compra Protegida',
    intro: 'Sua compra é protegida do início ao fim. Se algo der errado, devolvemos o seu dinheiro.',
    items: [
      {
        title: 'Receba o produto que você esperava',
        text: 'Se o produto não chegar ou for diferente do anunciado, abra uma reclamação e nós medeiamos a solução.',
      },
      {
        title: 'Seu dinheiro fica retido com segurança',
        text: 'O vendedor só recebe o pagamento depois que você confirma o recebimento do produto.',
      },
      {
        title: 'Suporte durante toda a negociação',
        text: 'Nossa equipe acompanha cada etapa e intervém sempre que houver um problema com o pedido.',
      },
    ],
    note: 'A proteção é válida para compras feitas e pagas dentro do Feira do Rolo.',
  },
  returns: {
    icon: 'package',
    title: 'Devolução Grátis',
    intro: 'Não gostou? Você tem até 30 dias a partir do recebimento para devolver, sem custo.',
    items: [
      {
        title: '30 dias para se arrepender',
        text: 'O prazo começa a contar a partir da data em que você recebe o produto.',
      },
      {
        title: 'Devolução sem custo de envio',
        text: 'Geramos a etiqueta de devolução para você — não há custo de frete na maioria dos casos.',
      },
      {
        title: 'Reembolso garantido',
        text: 'Após a conferência do produto devolvido, o valor é estornado pelo mesmo meio de pagamento.',
      },
    ],
    note: 'O produto deve ser devolvido em condições adequadas, conforme as regras de devolução.',
  },
};

/**
 * Modal informativo de políticas (Compra Protegida / Devolução Grátis).
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {'protected'|'returns'} props.kind  Qual política exibir.
 */
export default function PolicyModal({ open, onClose, kind = 'protected' }) {
  const policy = POLICIES[kind] || POLICIES.protected;

  return (
    <Modal open={open} onClose={onClose} title={policy.title} size="sm">
      <div className={styles.root}>
        <div className={styles.intro}>
          <span className={styles.introIcon}>
            <Icon name={policy.icon} size={22} />
          </span>
          <p>{policy.intro}</p>
        </div>

        <ul className={styles.list}>
          {policy.items.map((it) => (
            <li key={it.title} className={styles.item}>
              <span className={styles.check} aria-hidden="true">
                <Icon name="check" size={14} />
              </span>
              <div>
                <strong>{it.title}</strong>
                <span>{it.text}</span>
              </div>
            </li>
          ))}
        </ul>

        {policy.note && <p className={styles.note}>{policy.note}</p>}

        <button type="button" className={styles.ok} onClick={onClose}>
          Entendi
        </button>
      </div>
    </Modal>
  );
}
