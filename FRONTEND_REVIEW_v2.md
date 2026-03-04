# Frontend Review v2 — Post-Migration Report
**Date:** 2026-03-05
**Project:** Into the Dark (SUP v.3) — TRPG Character Sheet
**Scope:** `src/` (React 18 + TypeScript + Zustand 5)
**Context:** Отчёт составлен после завершения миграции игровой логики с фронтенда на `game-logic/` пакет + `backend/src/routes/character/`.

---

## Краткий итог

| Область | Статус | Мигрировано |
|---|---|---|
| API-слой | ✅ Полностью | 100% |
| Создание персонажа | ✅ Полностью | 100% |
| Хуки обновления персонажа | ✅ Полностью | 98% |
| Хуки инвентаря | ✅ Полностью | 100% |
| Хуки заклинаний / действий / черт | ✅ Полностью | 100% |
| CharacterSheetLogic | ⚠️ В основном | 85% |
| Zustand Store | ⚠️ В основном | 90% |
| Боевые компоненты | ⚠️ Частично | 70% |
| Броски кубиков | ❌ Не мигрированы | 0% |

**Итоговая готовность: ~90%**

---

## 1. API-слой (`src/api/characters.ts`)

**Статус: ✅ Полностью готов**

Реализовано 30+ функций, покрывающих все операции с персонажем:

### CRUD
| Функция | Метод | Endpoint |
|---|---|---|
| `listCharactersApi` | GET | `/characters` |
| `getCharacterApi` | GET | `/characters/:id` |
| `createCharacterApi` | POST | `/characters` |
| `updateCharacterApi` | PUT | `/characters/:id` |
| `deleteCharacterApi` | DELETE | `/characters/:id` |

### Создание (game-logic)
| Функция | Метод | Endpoint |
|---|---|---|
| `buildCharacterApi` | POST | `/characters/build` |

### Здоровье и состояние
| Функция | Метод | Endpoint |
|---|---|---|
| `updateHealthApi` | PATCH | `/characters/:id/health` |
| `updateSanityApi` | PATCH | `/characters/:id/sanity` |
| `updateLimbApi` | PATCH | `/characters/:id/limbs/:limbId` |
| `updateConditionApi` | PATCH | `/characters/:id/conditions` |

### Атрибуты и навыки
| Функция | Метод | Endpoint |
|---|---|---|
| `updateAttributeApi` | PATCH | `/characters/:id/attributes` |
| `updateSkillApi` | PATCH | `/characters/:id/skills` |
| `toggleSavingThrowApi` | PATCH | `/characters/:id/saving-throws` |
| `updateCurrencyApi` | PATCH | `/characters/:id/currency` |
| `updateExperienceApi` | PATCH | `/characters/:id/experience` |

### Инвентарь
| Функция | Метод | Endpoint |
|---|---|---|
| `saveInventoryItemApi` | POST | `/characters/:id/inventory` |
| `deleteInventoryItemApi` | DELETE | `/characters/:id/inventory/:itemId` |
| `patchInventoryItemApi` | PATCH | `/characters/:id/inventory/:itemId` |
| `equipItemApi` | POST | `/characters/:id/inventory/:itemId/equip` |
| `unequipItemApi` | POST | `/characters/:id/inventory/:itemId/unequip` |
| `updateItemQuantityApi` | PATCH | `/characters/:id/inventory/:itemId/quantity` |

### Атаки / Способности / Черты
| Функция | Метод | Endpoint |
|---|---|---|
| `saveAttackApi`, `patchAttackApi`, `deleteAttackApi` | POST/PATCH/DELETE | `/characters/:id/attacks` |
| `saveAbilityApi`, `patchAbilityApi`, `deleteAbilityApi` | POST/PATCH/DELETE | `/characters/:id/abilities` |
| `saveTraitApi`, `patchTraitApi`, `deleteTraitApi` | POST/PATCH/DELETE | `/characters/:id/traits` |

### Заклинания
| Функция | Метод | Endpoint |
|---|---|---|
| `saveSpellApi`, `patchSpellApi`, `deleteSpellApi` | POST/PATCH/DELETE | `/characters/:id/spells` |
| `toggleSpellPreparedApi` | PATCH | `/characters/:id/spells/:id/prepare` |

### Ресурсы
| Функция | Метод | Endpoint |
|---|---|---|
| `saveResourceApi`, `patchResourceApi`, `deleteResourceApi` | POST/PATCH/DELETE | `/characters/:id/resources` |
| `spendResourceApi` | PATCH | `/characters/:id/resources/:id/spend` |
| `resetAllResourcesApi` | POST | `/characters/:id/resources/reset` |

### Общие поля
| Функция | Метод | Endpoint |
|---|---|---|
| `updateCharacterFieldsApi` | PATCH | `/characters/:id/fields` |

Аллоулист полей: `name`, `race`, `subrace`, `class`, `subclass`, `alignment`, `avatar`, `speed`, `initiativeBonus`, `armorClass`, `tempHP`, `maxHPBonus`, `languagesAndProficiencies`, `appearance`, `backstory`, `alliesAndOrganizations`, `personalityTraits`, `ideals`, `bonds`, `flaws`, `inventoryNotes`, `attacksNotes`, `equipmentNotes`, `abilitiesNotes`, `spellsNotes`, `spellcastingDifficultyName`, `spellcastingDifficultyValue`, `knownSchools`, `maxPreparedSpells`, `resistances`, `spentActions`, `actionLimits`.

---

## 2. Zustand Store (`src/store/useCharacterStore.ts`)

**Статус: ⚠️ В основном мигрирован**

### Что работает правильно

- ✅ **`applyServerCharacter(char)`** — новый метод. Применяет ответ сервера без повторного сохранения (предотвращает петли). Сохраняет локальный `history`.
- ✅ **`updateResourceCount(id, delta)`** — вызывает `spendResourceApi`, затем `applyServerCharacter`.
- ✅ **`resetAllResources()`** — вызывает `resetAllResourcesApi`.
- ✅ **`loadCharacter`, `createCharacter`, `deleteCharacter`** — все через API.

### Что осталось

- ⚠️ **`updateCharacter(char)`** — метод полного PUT всё ещё существует и используется в нескольких местах (см. секцию 6). Эффективен как fallback, но порождает избыточные данные.
- ⚠️ **Генерация ID на клиенте** — в `createCharacter` (строка 286) и `importFromJSON` (строка 378) генерируются временные ID через `Math.random()`. Сервер их переопределяет. Риска нет, но технически ID должен генерировать только сервер.
- ⚠️ **История (10 записей, клиентская)** — `logHistory` обрезает до 10 записей в памяти (строка 255). Не персистируется в БД. Техдолг — для полной истории нужна серверная таблица.

---

## 3. Хуки персонажа (`src/hooks/character/`)

### `useCharacterUpdate.ts` — ✅ Полностью мигрирован

Все методы асинхронны, вызывают API, применяют `applyServerCharacter`:

| Метод | API-функция |
|---|---|
| `updateHealth` | `updateHealthApi` |
| `updateSanity` | `updateSanityApi` |
| `saveExperience` | `updateExperienceApi` |
| `updateAttributeValue` | `updateAttributeApi` |
| `toggleSkillProficiency` | `updateSkillApi` |
| `toggleSkillExpertise` | `updateSkillApi` |
| `toggleSavingThrowProficiency` | `toggleSavingThrowApi` |
| `updateLimb` | `updateLimbApi` |
| `updateCurrency` | `updateCurrencyApi` |
| `updateCondition` | `updateConditionApi` |

### `useCharacterInventory.ts` — ✅ Полностью мигрирован

| Метод | API-функция |
|---|---|
| `saveItem` | `saveInventoryItemApi` |
| `deleteItem` | `deleteInventoryItemApi` |
| `patchItem` | `patchInventoryItemApi` |
| `equipItem` | `equipItemApi` |
| `unequipItem` | `unequipItemApi` |
| `updateItemQuantity` | `updateItemQuantityApi` |

Расчёт AC при экипировке (`calculateACForState`) удалён с фронтенда — теперь `equipItemApi` возвращает обновлённый персонаж с пересчитанным AC от сервера.

### `useCharacterActions.ts` — ✅ Полностью мигрирован

CRUD для атак, способностей, черт, ресурсов — все через API.

### `useCharacterSpells.ts` — ✅ Полностью мигрирован

CRUD + toggle prepare + notes — все через API.

### `useCharacterModals.ts` — ✅ Только UI-стейт

Управление видимостью модалок. Нет бизнес-логики.

### `useCharacterStats.ts` — ⚠️ Смешанный

Этот хук — главный источник оставшихся вычислений на клиенте.

| Метод | Тип | Статус |
|---|---|---|
| `getModifierValue(attrId)` | Расчёт модификатора атрибута | ⚠️ Дисплей |
| `getModifier(attrId)` | Форматирование `+X/-X` | ✅ Дисплей |
| `getSkillModifier(skillId)` | Расчёт бонуса навыка | ⚠️ Дисплей |
| `getSavingThrowModifier(attrId)` | Расчёт спасброска | ⚠️ Дисплей |
| `getMaxSanity()` | Максимальное рассудство | ⚠️ Дисплей |
| `calculateAutoAC()` | Авторасчёт AC по броне/щиту | ⚠️ Дисплей |
| `xpProgress`, `canLevelUp` | Прогресс XP бар | ✅ Дисплей |
| `initiative` (строка) | Отображение инициативы | ✅ Дисплей |
| **`rollInitiative()`** | **Бросок d20 через Math.random()** | **❌ КРИТИЧНО** |

**Проблема `rollInitiative()`** (строка 82):
```typescript
const roll = Math.floor(Math.random() * 20) + 1; // ← нечестный бросок
```
Используется в `CharacterSheetLogic.handleRollInitiative()` и в `HotbarView.rollInitiativeInCombat()`. В боевом контексте это позволяет клиенту подделать результат.

---

## 4. Создание персонажа (`src/components/CharacterCreation/CharacterCreationLogic.ts`)

**Статус: ✅ Полностью мигрирован**

- Локальная функция `buildCharacter()` удалена.
- `handleSave()` вызывает `buildCharacterApi(payload)` → `POST /characters/build`.
- Сервер выполняет через `game-logic`: расчёт HP, AC, конечностей, рассудства, бонуса мастерства.
- Результат применяется через `applyServerCharacter(result.character)`.

**Что осталось на клиенте (приемлемо):**
- `canIncrement`/`canDecrement` — мгновенный UX-фидбек Point Buy (чисто отображение).
- `pointsUsed`/`pointsRemaining` — отображение.
- `getModifier(value)` — форматирование строки модификатора для предпросмотра.
- `getProficiencyBonus(level)` — отображение в форме создания.

---

## 5. CharacterSheetLogic (`src/components/CharacterSheet/CharacterSheetLogic.ts`)

**Статус: ⚠️ В основном мигрирован**

### Через API (`updateCharacterFieldsApi`) — ✅
- `updatePersonalityField(field, value)`
- `updateLanguagesAndProficiencies(value)`
- `updateInventoryNotes(notes)`
- `updateAttacksNotes(notes)`
- `updateEquipmentNotes(notes)`
- `updateAbilitiesNotes(notes)`
- `updateSpeed(newSpeed)`
- `updateInitiativeBonus(bonus)`

### Через `updateCharacter` (полный PUT) — ⚠️
- `updateArmorClass(newAC, newLimbs, newResistances)` — обновляет сразу три поля (`armorClass`, `limbs`, `resistances`). Нет отдельного эндпоинта для комбинированного обновления. Технически данные попадают на бэкенд через полный PUT.

---

## 6. Прямые вызовы `updateCharacter` по компонентам

Полный список оставшихся мест, где компоненты вызывают полный PUT минуя гранулярные эндпоинты:

| Файл | Строки | Данные | Оценка |
|---|---|---|---|
| `CharacterSheetLogic.ts` | 72 | `armorClass + limbs + resistances` | ⚠️ Нет единого эндпоинта |
| `HotbarView.tsx` | 287, 386 | `spentActions` (сброс раунда) | ✅ Боевой UI-стейт |
| `ActionTrackers.tsx` | 31, 41 | `spentActions + actionLimits` | ✅ Боевой UI-стейт |
| `CharacterSheetModals.tsx` | 397 | Свойства ресурса в ResourceViewModal | ❌ Нужен `patchResourceApi` |
| `CharacterSheetModals.tsx` | 426 | BasicInfoModal (имя/раса/класс) | ❌ Нужен `updateCharacterFieldsApi` |
| `CharacterSheetModals.tsx` | 464 | GrimmoireModal (`onUpdateCharacter`) | ❌ Нужен `updateCharacterFieldsApi` |
| `AbilitiesTab.tsx` | 17, 29 | Проп объявлен, но **не используется** | 🧹 Мёртвый код |

**Пояснение по `spentActions`/`actionLimits`:**
Это состояние боевого раунда (сколько действий потрачено). Сбрасывается каждый раунд. Поля добавлены в аллоулист бэкенда (`/fields`), но переключение через полный PUT приемлемо — данные всё равно достигают сервера.

---

## 7. Оставшиеся `Math.random()` вызовы

| Файл | Строка | Назначение | Статус |
|---|---|---|---|
| `useCharacterStats.ts` | 82 | Бросок d20 (инициатива) | ❌ КРИТИЧНО |
| `DiceRoller.tsx` | 332 | Расчёт результата броска кубика | ❌ Намеренно (UX-only по решению) |
| `DiceRoller.tsx` | 87–90 | Анимация вращения кубика | ✅ Визуальный эффект |
| `useCharacterStore.ts` | 246 | ID записи истории | ✅ OK (display-only) |
| `useCharacterStore.ts` | 286 | Временный ID персонажа | ✅ OK (сервер заменяет) |
| `useCharacterStore.ts` | 378 | ID при импорте | ✅ OK |
| `useLobbyStore.ts` | 118 | ID события боевой ленты | ✅ OK |
| `api/lobbySocket.ts` | 182 | ID WebSocket события | ✅ OK |
| `ArmorClassModal.tsx` | 77 | ID сопротивления | ✅ OK |
| `TraitModal.tsx` | 41 | ID черты | ✅ OK |

> **По решению:** `DiceRoller.tsx` оставлен на клиенте намеренно (решение принято до начала миграции). Если понадобится честный RNG для механик, нужен отдельный эндпоинт.

---

## 8. `src/types.ts` — Игровые константы

Файл продолжает экспортировать игровые константы и функции:

| Константа/Функция | Используется для | Статус |
|---|---|---|
| `POINT_BUY_COSTS` | UX-валидация Point Buy в форме создания | ✅ Дисплей, OK |
| `INITIAL_POINTS`, `ATTRIBUTE_MIN/MAX/START` | Point Buy UI | ✅ Дисплей, OK |
| `EXPERIENCE_BY_LEVEL` | XP-прогрессбар | ✅ Дисплей, OK |
| `getProficiencyBonus(level)` | Отображение бонуса мастерства | ✅ Дисплей, OK |
| `calculateMaxSanity(class, wisdom, level)` | Отображение максимального рассудства | ⚠️ Дисплей, дублирует бэкенд |
| `getSanityModifierFromWisdom(wisdom)` | Вызывается `calculateMaxSanity` | ⚠️ Дисплей |
| `calculateLimbMaxHP(maxHP, constitution)` | Нигде не вызывается на фронте | 🧹 Мёртвый код |
| `getDefaultLimbs(...)` | Нигде не вызывается на фронте | 🧹 Мёртвый код |
| `getLimbInjuryLevel(currentHP)` | Уровень повреждения для UI | ✅ Дисплей, OK |

**Риск:** Если правила расчёта рассудства изменятся на бэкенде, нужно вручную обновить и фронтенд. Рекомендуется добавить комментарий: `// Must match game-logic/src/character/stats.ts`.

---

## 9. Боевые компоненты (`src/components/Combat/`)

### `PlayersCombatSidebar.tsx` — ✅ Не мутирует персонажа напрямую
Отображает данные из лобби-стора. Нет прямых вызовов `updateCharacter`.

### `HotbarView.tsx` — ⚠️ Боевой UI-стейт через старый метод
- **Строки 287, 386:** Сброс `spentActions` при смене раунда через `updateCharacter`. Данные доходят до бэкенда через полный PUT.
- **HP-синхронизация:** Отправляется через `sendCombatEvent('combat.hpChanged', ...)` — не через `updateCharacter`. ✅

### `ActionTrackers.tsx` — ✅ Приемлемо
Трекер действий раунда (action/bonus/reaction). Стейт боя, сбрасывается каждый раунд, данные всё равно попадают в БД.

---

## 10. `DiceRoller.tsx`

**Статус: ⚠️ Намеренно остаётся на клиенте**

По результатам обсуждения, dice rolls остаются на фронтенде. Реализация:

```typescript
// DiceRoller.tsx строка ~332
const r = Math.floor(Math.random() * config.sides) + 1;
```

Компонент используется как **UI-инструмент** для игроков (dice hub, формульные броски), а не как валидированная механика. Если в будущем понадобится честный RNG (анти-чит), нужен эндпоинт `POST /dice/roll`.

---

## 11. Что НЕ нужно трогать (оставить на фронте)

| Компонент/Файл | Причина |
|---|---|
| `src/utils/damageUtils.tsx` | Чистое UI (цвета, иконки) |
| `src/constants/conditions.ts` | Статические данные отображения |
| `src/i18n/translations.ts` | Локализация |
| `src/api/lobbySocket.ts` | WebSocket-клиент |
| `useCharacterModals.ts` | UI-стейт модалок |
| `canIncrement`/`canDecrement` | Мгновенный UX-фидбек Point Buy |
| `getModifier(value)` | Форматирование строки |
| Анимации и цвета | Визуальный слой |

---

## 12. Приоритизированный список оставшихся задач

### 🔴 Критично (влияет на честность/безопасность)

1. **`rollInitiative()` в `useCharacterStats.ts`** — перенести на сервер (`POST /characters/:id/roll-initiative`), вернуть `{roll, mod, bonus, total}`. Исключает читерство в боевом контексте.

### 🟠 Высокий приоритет (данные не синхронизированы оптимально)

2. **`BasicInfoModal` save** — заменить `updateCharacter(updatedCharacter)` на `updateCharacterFieldsApi(id, { name, race, class, ... })`.

3. **`GrimmoireModal`** — заменить `onUpdateCharacter({ ...character, knownSchools/maxPreparedSpells })` на `updateCharacterFieldsApi`.

4. **`ResourceViewModal.onUpdate`** — заменить `updateCharacter` с полным PUT на `patchResourceApi(id, resourceId, changes)`.

### 🟡 Средний приоритет (технический долг)

5. **`updateArmorClass`** — добавить составной эндпоинт `PATCH /characters/:id/armor-class` принимающий `{armorClass, limbs, resistances}`.

6. **`calculateMaxSanity` и другие дубли в `types.ts`** — добавить комментарий-предупреждение о синхронизации с `game-logic/`.

7. **История персонажа** — перенести из клиентского массива в серверную таблицу.

8. **Мёртвый код в `types.ts`** — удалить неиспользуемые `calculateLimbMaxHP`, `getDefaultLimbs`.

9. **Мёртвый проп `updateCharacter` в `AbilitiesTab.tsx`** — удалить.

### 🟢 Низкий приоритет (приемлемо, на будущее)

10. **ID генерация на клиенте** — сервер должен генерировать все ID, клиент не должен предугадывать.

11. **`DiceRoller`** — если понадобится честный RNG, добавить `POST /dice/roll`.

---

## Архитектурная схема (после миграции)

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                    │
│                                                         │
│  UI Components                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │CharacterSheet│  │  HotbarView  │  │  CharCreation│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│  Hooks (display + API calls)                │           │
│  ┌────────────────────────────────────────┐ │           │
│  │ useCharacterUpdate  → updateHealthApi  │ │           │
│  │ useCharacterInventory → equipItemApi   │ │           │
│  │ useCharacterActions  → saveAttackApi   │ │           │
│  │ useCharacterSpells   → saveSpellApi    │ │           │
│  │ useCharacterStats    → (display only)  │ │           │
│  └────────────────┬───────────────────────┘ │           │
│                   │                         │           │
│  Zustand Store    │                         │           │
│  ┌────────────────────────────────────────┐ │           │
│  │ applyServerCharacter() ← server resp.  │ │           │
│  │ updateCharacter()  →  full PUT (legacy)│ │           │
│  │ updateResourceCount() → spendResourceApi│           │
│  └────────────────────────────────────────┘           │
│                   │                                     │
│  src/api/characters.ts (30+ API wrappers)              │
└───────────────────┼─────────────────────────────────────┘
                    │ HTTP REST
┌───────────────────▼─────────────────────────────────────┐
│                     Backend                             │
│                                                         │
│  backend/src/routes/character/                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ health.ts  attributes.ts  inventory.ts  spells.ts│   │
│  │ experience.ts  resources.ts  fields.ts  build.ts │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │ imports                        │
│  game-logic/src/character/                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ stats.ts  health.ts  inventory.ts  experience.ts │   │
│  │ resources.ts  creation.ts  normalize.ts          │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│  Prisma + PostgreSQL (encrypted blob)                   │
└─────────────────────────────────────────────────────────┘
```

---

*Отчёт сгенерирован после анализа всех файлов `src/`. Следующая версия: после исправления пунктов из секции 12.*
