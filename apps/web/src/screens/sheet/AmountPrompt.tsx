import React, { useState } from 'react';
import { create } from 'zustand';
import { Dialog } from '../../ui/Dialog';
import { Button, IconButton } from '../../ui/primitives';
import { IconMinus, IconPlus } from '../../ui/icons';

/** How much to spend: a number between `min` and `max`, with what it gives. */
interface AmountQuestion {
  kind: 'amount';
  title: string;
  /** What is spent ("Наложение рук"), over the number. */
  unit: string;
  min: number;
  max: number;
  /** What the amount gives ("Лечение 7", "3к8"). */
  preview?: (amount: number) => string;
  onPick: (amount: number) => void;
}

/** One of a few options, each with why it cannot be taken now (Font of Magic: which slot). */
interface OptionQuestion {
  kind: 'options';
  title: string;
  options: { key: string; label: string; detail: string; blocked: string | null; onPick: () => void }[];
}

type Question = AmountQuestion | OptionQuestion;

interface AmountPromptState {
  question: Question | null;
  ask: (question: Question) => void;
  close: () => void;
}

/** The open question "how much?" or "which one?" of an ability, answered by `AmountPrompt`. */
export const useAmountPrompt = create<AmountPromptState>((set) => ({
  question: null,
  ask: (question) => set({ question }),
  close: () => set({ question: null }),
}));

const AmountBody: React.FC<{ question: AmountQuestion; onDone: () => void }> = ({ question, onDone }) => {
  const [amount, setAmount] = useState(question.min);
  const step = (delta: number) => setAmount((a) => Math.min(question.max, Math.max(question.min, a + delta)));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <IconButton label="Меньше" size={36} onClick={() => step(-1)} disabled={amount <= question.min}>
          <IconMinus width={16} height={16} />
        </IconButton>
        <div className="min-w-[5rem] text-center">
          <div className="ui-display ui-numeric text-4xl leading-none text-ink">{amount}</div>
          <div className="mt-1 text-xs text-ink-faint">{`${question.unit} · до ${question.max}`}</div>
        </div>
        <IconButton label="Больше" size={36} onClick={() => step(1)} disabled={amount >= question.max}>
          <IconPlus width={16} height={16} />
        </IconButton>
      </div>
      {question.preview && <p className="text-center text-sm text-ink-muted">{question.preview(amount)}</p>}
      <Button
        variant="primary"
        className="w-full"
        onClick={() => {
          onDone();
          question.onPick(amount);
        }}
        data-autofocus
      >
        {`Потратить ${amount}`}
      </Button>
    </div>
  );
};

/**
 * Asks how much of its pool an ability spends (Lay on Hands, Bastion of Law), or which of a few
 * ways it takes (Font of Magic: the slot level). Mounted once per screen that acts (the sheet, combat).
 */
export const AmountPrompt: React.FC = () => {
  const { question, close } = useAmountPrompt();
  return (
    <Dialog open={!!question} onClose={close} width="sm" eyebrow="Использование" title={question?.title ?? ''}>
      {question?.kind === 'amount' && <AmountBody key={question.title} question={question} onDone={close} />}
      {question?.kind === 'options' && (
        <div className="space-y-2">
          {question.options.map((option) => (
            <Button
              key={option.key}
              variant="secondary"
              disabled={!!option.blocked}
              title={option.blocked ?? undefined}
              className="!h-auto w-full !justify-between !py-2.5 text-left"
              onClick={() => {
                close();
                option.onPick();
              }}
            >
              <span>{option.label}</span>
              <span className="text-xs opacity-70">{option.blocked ?? option.detail}</span>
            </Button>
          ))}
        </div>
      )}
    </Dialog>
  );
};
