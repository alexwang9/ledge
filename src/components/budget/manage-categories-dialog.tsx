'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { BudgetCategoryView, CategoryType } from '@/lib/budget-math';
import { cn } from '@/lib/utils';

interface Rule {
  id: string;
  merchantName: string;
  categoryName: string | null;
  ignore: boolean;
}

interface ManageCategoriesDialogProps {
  open: boolean;
  categories: BudgetCategoryView[];
  onClose: () => void;
  /** Called after any mutation so the parent refetches. */
  onChanged: () => void;
}

const GROUPS: Array<{ label: string; type: CategoryType }> = [
  { label: 'Income', type: 'INCOME' },
  { label: 'Expenses', type: 'EXPENSE' },
  { label: 'Savings & Transfers', type: 'SAVINGS_TRANSFER' },
];

async function requestJson(url: string, method: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function CategoryGroup({
  label,
  type,
  categories,
  onChanged,
}: {
  label: string;
  type: CategoryType;
  categories: BudgetCategoryView[];
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { toast } = useToast();

  const showError = (description: string) =>
    toast({ variant: 'destructive', title: 'Error', description });

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await requestJson('/api/categories', 'POST', { name, type });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? 'Failed to add category');
        return;
      }
      setNewName('');
      onChanged();
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (category: BudgetCategoryView) => {
    const name = editName.trim();
    setEditingId(null);
    if (!name || name === category.name) return;
    const res = await requestJson(`/api/categories/${category.id}`, 'PATCH', { name });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showError(data.error ?? 'Failed to rename category');
      return;
    }
    onChanged();
  };

  const handleDelete = async (category: BudgetCategoryView) => {
    if (
      !window.confirm(
        `Delete "${category.name}"? Its transactions become Uncategorized (nothing is lost).`
      )
    ) {
      return;
    }
    const res = await requestJson(`/api/categories/${category.id}`, 'DELETE');
    if (!res.ok) {
      showError('Failed to delete category');
      return;
    }
    onChanged();
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const orderedIds = categories.map((c) => c.id);
    [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];
    const res = await requestJson('/api/categories/reorder', 'PATCH', { type, orderedIds });
    if (!res.ok) {
      showError('Failed to reorder categories');
      return;
    }
    onChanged();
  };

  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-white/40 font-medium mb-2">{label}</h3>
      <div className="space-y-1">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/[0.03] group"
          >
            <div className="flex flex-col shrink-0">
              <button
                onClick={() => handleMove(index, -1)}
                disabled={index === 0}
                className="text-white/20 hover:text-white/60 disabled:opacity-30 disabled:hover:text-white/20"
                aria-label={`Move ${category.name} up`}
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleMove(index, 1)}
                disabled={index === categories.length - 1}
                className="text-white/20 hover:text-white/60 disabled:opacity-30 disabled:hover:text-white/20"
                aria-label={`Move ${category.name} down`}
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            {editingId === category.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRename(category)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(category);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.15] rounded px-2 py-0.5 text-sm text-white outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(category.id);
                  setEditName(category.name);
                }}
                className="flex-1 min-w-0 text-left text-sm text-white/75 hover:text-white truncate px-2 py-0.5"
                title="Click to rename"
              >
                {category.name}
              </button>
            )}
            <button
              onClick={() => handleDelete(category)}
              className="text-white/15 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              aria-label={`Delete ${category.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newName}
            placeholder={`Add ${label.toLowerCase()} category…`}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-8 bg-white/[0.04] border-white/[0.08] text-sm text-white placeholder:text-white/25"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="h-8 px-2 text-white/50 hover:text-white hover:bg-white/[0.06]"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RulesTab({ open }: { open: boolean }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rules');
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data = await res.json();
      setRules(data.rules);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchRules();
  }, [open, fetchRules]);

  const handleDelete = async (rule: Rule) => {
    const res = await fetch(`/api/rules/${rule.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete rule' });
      return;
    }
    fetchRules();
  };

  if (loading) {
    return <div className="py-8 text-center text-white/40 text-sm">Loading…</div>;
  }
  if (rules.length === 0) {
    return (
      <div className="py-8 text-center text-white/40 text-sm">
        No merchant rules yet. Create them from the Uncategorized dialog by checking
        “rule” when assigning a category.
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/[0.05]">
      {rules.map((rule) => (
        <div key={rule.id} className="flex items-center justify-between gap-3 py-2 group">
          <div className="min-w-0">
            <p className="text-sm text-white/75 truncate">{rule.merchantName}</p>
            <p className="text-xs text-white/35">
              {rule.ignore ? 'Ignored' : `→ ${rule.categoryName ?? 'Unknown'}`}
            </p>
          </div>
          <button
            onClick={() => handleDelete(rule)}
            className="text-white/15 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            aria-label={`Delete rule for ${rule.merchantName}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ManageCategoriesDialog({
  open,
  categories,
  onClose,
  onChanged,
}: ManageCategoriesDialogProps) {
  const [tab, setTab] = useState<'categories' | 'rules'>('categories');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#0a0a0a] border-white/[0.08] text-white max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white/90">Manage categories</DialogTitle>
          <div className="flex gap-1 pt-2">
            {(['categories', 'rules'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-3 py-1 rounded-md text-sm capitalize transition-colors',
                  tab === t
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                )}
              >
                {t === 'rules' ? 'Merchant rules' : 'Categories'}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {tab === 'categories' ? (
            <div className="space-y-5">
              {GROUPS.map((group) => (
                <CategoryGroup
                  key={group.type}
                  label={group.label}
                  type={group.type}
                  categories={categories.filter((c) => c.type === group.type)}
                  onChanged={onChanged}
                />
              ))}
            </div>
          ) : (
            <RulesTab open={open && tab === 'rules'} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
