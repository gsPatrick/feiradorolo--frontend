'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './CategoryPicker.module.css';
import { cx } from '@/lib/cx';
import { categoryService } from '@/lib/api';
import Icon from '../../atoms/Icon/Icon';
import Input from '../../atoms/Input/Input';
import Button from '../../atoms/Button/Button';

const LEVEL_CLASS = ['lvl1', 'lvl2', 'lvl3', 'lvl4'];

/**
 * Seletor hierárquico de categorias (até 4 níveis), em colunas de drill-down.
 * Usa a árvore real da API (/categories/tree). Só permite confirmar a categoria
 * mais específica (folha, sem filhos).
 */
export default function CategoryPicker({ open, onClose, onConfirm }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  // path: nós selecionados por nível [n1, n2, n3, n4]
  const [path, setPath] = useState([]);

  useEffect(() => {
    if (!open || tree.length) return;
    setLoading(true);
    categoryService
      .tree()
      .then((data) => setTree(Array.isArray(data) ? data : []))
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, [open, tree.length]);

  const children = (node) => (node && Array.isArray(node.children) ? node.children : []);
  const hasChildren = (node) => children(node).length > 0;

  const roots = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tree;
    return tree.filter((c) => c.name.toLowerCase().includes(term));
  }, [tree, search]);

  // Colunas: cada uma são os filhos do nível anterior selecionado.
  const columns = [roots, children(path[0]), children(path[1]), children(path[2])];

  function selectAt(level, node) {
    setPath((prev) => [...prev.slice(0, level), node]);
  }

  const selected = path[path.length - 1] || null;
  const canConfirm = !!selected && !hasChildren(selected);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(selected, [...path]);
    reset();
  }

  function reset() {
    setSearch('');
    setPath([]);
  }

  function handleClose() {
    reset();
    onClose && onClose();
  }

  if (!open) return null;

  const colHints = [
    'Selecione uma categoria',
    'Selecione uma subcategoria',
    'Selecione uma subcategoria de nível 2',
    'Selecione uma subcategoria de nível 3',
  ];

  return (
    <div className={styles.root}>
      <div className={styles.overlay} onClick={handleClose} />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <header className={styles.head}>
          <h3>Selecionar Categoria</h3>
          <button className={styles.x} onClick={handleClose} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className={styles.searchRow}>
          <Input
            leftIcon="search"
            placeholder="Buscar categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.columns}>
          {loading ? (
            <div className={styles.colHint}>Carregando categorias...</div>
          ) : (
            columns.map((items, level) => {
              const parentChosen = level === 0 || path[level - 1];
              return (
                <div key={level} className={styles.column}>
                  {!parentChosen ? (
                    <div className={styles.colHint}>{colHints[level]}</div>
                  ) : items.length === 0 ? (
                    <div className={styles.colHint}>
                      {level === 0 ? 'Nenhuma categoria encontrada' : 'Sem subcategorias'}
                    </div>
                  ) : (
                    items.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        className={cx(
                          styles.item,
                          path[level]?.id === node.id && styles[LEVEL_CLASS[level]]
                        )}
                        onClick={() => selectAt(level, node)}
                      >
                        <span className={styles.itemLabel}>
                          {node.icon && <span className={styles.emoji}>{node.icon}</span>}
                          {node.name}
                        </span>
                        {hasChildren(node) && <Icon name="arrow-right" size={14} className={styles.chev} />}
                      </button>
                    ))
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className={styles.foot}>
          <div className={styles.breadcrumb}>
            {selected ? (
              <>
                <span className={styles.bcLabel}>Selecionada: </span>
                <span className={styles.bcPath}>
                  {path.map((n, i) => (
                    <span key={n.id} className={styles[LEVEL_CLASS[i] + 'Text']}>
                      {i > 0 && ' → '}
                      {i === 0 && n.icon ? `${n.icon} ` : ''}
                      {n.name}
                    </span>
                  ))}
                </span>
                {!canConfirm && (
                  <div className={styles.warn}>
                    ⚠️ Esta categoria possui subcategorias. Selecione a mais específica para continuar.
                  </div>
                )}
              </>
            ) : (
              <span className={styles.bcLabel}>Nenhuma categoria selecionada</span>
            )}
          </div>
          <div className={styles.actions}>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Confirmar
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
