'use client';

import { useEffect, useState } from 'react';
import styles from './ProductQA.module.css';
import { cx } from '@/lib/cx';
import Modal from '../Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import Button from '../../atoms/Button/Button';
import Textarea from '../../atoms/Textarea/Textarea';
import Badge from '../../atoms/Badge/Badge';
import { useToast } from '@/components/providers/ToastProvider';

const MIN = 10;
const MAX = 500;

/**
 * Modal "Perguntas e Respostas" — réplica fiel do ProductQA do front antigo:
 * lista de perguntas/respostas (respondidas + aguardando) e formulário de nova
 * pergunta (textarea 10–500 com contador, botão desabilitado até válido, nota
 * de moderação automática) + estatísticas. Submit simulado → toast de sucesso.
 *
 * Props: { open, onClose, productName, questions, onSubmit(question) }
 */
export default function ProductQA({ open, onClose, productName, questions = [], onSubmit }) {
  const [showForm, setShowForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setShowForm(false);
      setNewQuestion('');
      setSubmitting(false);
    }
  }, [open]);

  const trimmedLen = newQuestion.trim().length;
  const tooShort = newQuestion.length < MIN;
  const answeredCount = questions.filter((q) => q.isAnswered).length;

  function handleSubmit(e) {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    if (newQuestion.length < MIN) {
      toast({
        title: 'Pergunta muito curta',
        description: 'Por favor, faça uma pergunta mais detalhada (mínimo 10 caracteres)',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    // Submit simulado
    setTimeout(() => {
      onSubmit && onSubmit(newQuestion.trim());
      toast({
        title: 'Pergunta enviada!',
        description: 'Sua pergunta foi enviada ao vendedor e será respondida em breve.',
      });
      setNewQuestion('');
      setShowForm(false);
      setSubmitting(false);
    }, 700);
  }

  const title = (
    <span className={styles.title}>
      <Icon name="chat" size={20} className={styles.titleIcon} />
      Perguntas e Respostas
      {questions.length > 0 && (
        <Badge variant="neutral" size="sm" className={styles.titleBadge}>
          {questions.length}
        </Badge>
      )}
    </span>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {productName && <p className={styles.subtitle}>{productName}</p>}

      {!showForm && (
        <div className={styles.askRow}>
          <Button variant="outline" size="sm" leftIcon="arrow-right" onClick={() => setShowForm(true)}>
            Fazer pergunta
          </Button>
        </div>
      )}

      {/* Formulário de nova pergunta */}
      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.formLabel}>Sua pergunta para o vendedor:</label>
          <Textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value.slice(0, MAX))}
            placeholder="Digite sua pergunta sobre o produto, entrega, garantia, etc..."
            className={styles.textarea}
            maxLength={MAX}
            invalid={newQuestion.length > 0 && tooShort}
          />
          <div className={styles.meta}>
            <span className={styles.metaText}>
              {newQuestion.length}/{MAX} caracteres
            </span>
            <span className={styles.metaText}>Mínimo {MIN} caracteres</span>
          </div>

          <p className={styles.moderation}>
            <Icon name="shield" size={14} className={styles.moderationIcon} />
            Sua pergunta passa por moderação automática antes de ser publicada.
          </p>

          <div className={styles.formActions}>
            <Button
              type="submit"
              fullWidth
              loading={submitting}
              disabled={tooShort || submitting}
              leftIcon={submitting ? undefined : 'arrow-right'}
            >
              {submitting ? 'Enviando...' : 'Enviar Pergunta'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setNewQuestion('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* Lista de perguntas e respostas */}
      {questions.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="chat" size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>Nenhuma pergunta ainda</h3>
          <p className={styles.emptyText}>Seja o primeiro a fazer uma pergunta sobre este produto!</p>
          {!showForm && (
            <Button leftIcon="arrow-right" onClick={() => setShowForm(true)}>
              Fazer primeira pergunta
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {questions.map((qa) => (
            <article key={qa.id} className={styles.qaCard}>
              {/* Pergunta */}
              <div className={styles.qBlock}>
                <div className={styles.qHead}>
                  <span className={styles.who}>
                    <Icon name="user" size={16} className={styles.whoIcon} />
                    <strong className={styles.whoName}>{qa.userName}</strong>
                    <span className={styles.whoLabel}>perguntou</span>
                  </span>
                  <span className={styles.time}>
                    <Icon name="bell" size={12} className={styles.timeIcon} />
                    {qa.createdAt}
                  </span>
                </div>
                <p className={styles.qText}>{qa.question}</p>
              </div>

              {/* Resposta */}
              {qa.isAnswered && qa.answer ? (
                <div className={cx(styles.answer, styles.answered)}>
                  <div className={styles.aHead}>
                    <span className={styles.who}>
                      <span className={styles.sellerAvatar}>V</span>
                      <strong className={styles.sellerName}>{qa.sellerName}</strong>
                      <Badge variant="success" size="sm">
                        Vendedor
                      </Badge>
                    </span>
                    {qa.answerCreatedAt && (
                      <span className={styles.time}>
                        <Icon name="bell" size={12} className={styles.timeIcon} />
                        {qa.answerCreatedAt}
                      </span>
                    )}
                  </div>
                  <p className={styles.aText}>{qa.answer}</p>
                </div>
              ) : (
                <div className={cx(styles.answer, styles.pending)}>
                  <Icon name="bell" size={16} className={styles.pendingIcon} />
                  <span className={styles.pendingText}>Aguardando resposta do vendedor</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Estatísticas */}
      {questions.length > 0 && (
        <div className={styles.stats}>
          <div className={styles.statBox}>
            <div className={styles.statNum}>{questions.length}</div>
            <div className={styles.statLabel}>
              {questions.length === 1 ? 'Pergunta' : 'Perguntas'}
            </div>
          </div>
          <div className={styles.statBox}>
            <div className={cx(styles.statNum, styles.statNumOk)}>{answeredCount}</div>
            <div className={styles.statLabel}>Respondidas</div>
          </div>
        </div>
      )}
    </Modal>
  );
}
