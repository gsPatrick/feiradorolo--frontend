'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { contentService } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';

const FALLBACK = {
  updated_at: 'Janeiro de 2025',
  sections: [
    {
      title: '1. Aceitação dos Termos',
      paragraphs: [
        'Ao acessar e usar a plataforma Feira do Rolo, você concorda em estar vinculado a estes Termos de Uso e a todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar este site.',
      ],
    },
    {
      title: '2. Descrição do Serviço',
      paragraphs: [
        'A Feira do Rolo é um marketplace online que conecta compradores e vendedores para transações de produtos diversos. Facilitamos transações entre terceiros e não somos proprietários dos produtos vendidos na plataforma, exceto quando especificamente indicado.',
      ],
    },
    {
      title: '3. Cadastro e Conta do Usuário',
      paragraphs: ['Para usar certas funcionalidades, você deve:'],
      items: [
        'Fornecer informações verdadeiras, precisas e completas',
        'Manter a confidencialidade da sua senha',
        'Notificar-nos imediatamente sobre uso não autorizado da sua conta',
        'Ter pelo menos 18 anos ou consentimento dos pais/responsáveis',
      ],
    },
    {
      title: '4. Condições de Compra',
      paragraphs: ['Ao fazer uma compra, você concorda que:'],
      items: [
        'Todas as informações fornecidas são verdadeiras',
        'Você tem autorização para usar o método de pagamento',
        'Preços estão sujeitos a alteração sem aviso prévio',
        'Reservamo-nos o direito de recusar ou cancelar pedidos',
      ],
    },
    {
      title: '5. Responsabilidades dos Vendedores',
      paragraphs: ['Os vendedores devem:'],
      items: [
        'Fornecer descrições precisas dos produtos',
        'Cumprir prazos de entrega estabelecidos',
        'Responder a dúvidas dos compradores',
        'Respeitar políticas de devolução e garantia',
        'Não vender produtos proibidos ou ilegais',
      ],
    },
    {
      title: '6. Política de Pagamentos e Reembolsos',
      paragraphs: [
        'Aceitamos diversos métodos de pagamento incluindo cartões de crédito/débito, PIX e boleto bancário. Reembolsos são processados conforme nossa política de trocas e devoluções e podem levar até 10 dias úteis para serem processados.',
      ],
    },
    {
      title: '7. Propriedade Intelectual',
      paragraphs: [
        'Todo o conteúdo do site, incluindo textos, gráficos, logos, ícones e software, é propriedade da Feira do Rolo ou de nossos licenciadores e está protegido por leis de direitos autorais e propriedade intelectual.',
      ],
    },
    {
      title: '8. Limitação de Responsabilidade',
      paragraphs: [
        'A Feira do Rolo não será responsável por danos diretos, indiretos, incidentais ou consequenciais resultantes do uso da plataforma. Nossa responsabilidade é limitada ao valor da transação específica.',
      ],
    },
    {
      title: '9. Modificações dos Termos',
      paragraphs: [
        'Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação. O uso continuado da plataforma constitui aceitação dos termos modificados.',
      ],
    },
    {
      title: '10. Notificações e Comunicações',
      paragraphs: ['Para melhorar sua experiência de compra, podemos enviar notificações sobre:'],
      items: [
        'Status de pedidos e atualizações de entrega',
        'Ofertas especiais e promoções relevantes ao seu perfil',
        'Lembretes de carrinho abandonado',
        'Mensagens de vendedores',
        'Alertas de segurança da conta',
      ],
      paragraphsAfter: [
        'Você pode gerenciar suas preferências de notificação nas configurações da sua conta ou desativá-las a qualquer momento nas configurações do seu navegador.',
      ],
    },
    {
      title: '11. Lei Aplicável',
      paragraphs: [
        'Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida nos tribunais competentes do Brasil.',
      ],
    },
  ],
  note: 'Se você tiver questões sobre estes Termos de Uso, entre em contato através da nossa Central de Ajuda ou pelo e-mail contato@feiradoro.com.br',
};

export default function TermosDeUsoPage() {
  const [content, setContent] = useState(FALLBACK);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('termos-de-uso')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const sections = content.sections || [];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.head}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/" className={styles.back}>
            Voltar
          </Button>
          <h1 className={styles.title}>Termos de Uso</h1>
          <p className={styles.updated}>Última atualização: {content.updated_at}</p>
        </div>

        {/* Documento */}
        <article className={styles.doc}>
          {sections.map((section, i) => (
            <section key={i} className={styles.section}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              {(section.paragraphs || []).map((p, idx) => (
                <p key={idx} className={styles.paragraph}>
                  {p}
                </p>
              ))}
              {section.items && section.items.length > 0 && (
                <ul className={styles.list}>
                  {section.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
              {(section.paragraphsAfter || []).map((p, idx) => (
                <p key={idx} className={styles.paragraph}>
                  {p}
                </p>
              ))}
            </section>
          ))}

          {content.note && (
            <div className={styles.note}>
              <p>
                <Icon name="shield" size={16} className={styles.noteIcon} />
                <strong>Dúvidas?</strong> {content.note}
              </p>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
