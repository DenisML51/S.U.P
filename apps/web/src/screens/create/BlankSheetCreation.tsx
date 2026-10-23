import React from 'react';
import { ImageSlot } from '../../ui/ImageSlot';
import { Button, Field, Input, Panel } from '../../ui/primitives';
import { OriginFields, PointBuy, TrainingChoice, WorldChoice } from './parts';
import type { Creation } from './useCreation';

/**
 * Prototype B, "Чистый лист": the whole hero on one screen, filled in any order, like a paper
 * sheet. For players who know what they want: no steps, nothing hidden.
 */
export const BlankSheetCreation: React.FC<{ creation: Creation }> = ({ creation }) => {
  const missing = [
    !creation.valid.identity && 'имя',
    !creation.valid.origin && 'раса и класс',
    !creation.valid.attributes && `очки (${creation.points})`,
  ].filter(Boolean);

  return (
    <div className="grid h-full grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6">
      <Panel ornate={false} className="ui-scroll flex min-h-0 flex-col gap-5 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-[1fr_7.5rem] gap-4">
          <div className="space-y-4">
            <Field label="Имя">
              {(props) => (
                <Input
                  {...props}
                  value={creation.name}
                  onChange={(e) => creation.setName(e.target.value)}
                  placeholder="Как зовут героя"
                />
              )}
            </Field>
            <OriginFields creation={creation} />
          </div>
          <div className="grid grid-rows-[1fr_auto] gap-2">
            <ImageSlot
              label="Арт"
              hint="Во весь рост"
              asset={creation.images.full}
              onUploaded={(full) => creation.setImages({ ...creation.images, full })}
            />
            <ImageSlot
              label="Портрет"
              hint="Лицо"
              asset={creation.images.portrait}
              onUploaded={(portrait) => creation.setImages({ ...creation.images, portrait })}
              className="h-[7.5rem]"
            />
          </div>
        </div>
        <div>
          <span className="ui-label">Мир</span>
          <WorldChoice creation={creation} className="!grid-cols-1" />
        </div>
      </Panel>

      <Panel ornate={false} className="px-5 py-4">
        <PointBuy creation={creation} />
      </Panel>

      <div className="flex min-h-0 flex-col gap-4">
        <Panel ornate={false} className="ui-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <span className="ui-label">Навыки и спасброски</span>
          <TrainingChoice creation={creation} columns={2} />
        </Panel>
        <div className="flex items-center gap-4">
          <span className="flex-1 text-sm text-ink-faint">
            {missing.length ? `Осталось: ${missing.join(', ')}` : 'Всё готово'}
          </span>
          <Button
            variant="primary"
            size="lg"
            disabled={missing.length > 0 || creation.creating}
            onClick={() => void creation.create()}
          >
            Создать героя
          </Button>
        </div>
      </div>
    </div>
  );
};
