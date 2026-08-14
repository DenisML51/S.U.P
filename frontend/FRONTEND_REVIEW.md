# Фронтенд-ревью: Into the Dark (SUP v.3)
> Подготовлено в контексте миграции бизнес-логики с фронтенда на бэкенд
> Дата: 2026-03-03

---

## 1. Общая архитектура

### Технологический стек
| Технология | Версия | Роль |
|---|---|---|
| React | 18.2 | UI-фреймворк |
| TypeScript | 5.2 | Статическая типизация |
| Vite | 5.0 | Бандлер |
| Zustand | 5.0 | Глобальный стейт |
| Tailwind CSS | 3.3 | Стилизация |
| Framer Motion | 10.16 | Анимации |
| Lucide React | 0.294 | Иконки |
| react-hot-toast | 2.6 | Уведомления |
| html2canvas + jspdf | — | PDF-экспорт |
| Electron | 28 | Desktop-обёртка (legacy) |

### Режимы запуска
Приложение изначально было `.exe` через Electron. Сейчас переводится на веб: Vite-сервер + отдельный Node.js-бэкенд (папка `backend/`). Docker-конфигурация уже есть (`docker-compose.yml`).

### Структура папок (фронт)
```
src/
├── api/              # HTTP-клиент и API-функции
├── components/       # React-компоненты
│   ├── CharacterCreation/  # Мастер создания персонажа
│   ├── CharacterSheet/     # Лист персонажа (табы + хотбар)
│   ├── Combat/             # Боевые компоненты
│   └── Lobby/              # Лобби-компоненты
├── constants/        # Статичные данные (условия)
├── hooks/character/  # Хуки бизнес-логики персонажа
├── i18n/             # Локализация (RU/EN)
├── store/            # Zustand-сторы
├── types/            # TypeScript-типы
└── utils/            # Вспомогательные утилиты
```

---

## 2. Система типов — `src/types.ts`

### Что реализовано
Центральный файл с **всеми TypeScript-интерфейсами** и **несколькими функциями бизнес-логики**, которые прямо сейчас выполняются на фронте.

### Интерфейсы
| Интерфейс | Назначение |
|---|---|
| `Character` | Полный объект персонажа (~50 полей) |
| `Skill` | Навык с бонусами компетентности/экспертизы |
| `Resource` | Ресурс персонажа (HP-слот, заряды способностей) |
| `InventoryItem` | Предмет: оружие, броня, патроны, вещь |
| `Attack` | Атака с уроном, бонусами, типом действия |
| `Ability` | Способность с эффектом |
| `Spell` | Заклинание |
| `Limb` | Конечность с HP и КД |
| `Trait` | Черта характера |
| `Resistance` | Сопротивление типу урона |
| `CharacterPreview` | Краткое превью для списка персонажей |
| `HistoryEntry` | Запись в журнале событий |

### Функции в файле — ВСЁ ПЕРЕНОСИТЬ НА БЭКЕНД

```typescript
// ДОЛЖНО БЫТЬ НА БЭКЕНДЕ:

getLimbInjuryLevel(currentHP): InjuryLevel
// Вычисляет уровень ранения конечности по HP.
// none / light (≤0) / severe (≤-5) / destroyed (≤-10)

calculateLimbMaxHP(maxHP, constitution): number
// Формула: ceil(maxHP/2) + constitutionModifier
// Используется при создании и обновлении персонажа

getDefaultLimbs(maxHP, constitution, baseAC): Limb[]
// Создаёт 6 конечностей (голова, торс, 4 конечности)
// с одинаковым maxHP и исходным КД

calculateMaxSanity(classId, wisdom, level): number
// Формула: 50 + wisdomMod*5 + floor(level/2), clamped 0–100
// mentalStrength хардкоднут = 50

getSanityModifierFromWisdom(wisdom): number
// Вспомогательная функция для calculateMaxSanity

getProficiencyBonus(level): number
// Стандартная таблица D&D 5e: 2/3/4/5/6

EXPERIENCE_BY_LEVEL: { [level]: xp }
// Таблица XP по уровням (1–20)

POINT_BUY_COSTS: { [value]: cost }
// Таблица стоимости атрибутов в Point Buy

ATTRIBUTES_LIST, SKILLS_LIST
// Статичные данные — ОСТАВИТЬ НА ФРОНТЕ (только метаданные)

DAMAGE_TYPES
// Статичный список — ОСТАВИТЬ НА ФРОНТЕ
```

**Вывод:** `getLimbInjuryLevel`, `calculateLimbMaxHP`, `getDefaultLimbs`, `calculateMaxSanity`, `getProficiencyBonus` — **полностью переносить на бэкенд**. На фронте оставить только справочные константы.

---

## 3. Типы лобби — `src/types/lobby.ts`

### Что реализовано
TypeScript-типы для лобби. **Переносить нечего** — чисто декларативный файл.

| Тип | Назначение |
|---|---|
| `LobbyMember` | Участник лобби с ролью, статусом, HP |
| `LobbyMessage` | Сообщение мастера |
| `CombatMemberState` | Боевое состояние участника (инициатива, HP, траты действий) |
| `CombatState` | Полное состояние боя (раунд, порядок ходов, activeMemberId) |
| `LobbyStatePayload` | Полный снимок состояния лобби от сервера |
| `CombatEventType` | Enum событий боя (start/end/nextTurn/hpChanged/etc.) |
| `CombatFeedEntry` | Запись в боевой ленте |

**Вывод:** Оставить как есть. Типы уже отражают серверную модель данных.

---

## 4. API-слой

### `src/api/client.ts` — HTTP-клиент
**ОСТАВИТЬ** (чисто транспортный слой).

- Базовый URL из `VITE_API_BASE_URL` (default: `localhost:4000`)
- Хранение Access Token в `localStorage` (`itd_access_token`)
- Автоматический рефреш токена при `401` через `/auth/refresh`
- Cookies (httpOnly refresh token) для безопасности
- Поддержка 204 (empty response)

**Проблемы/Замечания:**
- Access Token хранится в `localStorage` — уязвимость к XSS. В продакшне лучше хранить в `httpOnly` cookie.
- `tryRefresh()` — рефреш делается при каждом 401, без очереди. При параллельных запросах возможны гонки.

### `src/api/auth.ts` — Аутентификация
**ОСТАВИТЬ** (тонкий wrapper).

| Функция | Endpoint | Метод |
|---|---|---|
| `requestRegistrationCode` | `/auth/register/request-code` | POST |
| `verifyRegistrationCode` | `/auth/register/verify-code` | POST |
| `loginApi` | `/auth/login` | POST |
| `fetchMe` | `/auth/me` | GET |
| `logoutApi` | `/auth/logout` | POST |

### `src/api/characters.ts` — Персонажи
**ОСТАВИТЬ** (тонкий wrapper).

| Функция | Endpoint | Метод | Примечание |
|---|---|---|---|
| `listCharactersApi` | `/characters` | GET | Возвращает краткий список |
| `getCharacterApi` | `/characters/:id` | GET | Полные данные |
| `createCharacterApi` | `/characters` | POST | Весь JSON в поле `data` |
| `updateCharacterApi` | `/characters/:id` | PUT | Весь JSON в поле `data` |
| `deleteCharacterApi` | `/characters/:id` | DELETE | |

**Проблема:** Фронт отправляет весь `Character` объект при каждом изменении — нет дифференциальных обновлений. При большом персонаже это неэффективно. После миграции логики на бэкенд — рассмотреть PATCH-эндпоинты для конкретных операций (heal, equip, level-up).

### `src/api/lobbies.ts` — Лобби (REST)
**ОСТАВИТЬ**.

| Функция | Endpoint | Метод |
|---|---|---|
| `createLobbyApi` | `/lobbies` | POST |
| `joinLobbyApi` | `/lobbies/join` | POST |
| `leaveLobbyApi` | `/lobbies/leave` | POST |
| `getLobbyApi` | `/lobbies/:key` | GET |
| `sendMasterMessageApi` | `/lobbies/:key/messages` | POST |
| `sendMasterNotificationApi` | `/lobbies/:key/notify` | POST |

### `src/api/lobbySocket.ts` — WebSocket-клиент
**ОСТАВИТЬ** (транспортный слой, но есть замечания).

Класс `LobbySocketClient`:
- Подключается к `/ws/lobby?key=...&token=...` (JWT в query — риск логирования)
- Heartbeat каждые 15 секунд (`presence.ping`)
- Экспоненциальный retry: до 8 попыток, задержка 1–20 сек
- Проверяет `exp` в JWT перед реконнектом
- Отправляемые события: `lobby.join`, `master.message.send`, `combat.event`, `presence.ping`
- Получаемые события: `lobby.state`, `master.message`, `combat.state`, `lobby.member_joined`, `lobby.member_left`, `ack`, `error`

**Проблема:** JWT в URL — попадает в access logs. Рассмотреть передачу через первое сообщение WebSocket после подключения.

### `src/api/notifications.ts` — Системные уведомления
**ОСТАВИТЬ**.

- `listNotificationsApi` → GET `/notifications`
- `markNotificationsReadApi` → POST `/notifications/read`

---

## 5. Zustand Stores

### `src/store/useAuthStore.ts` — Авторизация
**ОСТАВИТЬ** (UI-стейт).

| Состояние | Тип |
|---|---|
| `user` | `AuthUser | null` |
| `isLoading` | `boolean` |
| `pendingRegistrationEmail` | `string` |
| `emailForCode` | `string` |

Методы: `init`, `registerRequestCode`, `registerVerifyCode`, `login`, `logout`

### `src/store/useCharacterStore.ts` — Персонаж (КЛЮЧЕВОЙ)

**Содержит логику, часть которой нужно переносить на бэкенд.**

#### Состояние
| Поле | Тип |
|---|---|
| `character` | `Character | null` |
| `charactersList` | `CharacterPreview[]` |
| `activeTab` | `TabType` |
| `viewMode` | `'tabs' | 'hotbar'` |
| `isLoaded` | `boolean` |
| `settings` | `{storagePath, autoSave, compactCards, notifications}` |

#### Методы и что с ними делать

| Метод | Переносить? | Комментарий |
|---|---|---|
| `setCharacter`, `setCharactersList`, `setActiveTab`, `setViewMode` | ❌ Нет | Чистый UI-стейт |
| `updateCharacter(updater, silent)` | ⚠️ Частично | Вызывает `saveToStorage` → `updateCharacterApi`. Логику валидации перенести на бэкенд |
| `updateResourceCount(resourceId, delta)` | ✅ Да | Вычисляет новый `current` ресурса, проверяет min/max. **Должно быть бэкенд-действием** |
| `logHistory(message, type)` | ⚠️ Частично | История хранится только в памяти (последние 10). Перенести хранение на бэкенд |
| `loadCharacter(id)` | ❌ Нет | Просто GET-запрос |
| `createCharacter(character)` | ✅ Да | Генерирует временный ID на фронте. Бэкенд должен генерировать ID |
| `deleteCharacter(id)` | ❌ Нет | Просто DELETE-запрос |
| `exportToJSON` | ❌ Нет | Клиентский экспорт, оставить |
| `importFromJSON(file)` | ⚠️ Частично | Парсинг и валидация должны быть на бэкенде |
| `resetAllResources` | ✅ Да | «Длинный отдых» — бизнес-операция, нужен бэкенд-эндпоинт `/characters/:id/rest/long` |
| `normalizeCharacter(parsed)` | ✅ Да | Нормализация данных (fallback'и, дефолтные значения). Должна быть на бэкенде |
| `migrateOldData` | ✅ Да | Пустая заглушка (миграция с localStorage уже завершена) |

#### Критические проблемы в `normalizeCharacter`:
- Весь объект `Character` нормализуется на фронте — бэкенд получает данные "как есть"
- Дефолтные значения `knownSchools`, `maxPreparedSpells` и т.д. хардкодятся на фронте
- **После миграции:** `normalizeCharacter` должна жить в бэкенде

### `src/store/useLobbyStore.ts` — Лобби (КЛЮЧЕВОЙ)

**Правильно спроектирован для веба. Минимум бизнес-логики на фронте.**

| Метод | Переносить? | Комментарий |
|---|---|---|
| `createLobby`, `joinLobbyByKey`, `loadLobby`, `leaveLobby` | ❌ Нет | Просто API-вызовы |
| `changeLobbyCharacter` | ❌ Нет | Повторный join с другим characterId |
| `sendMasterMessage` | ❌ Нет | Через WebSocket или HTTP |
| `sendMasterNotification` | ❌ Нет | HTTP POST |
| `connectSocket`, `disconnectSocket` | ❌ Нет | Транспорт |
| `sendCombatEvent(eventType, payload)` | ❌ Нет | Отправка события на сервер — правильно |
| `applyLobbyState(payload)` | ❌ Нет | Применяет снимок от сервера |
| `applyCombatState(payload)` | ❌ Нет | Обновляет членов из боевого стейта |
| `restoreLobbySession` | ❌ Нет | Восстанавливает сессию из localStorage |
| `addCombatFeedEntry` | ❌ Нет | Локальная лента чата |

**Замечание:** `saveLobbySession` / `readLobbySession` — хранение ключа лобби в localStorage для автовосстановления сессии. Это нормально для UX.

### `src/store/useSystemNotificationsStore.ts` — Системные уведомления
**ОСТАВИТЬ** (тонкий стор).

Методы: `fetchNotifications`, `markRead`, `markAllRead`

---

## 6. Хуки персонажа — `src/hooks/character/`

### `useCharacterStats.ts` — КРИТИЧНО, ПЕРЕНОСИТЬ НА БЭКЕНД

Все расчёты, описанные ниже, **выполняются на фронте**. При миграции на бэкенд фронт должен просто получать готовые числа от сервера.

```typescript
getModifierValue(attrId): number
// Формула: floor((атрибут - 10) / 2) + бонус атрибута
// → ПЕРЕНЕСТИ НА БЭКЕНД

getModifier(attrId): string
// Строка с модификатором (+/-N)
// → Вычислять на фронте из полученного числа

getSkillModifier(skillId): string
// baseModifier + proficiencyBonus (если proficient) + proficiencyBonus (если expertise)
// → ПЕРЕНЕСТИ НА БЭКЕНД

getSavingThrowModifier(attrId): string
// baseModifier + proficiencyBonus (если proficient)
// → ПЕРЕНЕСТИ НА БЭКЕНД

getMaxSanity(): number
// Делегирует calculateMaxSanity из types.ts
// → ПЕРЕНЕСТИ НА БЭКЕНД

calculateAutoAC(): number
// Берёт экипированную броню, считает КД = baseAC + dexMod (с ограничением) + щит (+2)
// → ПЕРЕНЕСТИ НА БЭКЕНД

rollInitiative(): {roll, mod, bonus, total}
// Math.random() * 20 + 1 + dexMod + initiativeBonus
// → ПЕРЕНЕСТИ НА БЭКЕНД (для честности в мультиплеере)

xpProgress: number  // % прогресса до след. уровня
canLevelUp: boolean // experience >= nextLevelXP
getTotalMaxHP(): number // maxHP + maxHPBonus
isDying: boolean // currentHP <= 0
isInsane: boolean // sanity <= 0
```

### `useCharacterUpdate.ts` — ЧАСТИЧНО ПЕРЕНОСИТЬ

```typescript
updateHealth(current, max, temp, bonus)
// Нормализует значения, считает diff от текущего HP
// Логирует историю (heal/damage)
// → Вычисление diff и логирование — НА БЭКЕНД
// → Вызов API — ОСТАВИТЬ

updateSanity(newSanity, maxSanity)
// Clamping [0, maxSanity]
// → Clamping — НА БЭКЕНД

saveExperience(newExperience, newLevel)
// Пересчитывает proficiencyBonus при level-up через getProficiencyBonus()
// → ПЕРЕНЕСТИ НА БЭКЕНД

updateAttributeValue(attrId, newValue, newBonus)
// Обновляет attributes и attributeBonuses
// → Остаётся вызовом API через updateCharacter

toggleSkillProficiency(skillId)
// Переключает skill.proficient, сбрасывает expertise
// → Остаётся вызовом API

toggleSkillExpertise(skillId)
// Переключает skill.expertise
// → Остаётся вызовом API

toggleSavingThrowProficiency(attrId)
// Toggle в savingThrowProficiencies[]
// → Остаётся вызовом API

updateLimb(updatedLimb)
// Обновляет конкретную конечность в массиве
// → Остаётся вызовом API; рассмотреть PATCH /characters/:id/limbs/:limbId

updateCurrency(currency)
// → Остаётся вызовом API; рассмотреть PATCH /characters/:id/currency

updateCondition(conditionId, active)
// Добавляет/убирает condition из массива
// → Остаётся вызовом API
```

### `useCharacterInventory.ts` — ПЕРЕНОСИТЬ НА БЭКЕНД

```typescript
calculateACForState(inventory, attributes): number
// ДУБЛИРОВАНИЕ calculateAutoAC из useCharacterStats!
// Пересчитывает КД при экипировке/снятии брони
// → ПЕРЕНЕСТИ НА БЭКЕНД

equipItem(itemId)
// Сложная логика:
// - Если броня: снимает другую броню, обновляет limbACs у конечностей, пересчитывает armorClass
// - Если оружие: создаёт Attack объект с id=attack_weapon_{itemId}
// - Обновляет inventory.equipped
// → ВСЯ ЛОГИКА ДОЛЖНА БЫТЬ НА БЭКЕНДЕ
// Бэкенд-эндпоинт: POST /characters/:id/inventory/:itemId/equip

unequipItem(itemId)
// - Если броня: сбрасывает limbACs, пересчитывает armorClass
// - Если оружие: удаляет соответствующий Attack с weaponId
// → ВСЯ ЛОГИКА ДОЛЖНА БЫТЬ НА БЭКЕНДЕ
// Бэкенд-эндпоинт: POST /characters/:id/inventory/:itemId/unequip

saveItem(item), deleteItem(itemId)
// CRUD предметов — оставить как вызовы API

updateItemQuantity(itemId, delta)
// Изменяет quantity с min=0
// → Простая операция, можно оставить, но лучше PATCH
```

### `useCharacterActions.ts` — ОСТАВИТЬ

CRUD для атак, способностей, черт, ресурсов. Чистые операции без бизнес-логики, делают `updateCharacter`.

```typescript
saveAttack, deleteAttack    // CRUD атак
saveAbility, deleteAbility  // CRUD способностей
saveTrait, deleteTrait      // CRUD черт
saveResource, deleteResource // CRUD ресурсов
```

После миграции — каждую операцию желательно превратить в отдельный эндпоинт вместо обновления всего персонажа.

### `useCharacterSpells.ts` — ОСТАВИТЬ

```typescript
saveSpell, deleteSpell           // CRUD заклинаний
toggleSpellPrepared(spellId)     // Переключает prepared
updateSpellsNotes, updateSpellcastingDifficulty
```

### `useCharacterModals.ts` — ОСТАВИТЬ

Управляет состоянием 20+ модальных окон. Чисто UI. Слушает кастомные события `open-character-modal` через `window`.

---

## 7. Компоненты — CharacterCreation

### `src/components/CharacterCreation/CharacterCreationLogic.ts` — ПЕРЕНОСИТЬ НА БЭКЕНД

**Ключевая функция `buildCharacter()`** — полностью строит объект персонажа из данных формы:

```typescript
buildCharacter(): Character {
  // Вычисляет:
  const maxSanity = calculateMaxSanity(...)    // → БЭКЕНД
  const constitutionMod = floor((con - 10) / 2) // → БЭКЕНД
  const initialMaxHP = 10 + constitutionMod     // → БЭКЕНД
  const dexMod = floor((dex - 10) / 2)          // → БЭКЕНД
  const baseAC = 10 + dexMod                    // → БЭКЕНД
  const limbs = getDefaultLimbs(...)            // → БЭКЕНД
  // Формирует весь объект Character с defaults
}
```

**Point Buy система:**
- `POINT_BUY_COSTS` (8→0, 9→1, ..., 15→9) — справочник ОСТАВИТЬ на фронте
- `INITIAL_POINTS = 27` — ОСТАВИТЬ как константу
- Логика `canIncrement`, `canDecrement` — ОСТАВИТЬ на фронте (UX валидация)
- **Финальная валидация** при сохранении — добавить на БЭКЕНД

**Пресеты рас и классов** (`RACE_PRESETS`, `CLASS_PRESETS`) — статичные данные, ОСТАВИТЬ на фронте. В перспективе можно вынести в БД.

**Шаги:** `identity → origin → coreStats → proficiencies → finalize`

### `src/components/CharacterCreation/index.tsx`
**ОСТАВИТЬ** (UI-оркестратор шагов).

### Шаги создания персонажа (все `steps/`)

| Файл | Что делает | Переносить? |
|---|---|---|
| `IdentityStep.tsx` | Имя, аватар, концепция | ❌ Нет — UI |
| `OriginStep.tsx` | Раса, подраса, класс, подкласс | ❌ Нет — UI |
| `AttributesStep.tsx` | Point Buy для атрибутов | ❌ Нет — UI валидация |
| `CoreStatsStep.tsx` | Скорость, доп. информация | ❌ Нет — UI |
| `ProficienciesStep.tsx` | Навыки, спасброски, языки | ❌ Нет — UI |
| `SkillsStep.tsx` | Выбор навыков | ❌ Нет — UI |
| `FinalizeStep.tsx` | Итоговый экран с кнопкой сохранения | ❌ Нет — UI |
| `CharacterCompleteStep.tsx` | Экран успешного создания | ❌ Нет — UI |

### `src/components/CharacterCreation/components/CharacterDossier.tsx`
**ОСТАВИТЬ** — боковая панель с превью персонажа в процессе создания.

---

## 8. Компоненты — CharacterSheet (лист персонажа)

### `src/components/CharacterSheet/index.tsx` — Главный компонент
**ОСТАВИТЬ** (UI-оркестратор).

Два режима:
- `viewMode === 'tabs'` — стандартный вид с вкладками
- `viewMode === 'hotbar'` — боевой режим (HotbarView)

Вспомогательные функции (ОСТАВИТЬ — чисто UI):
- `getItemIcon(item)` — выбирает иконку по типу предмета
- `getItemTypeLabel(type)` — локализованный лейбл типа
- `getActionTypeLabel(actionType)` — action/bonus/reaction
- `getActionTypeColor(actionType)` — цветовой стиль

### `src/components/CharacterSheet/CharacterSheetLogic.ts`
**ОСТАВИТЬ** (агрегирует хуки, не содержит логики).

Агрегирует все хуки: `useCharacterStats`, `useCharacterModals`, `useCharacterInventory`, `useCharacterActions`, `useCharacterUpdate`, `useCharacterSpells`.

Дополнительно определяет:
- `handleRollInitiative()` — вызывает `stats.rollInitiative()`, показывает тост, логирует
- `getLimbType(limbId)` — определяет тип конечности для отображения иконки травмы
- Обёртки `openXxxModal`/`closeXxxModal` — UI-стейт

### Вкладки CharacterSheet (все в `components/Tabs/`)

#### `StatsHeader.tsx` — Шапка персонажа
**ОСТАВИТЬ** — отображает HP, Sanity, AC, XP, кнопки редактирования. Получает вычисленные значения как props.

#### `SecondaryStatsStrip.tsx` — Вторичные статы
**ОСТАВИТЬ** — инициатива, скорость, владение оружием, бонус мастерства. Отображение.

#### `AttributesSection.tsx` — Атрибуты и навыки
**ОСТАВИТЬ** — отображение атрибутов, модификаторов, навыков, спасбросков.

#### `ConditionsSection.tsx` — Состояния
**ОСТАВИТЬ** — переключение состояний (blinded, charmed, etc.) из `CONDITIONS`.

#### `PersonalityTab.tsx` — Личность
**ОСТАВИТЬ** — поля backstory, traits, alignment, bonds и т.д. Markdown-редактор.

#### `HealthTab.tsx` — Здоровье
**ОСТАВИТЬ** — отображение конечностей, связанной брони. Клик → `openLimbModal`.

#### `AbilitiesTab.tsx` — Способности
**ОСТАВИТЬ** — список способностей с ресурсами. Клик → трата ресурса или просмотр.

#### `SpellsTab.tsx` — Заклинания
**ОСТАВИТЬ** — список заклинаний по уровням, подготовка, трата слотов.

#### `AttacksTab.tsx` — Атаки
**ОСТАВИТЬ** — список атак.

#### `EquipmentTab.tsx` — Снаряжение
**ОСТАВИТЬ** — экипированные предметы. Кнопка снятия.

#### `InventoryTab.tsx` — Инвентарь
**ОСТАВИТЬ** — инвентарь с фильтрами, экипировка, изменение количества.

### HotbarView — `src/components/CharacterSheet/components/HotbarView.tsx`

**КРИТИЧЕСКИ ВАЖНЫЙ ФАЙЛ — содержит боевую логику фронтенда.**

#### Что делает:
1. **Боевой режим:** показывает `PlayersCombatSidebar`, `CombatLobbyChat`, `CombatInitiativeStrip`
2. **HotbarPanels:** панели атак, способностей, заклинаний, предметов
3. **StatusBars:** HP + Sanity вертикальные шкалы
4. **ActionTrackers:** счётчики действий/бонусных/реакций
5. **ResourceGroup:** быстрые ресурсы
6. **CombatStats:** КД, инициатива, бонус мастерства, скорость, СЛ заклинаний

#### Боевая логика (ПЕРЕНОСИТЬ НА БЭКЕНД или переработать):

```typescript
// 1. Синхронизация действий через WebSocket при изменении spentActions
useEffect(() => {
  sendCombatEvent('combat.actionUsed', {
    memberId,
    action: `A:${spent.action}/... B:... R:...`,
    actionState: { actionLimits, spentActions, initiative }
  });
}, [character.spentActions, character.actionLimits, initiativeLocal]);
```
→ **Проблема:** Фронт сам решает, что отправить. Бэкенд только принимает строку. Рассмотреть: бэкенд должен хранить `spentActions` для каждого участника и обновлять их по событию.

```typescript
// 2. Синхронизация HP через WebSocket
useEffect(() => {
  sendCombatEvent('combat.hpChanged', {
    memberId, currentHP: character.currentHP, maxHP: getTotalMaxHP()
  });
}, [character.currentHP, character.maxHP, character.maxHPBonus]);
```
→ **Проблема:** Игрок отправляет свои же HP на сервер. Сервер доверяет клиенту. При переносе логики на бэкенд HP должны обновляться через команды (`takeDamage`, `heal`), а сервер рассылает обновлённое состояние.

```typescript
// 3. Автосброс действий при новом раунде
useEffect(() => {
  if (combatState.round > lastKnownRound) {
    updateCharacter({ ...character, spentActions: { action: 0, bonus: 0, reaction: 0 } });
  }
}, [combatState.round]);
```
→ **ПЕРЕНЕСТИ НА БЭКЕНД.** Сброс действий при новом раунде — бизнес-правило, должно быть на сервере.

```typescript
// 4. Автостарт боя (когда все готовы)
const canStartSharedCombat = Boolean(
  lobby && !sharedLobbyCombatActive && meRole === 'MASTER' &&
  isCombatReady && allOnlineReady && onlineMemberIds.length >= 2
);
useEffect(() => {
  if (canStartSharedCombat) startSharedCombat();
}, [canStartSharedCombat]);
```
→ **Частично переносить.** Автостарт на фронте при соблюдении условий — нормально для UX. Но проверка условий должна быть и на бэкенде.

```typescript
// 5. Загрузка персонажа мастера при его ходе
useEffect(() => {
  if (meRole === 'MASTER' && activeCombatMember?.kind === 'master_custom' && ...) {
    getCharacterApi(activeCombatMember.characterId).then(...)
  }
}, [activeCombatMember]);
```
→ **ОСТАВИТЬ** — мастер видит хотбар управляемого им персонажа.

#### `enterCombat()` / `rollInitiativeInCombat()` / `nextTurn()` / `endCombat()`:
- **`enterCombat()`** — локальный стейт + WS-событие `ReadyForCombat`. ОК.
- **`rollInitiativeInCombat()`** — `Math.random()` на фронте → **ПЕРЕНЕСТИ НА БЭКЕНД** (минимум для честности)
- **`nextTurn()`** — отправляет `combat.nextTurn` серверу. ОК.
- **`endCombat()`** — отправляет `combat.end` серверу. ОК.

#### `onItemClick(action)`:
При клике на предмет/атаку/способность в хотбаре открывает Dice Hub с формулой урона. Чисто UI.

---

## 9. Компоненты — Combat

### `src/components/Combat/CombatInitiativeStrip.tsx`
**ОСТАВИТЬ** — отображает порядок инициативы из `combatState.turnOrder`. Визуализирует активного участника в центре. Центрирование — чистый UI-алгоритм.

### `src/components/Combat/CombatLobbyChat.tsx`
**ОСТАВИТЬ** — боевой чат. Показывает `messages` из стора. Отправляет через `sendMasterMessage` (WebSocket). Кнопка «Уведомить» (только мастер) → `sendMasterNotification`.

**Замечание:** `canSend = true` — любой пользователь видит поле ввода, но может ли отправлять — решает имя `sendMasterMessage`. Логика ролей в названии функции запутана. После миграции — разделить на `sendChatMessage` (все) и `sendMasterMessage` (только мастер).

### `src/components/Combat/PlayersCombatSidebar.tsx`
**СОДЕРЖИТ БИЗНЕС-ЛОГИКУ — частично переносить.**

#### Что делает:
- Отображает список боевых участников с HP-барами
- Мастер может добавлять «custom» бойцов вручную или из персонажей

#### Логика на фронте:
```typescript
applyHpDelta(member, 'damage' | 'heal')
// Считает new HP = Math.max(0, current - amount) или Math.min(max, current + amount)
// Отправляет combat.hpChanged
```
→ **ЧАСТИЧНО.** Расчёт нового HP делать на бэкенде. Фронт должен отправлять `{action: 'damage', amount: N}` или `{action: 'heal', amount: N}`, а сервер считает новое значение и рассылает.

```typescript
handleAddCombatant()
// Собирает данные (name, avatar, HP, initiative)
// Отправляет combat.addCustomMember
```
→ **ОСТАВИТЬ** — мастер создаёт NPC через UI, данные идут на сервер.

**Проблема:** При `addMode === 'character'` загружает ВЕСЬ список персонажей мастера через `listCharactersApi()`. Это нормально, но потенциально тяжело при большом количестве персонажей.

---

## 10. Компоненты — Lobby

### `src/components/Lobby/LobbyRoomPage.tsx`
**ОСТАВИТЬ** — полноэкранная страница комнаты лобби.

Функциональность:
- Копирование кода лобби в буфер
- Статусы подключения (connected/reconnecting/error)
- Список участников с сортировкой (мастер первый, онлайн перед оффлайн)
- `CombatInitiativeStrip` в бою
- `PlayersCombatSidebar` + `CombatLobbyChat` в режиме боя
- Кнопки мастера: «Запустить бой», «Завершить бой»

### `src/components/Lobby/LobbyPanel.tsx`
**ОСТАВИТЬ** — упрощённая панель лобби (create/join/leave). Используется внутри DiceRoller (legacy, вероятно не используется напрямую).

### `src/components/Lobby/LobbyEntryModal.tsx`
**ОСТАВИТЬ** — модальное окно входа в лобби.

Функциональность:
- Режимы: `join` (по ключу) / `create`
- Выбор персонажа для входа
- Смена персонажа в уже открытом лобби
- Два варианта: `floating` (центр экрана) и `dock` (над доком)

### `src/components/Lobby/MasterMessagePanel.tsx`
**ОСТАВИТЬ** — панель сообщений мастера (последние 20). Ввод и отправка через WebSocket. Только мастер может отправлять.

---

## 11. Hotbar-компоненты

### `HotbarPanels.tsx`
**ОСТАВИТЬ** — 4 панели (атаки, способности, заклинания, предметы). Клик → dice roll или просмотр.

### `StatusBars.tsx`
**ОСТАВИТЬ** — вертикальные HP и Sanity бары. Клик → открывает модал. Только отображение.

### `ActionTrackers.tsx`
**ОСТАВИТЬ** — трекеры action/bonus/reaction.

**Логика на фронте:**
```typescript
toggleAction(id, index) — переключает spent/available
updateActionLimit(id, limit) — изменяет максимум действий
```
→ `character.spentActions` и `character.actionLimits` обновляются через `updateCharacter`. Данные должны синхронизироваться через WS.

### `CombatStats.tsx`
**ОСТАВИТЬ** — отображение КД, инициативы, профбонуса, скорости, СЛ заклинаний.

**Логика входа в бой:**
```typescript
onInitiativeAction():
// Если isInCombat → rollInitiative
// Если canStartSharedCombat → startSharedCombat
// Если isCombatReady → ждать
// Иначе → enterCombat
```
→ **ОСТАВИТЬ как UI-логику**, но `rollInitiative` перенести на бэкенд.

### `ResourceGroup.tsx`
Панель быстрых ресурсов — трата по клику, пополнение по ПКМ. **ОСТАВИТЬ**.

### `PortraitGroup.tsx`
Портрет персонажа с именем, классом, уровнем. **ОСТАВИТЬ**.

### `ExperienceBar.tsx`
XP-бар внизу экрана. **ОСТАВИТЬ** — только отображение.

### `ActionTooltip.tsx`
Тултип при наведении на действие в хотбаре — урон, тип, ресурс. **ОСТАВИТЬ**.

---

## 12. Модальные окна

Все модальные окна (`src/components/`) — **ОСТАВИТЬ** (UI-компоненты).

| Файл | Назначение |
|---|---|
| `HealthModal.tsx` | Редактирование HP, maxHP, tempHP, бонуса |
| `SanityModal.tsx` | Редактирование рассудка |
| `ExperienceModal.tsx` | Редактирование XP и уровня; автопересчёт proficiencyBonus |
| `AttributeModal.tsx` | Редактирование атрибута и его бонуса |
| `ArmorClassModal.tsx` | Редактирование КД, limbACs, сопротивлений |
| `LimbModal.tsx` | Редактирование HP конечности |
| `ResourceModal.tsx` | Создание/редактирование ресурса |
| `ResourceViewModal.tsx` | Просмотр ресурса с тратой/пополнением |
| `ItemModal.tsx` | Создание/редактирование предмета |
| `ItemViewModal.tsx` | Просмотр предмета с экипировкой |
| `AttackModal.tsx` | Создание/редактирование атаки |
| `AttackViewModal.tsx` | Просмотр атаки с броском |
| `AbilityModal.tsx` | Создание/редактирование способности |
| `AbilityViewModal.tsx` | Просмотр способности с тратой ресурса |
| `SpellModal.tsx` | Создание/редактирование заклинания |
| `SpellViewModal.tsx` | Просмотр заклинания |
| `GrimmoireModal.tsx` | Гримуар — управление школами и слотами |
| `TraitModal.tsx` | Создание/редактирование черты |
| `TraitViewModal.tsx` | Просмотр черты |
| `AmmunitionModal.tsx` | Управление патронами |
| `CurrencyModal.tsx` | Управление валютой |
| `BasicInfoModal.tsx` | Базовая информация персонажа |
| `SettingsModal.tsx` | Настройки приложения |
| `CharacterSheetModals.tsx` | Оркестратор всех модалов CharacterSheet |

---

## 13. Прочие компоненты

### `src/components/DiceRoller.tsx` — **ЧАСТИЧНО ПЕРЕНОСИТЬ**

**Самодостаточный компонент** — парсер формул кубиков + UI бросания.

**Функциональность:**
- Парсинг формул типа `2d6+3 fire` → `{dice: [{id: 'd6', count: 2, type: 'fire'}], bonus: 3}`
- Визуальный бросок с анимацией кубиков (Framer Motion)
- Суммирование по типам урона (физический, огонь, etc.)
- Отображение результата в тосте с детализацией по типам
- Интеграция с хотбаром через `window.dispatchEvent('open-dice-hub')`
- Быстрый док (Settings, Лобби, Dice Hub)
- Боевое меню (Next Turn, Dice Hub, End Combat)

**Логика `roll()`:**
```typescript
// Все броски — Math.random() на клиенте
const r = Math.floor(Math.random() * config.sides) + 1;
```
→ **В мультиплеере** — перенести броски на бэкенд. Сервер генерирует числа, рассылает всем участникам результат.

**`parseDiceFormula(formula)`** — парсер строк типа `2d6+3`. ОСТАВИТЬ на фронте для UX, но финальный бросок — на бэкенде.

### `src/components/Navbar.tsx` — **ОСТАВИТЬ**

Навигационная панель с:
- Переключатель режимов `tabs ↔ hotbar`
- Вкладки (stats, hero, health, abilities, magic, attacks, armor, items)
- Быстрый доступ к ресурсам (клик = -1, ПКМ = модал)
- Счётчик патронов и валюты
- Лобби-кнопка
- Колокольчик уведомлений
- Бургер-меню: экспорт JSON/PDF, история, ресурсы, длинный отдых, выход

**Бизнес-логика в navbar:**
```typescript
// Конвертация в золотые монеты
Math.floor(gold + silver/10 + copper/100)
```
→ Оставить — чисто отображение.

### `src/components/CharacterList.tsx` — **ОСТАВИТЬ**

Стартовый экран с:
- Вступительная анимация (SUP логотип)
- Сетка карточек персонажей (compact/full)
- Создание/импорт/настройки/лобби из нижнего дока
- Если не авторизован — встроенный `AuthScreen`

### `src/components/AuthScreen.tsx` — **ОСТАВИТЬ**

Форма логина/регистрации:
- Режимы: `login` | `register`
- Регистрация: имя + email + пароль + подтверждение → 6-значный код на почту
- Клиентская валидация паролей (совпадение, минимум 8 символов)

### `src/components/CharacterCard.tsx` — **ОСТАВИТЬ**

Карточка персонажа в списке. Имя, класс, уровень, HP, аватар. Кнопка удаления.

---

## 14. Утилиты

### `src/utils/damageUtils.tsx`
**ОСТАВИТЬ** — справочные данные цветов и иконок для типов урона. Чисто UI.

### `src/utils/iconUtils.tsx`
**ОСТАВИТЬ** — маппинг строк иконок на Lucide React компоненты. UI-утилита.

### `src/utils/pdfExport.ts`
**ОСТАВИТЬ** — клиентский экспорт PDF через `html2canvas` + `jspdf`. Генерируется из DOM.

---

## 15. i18n (локализация)

Все файлы в `src/i18n/` — **ОСТАВИТЬ**.

| Файл | Назначение |
|---|---|
| `I18nProvider.tsx` | Context + хук `useI18n()` |
| `translations.ts` | Словари RU/EN (~200+ ключей) |
| `LegacyUiLocalizer.tsx` | Перевод старых русских строк |
| `legacyRuToEn.ts` | Маппинг RU → EN для старых данных |
| `domainLabels.ts` | Агрегатор доменных лейблов |
| `domain/attributes.ts` | Переводы атрибутов |
| `domain/conditions.ts` | Переводы состояний |
| `domain/damage.ts` | Переводы типов урона |
| `domain/limbs.ts` | Переводы конечностей |
| `domain/skills.ts` | Переводы навыков |
| `domain/shared.ts` | Общие переводы |

**Замечание:** Локаль хранится в `localStorage` (`itd_locale`). После добавления профиля — лучше хранить в базе данных.

---

## 16. Константы

### `src/constants/conditions.ts`
**ОСТАВИТЬ** — список из 15 состояний (blinded, charmed, deafened и т.д.) с названиями и описаниями.

---

## 17. Electron-специфика

### `src/electron.d.ts`
Объявление `window.electronAPI` — интерфейс к Electron IPC. **ОСТАВИТЬ** (для обратной совместимости с desktop-версией).

### `electron/main.cjs` и `electron/preload.cjs`
Desktop-обёртка. Не касается веб-деплоя. **НЕ ТРОГАТЬ**.

---

## 18. Точки входа

### `src/main.tsx`
`ReactDOM.createRoot` + `I18nProvider` + `App`. **ОСТАВИТЬ**.

### `src/App.tsx`
Корневой компонент. Инициализирует:
1. `auth.init()` — проверяет токен
2. `loadCharactersList()` — загружает список при авторизации
3. `restoreLobbySession()` — восстанавливает лобби-сессию
4. Слушает `app-settings-updated`

**ОСТАВИТЬ** — координационный компонент без бизнес-логики.

---

## 19. Сводная таблица по миграции

### Логика, которая ДОЛЖНА перейти на бэкенд

| Функция/Место | Описание | Приоритет |
|---|---|---|
| `calculateMaxSanity()` | Максимум рассудка по мудрости и уровню | Высокий |
| `calculateLimbMaxHP()` | HP конечности по maxHP и телосложению | Высокий |
| `getDefaultLimbs()` | Инициализация 6 конечностей | Высокий |
| `getLimbInjuryLevel()` | Уровень ранения конечности | Высокий |
| `getProficiencyBonus()` | Бонус мастерства по уровню | Высокий |
| `getModifierValue()` (stats) | Модификатор атрибута | Высокий |
| `getSkillModifier()` | Итоговый бонус навыка | Высокий |
| `getSavingThrowModifier()` | Итоговый бонус спасброска | Высокий |
| `calculateAutoAC()` | Автоматический КД из экипировки | Высокий |
| `buildCharacter()` | Сборка персонажа при создании | Высокий |
| `normalizeCharacter()` | Нормализация данных персонажа | Высокий |
| `equipItem()` | Экипировка с пересчётом КД и созданием атаки | Высокий |
| `unequipItem()` | Снятие с пересчётом и удалением атаки | Высокий |
| `calculateACForState()` | Дублированный расчёт КД в inventory hook | Высокий |
| `saveExperience()` + `getProficiencyBonus()` | Перерасчёт при level-up | Высокий |
| `rollInitiative()` | `Math.random()` на клиенте | Средний |
| `roll()` (DiceRoller) | Все броски кубиков на клиенте | Средний |
| Авто-сброс действий при новом раунде | `spentActions = {0,0,0}` по раунду | Высокий |
| HP-синхронизация через WS | Клиент отправляет свои HP | Высокий |
| `resetAllResources()` | «Длинный отдых» — восстановление ресурсов | Высокий |
| Генерация ID персонажа | `char_${Date.now()}_${Math.random()}` | Высокий |

### Логика, которая ДОЛЖНА остаться на фронтенде

| Компонент/Функция | Обоснование |
|---|---|
| Все UI-компоненты | Отображение, анимации |
| Modal state management | Чистый UI-стейт |
| i18n / переводы | Локализация на клиенте |
| Point Buy UX-валидация | Мгновенная обратная связь |
| PDF-экспорт | DOM → PDF на клиенте |
| JSON-экспорт | Скачивание файла |
| `getItemIcon`, `getItemTypeLabel` | UI-маппинг |
| `parseDiceFormula` | UX-парсинг для предзаполнения |
| Восстановление лобби-сессии | Кэш ключа лобби в localStorage |
| Все API-обёртки | Транспортный слой |
| `LobbySocketClient` | WebSocket-транспорт |
| Справочники: `DAMAGE_TYPES`, `CONDITIONS`, `ATTRIBUTES_LIST` | Статичные данные UI |

---

## 20. Рекомендации по API для миграции

После переноса бизнес-логики на бэкенд, текущий подход «отправить весь Character» следует заменить на гранулярные эндпоинты:

```
# Здоровье
POST /characters/:id/hp         { current, temp }
POST /characters/:id/limbs/:limbId/hp   { current }

# Санити
POST /characters/:id/sanity     { value }

# Опыт и уровень
POST /characters/:id/experience { xp }
# Бэкенд сам пересчитывает уровень и proficiencyBonus

# Атрибуты
PATCH /characters/:id/attributes { attrId, value, bonus }
# Бэкенд пересчитывает модификаторы

# Экипировка
POST /characters/:id/inventory/:itemId/equip
POST /characters/:id/inventory/:itemId/unequip
# Бэкенд пересчитывает КД, limbACs, создаёт/удаляет Attack

# Ресурсы
POST /characters/:id/resources/:resourceId/spend  { amount }
POST /characters/:id/resources/:resourceId/restore { amount }
POST /characters/:id/rest/long   → восстанавливает все ресурсы

# Условия
POST /characters/:id/conditions/toggle { conditionId }

# Броски (опционально, для честности в мультиплеере)
POST /combat/:lobbyKey/roll/initiative → возвращает результат
POST /combat/:lobbyKey/roll/dice       { formula } → результат

# Бой
POST /combat/:lobbyKey/actor/:memberId/hp    { delta, mode: 'damage'|'heal' }
POST /combat/:lobbyKey/actor/:memberId/actions { spentActions }
```

---

## 21. Проблемы безопасности и надёжности

| Проблема | Место | Рекомендация |
|---|---|---|
| Access Token в localStorage | `api/client.ts` | Перейти на `httpOnly` cookie + CSRF-токен |
| JWT токен в WebSocket URL | `lobbySocket.ts` | Передавать через первое WS-сообщение после connect |
| Клиент сам считает и отправляет свой HP | `HotbarView.tsx` | Бэкенд должен авторизовывать HP-изменения |
| Броски кубиков на клиенте | `DiceRoller.tsx`, `useCharacterStats.ts` | Серверные броски для античита |
| Нет rate limiting на WS | `LobbySocketClient` | Добавить троттлинг событий |
| Весь персонаж в одном PUT | `api/characters.ts` | Гранулярные эндпоинты |
| Нет оптимистичных откатов | `useCharacterStore.ts` | Добавить rollback при ошибке API |
| История хранится только 10 последних записей | `useCharacterStore.ts` | Вынести историю в отдельную таблицу на бэкенде |

---

## 22. Что сделано хорошо (не трогать)

- **WebSocket-архитектура лобби** — сервер рассылает `lobby.state` и `combat.state`, клиент только применяет. Правильный подход.
- **Zustand stores** — чёткое разделение: auth, character, lobby, notifications.
- **API-слой** — чистые обёртки без логики, легко заменять.
- **Типизация** — полная TypeScript-типизация всех доменных объектов.
- **Восстановление сессии лобби** — localStorage + `restoreLobbySession()` при mount.
- **Экспоненциальный retry WS** — до 8 попыток с задержкой 1–20 сек.
- **JWT рефреш** — прозрачный рефреш при 401.
- **Разделение viewMode** — `tabs` для редактирования, `hotbar` для боя.
- **i18n** — поддержка RU/EN с contextual-переводами.
