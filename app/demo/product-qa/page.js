'use client';

import { useState } from 'react';
import Button from '@/components/atoms/Button/Button';
import ProductQA from '@/components/organisms/ProductQA/ProductQA';

const MOCK_QUESTIONS = [
  {
    id: '1',
    userName: 'Carla Mendes',
    question: 'Esse produto acompanha nota fiscal e tem garantia de fábrica?',
    createdAt: 'há 2 horas',
    isAnswered: true,
    answer: 'Sim! Enviamos com nota fiscal e a garantia de fábrica é de 12 meses.',
    sellerName: 'TechStore Oficial',
    answerCreatedAt: 'há 1 hora',
  },
  {
    id: '2',
    userName: 'Rodrigo Lima',
    question: 'Vocês entregam para a região Nordeste? Qual o prazo médio?',
    createdAt: 'há 5 horas',
    isAnswered: true,
    answer: 'Entregamos para todo o Brasil. Para o Nordeste o prazo médio é de 6 a 9 dias úteis.',
    sellerName: 'TechStore Oficial',
    answerCreatedAt: 'há 4 horas',
  },
  {
    id: '3',
    userName: 'Fernanda Souza',
    question: 'O produto é original e lacrado? Posso parcelar em quantas vezes?',
    createdAt: 'há 1 dia',
    isAnswered: false,
  },
];

export default function ProductQADemoPage() {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState(MOCK_QUESTIONS);

  function handleSubmit(question) {
    setQuestions((prev) => [
      {
        id: String(Date.now()),
        userName: 'Você',
        question,
        createdAt: 'agora mesmo',
        isAnswered: false,
      },
      ...prev,
    ]);
  }

  return (
    <main style={{ padding: '48px 24px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Demo · ProductQA</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Modal global de perguntas e respostas sobre o produto.
      </p>

      <Button leftIcon="chat" onClick={() => setOpen(true)}>
        Abrir perguntas e respostas
      </Button>

      <ProductQA
        open={open}
        onClose={() => setOpen(false)}
        productName="iPhone 14 Pro Max 256GB"
        questions={questions}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
