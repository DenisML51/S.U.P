<p align="center">
  <img src="assets/icon.ico" alt="Into the Dark" width="120" />
</p>

<h1 align="center">S.U.P — Character Manager</h1>

<p align="center">
  Настольный менеджер персонажей для D&D 5e и других настольных ролевых систем.<br/>
  Современный, функциональный, полностью оффлайн.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-3.0.0-blue?style=flat-square" />
  <img alt="Electron" src="https://img.shields.io/badge/Electron-28.0-47848F?style=flat-square&logo=electron&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.2-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind_CSS-3.3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows_x64-0078D4?style=flat-square&logo=windows&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/license-Private-gray?style=flat-square" />
</p>

---

<p align="center">
  <img src="docs/screenshots/app-demo.gif" alt="Демонстрация приложения" width="800" />
</p>

---

## Оглавление

- [О проекте](#о-проекте)
- [Возможности](#возможности)
- [Скриншоты](#скриншоты)
- [Технологии](#технологии)
- [Установка и запуск](#установка-и-запуск)
- [Сборка](#сборка)
- [Структура проекта](#структура-проекта)
- [Архитектура](#архитектура)

---

## О проекте

**Into the Dark** (SUP v.3) — это десктопное приложение для управления персонажами настольных ролевых игр. Создано для игроков и мастеров D&D 5e, которым нужен удобный, быстрый и визуально выразительный инструмент вместо бумажных листов персонажей.

Приложение работает полностью оффлайн, хранит данные локально и не требует учётных записей или подключения к интернету.

### Ключевые принципы

| | |
|---|---|
| **Оффлайн-первый** | Все данные хранятся локально. Нет серверов, нет подписок. |
| **Мгновенный отклик** | Zustand + React обеспечивают мгновенную реакцию интерфейса. |
| **Боевой режим** | Hotbar-режим оптимизирован для реального темпа боя за столом. |
| **Мультиперсонаж** | Переключение между персонажами в один клик. |
| **Экспорт** | PDF-экспорт листа персонажа и JSON-бэкапы. |

---

## Возможности

### Управление персонажем

- Пошаговое создание персонажа: базовая информация, характеристики, навыки
- Полный лист персонажа со всеми параметрами D&D 5e
- Аватар персонажа с обрезкой и редактированием изображения
- Импорт и экспорт персонажей в формате JSON
- Поддержка нескольких персонажей с мгновенным переключением

### Характеристики и навыки

- 6 основных характеристик с модификаторами и бонусами
- Навыки с владением и экспертизой
- Спасброски с отслеживанием владений
- Бонус мастерства с автоматическим расчётом

### Здоровье и состояния

- Отслеживание текущих / максимальных HP и временных HP
- Система повреждений конечностей (голова, торс, руки, ноги) с уровнями травм
- 15 состояний D&D (ослеплён, очарован, испуган, парализован и другие)
- Сопротивления, уязвимости и иммунитеты к 13 типам урона

### Заклинания

- Управление заклинаниями 0–9 кругов
- 8 школ магии с цветовой кодировкой
- Подготовленные и известные заклинания
- Ячейки заклинаний с привязкой к ресурсам
- Типы действий: основное, бонусное, реакция
- Мультикомпонентный урон (несколько типов в одном заклинании)

### Атаки

- Бонус попадания и формулы урона
- Мультикомпонентный урон с цветовой индикацией
- Привязка к характеристикам
- Система боеприпасов с автоматическим расходом
- Связь с оружием из инвентаря

### Способности

- Пользовательские способности с произвольными ресурсами
- Стоимость использования в единицах ресурса
- Описание эффектов в формате Markdown

### Снаряжение и инвентарь

- Управление бронёй и оружием
- Расчёт класса брони (AC) с учётом экипировки
- Инвентарь с количеством и описанием предметов
- Система валют: медь / серебро / золото

### Бросок кубиков

- Поддержка произвольных формул (2d20, 3d10+5, 1d8+1d6+3)
- Типы урона для каждого броска
- Визуализация результатов с анимацией

### Боевой режим (Hotbar)

- Компактный вид для боевых сцен
- Портрет, HP-бар, ресурсы на одном экране
- Быстрый доступ к заклинаниям, атакам, способностям
- Отслеживание действий, бонусных действий и реакций

### Экспорт и данные

- PDF-экспорт полного листа персонажа
- JSON-импорт / экспорт для резервного копирования
- Автосохранение с возможностью отключения
- Настраиваемая директория хранения файлов
- История изменений (здоровье, ресурсы, инвентарь, опыт)

---

## Скриншоты

### Список персонажей

<!-- Замените путь на актуальный скриншот -->
<p align="center">
  <img src="docs/screenshots/character-list.png" alt="Список персонажей" width="800" />
</p>

### Лист персонажа — вкладки

<!-- Замените путь на актуальный скриншот -->
<p align="center">
  <img src="docs/screenshots/character-sheet.png" alt="Лист персонажа" width="800" />
</p>

### Заклинания

<!-- Замените путь на актуальный скриншот -->
<p align="center">
  <img src="docs/screenshots/spells.png" alt="Управление заклинаниями" width="800" />
</p>

### Редактирование заклинания (двухколоночный layout)

<!-- Замените путь на актуальный скриншот -->
<p align="center">
  <img src="docs/screenshots/spell-modal.png" alt="Модалка заклинания" width="800" />
</p>

### Атаки и урон

<!-- Замените путь на актуальный скриншот -->
<p align="center">
  <img src="docs/screenshots/attacks.png" alt="Атаки" width="800" />
</p>

### Боевой режим (Hotbar)

<!-- Замените путь на актуальный скриншот -->
<p align="center">
  <img src="docs/screenshots/hotbar.png" alt="Боевой режим" width="800" />
</p>

### Бросок кубиков

<!-- Замените путь на актуальный скриншот -->
<p align="center">
  <img src="docs/screenshots/dice-roller.png" alt="Бросок кубиков" width="800" />
</p>

### Здоровье и повреждения конечностей

<!-- Замените путь на актуальный скриншот -->
<p align="center">
  <img src="docs/screenshots/health.png" alt="Система здоровья" width="800" />
</p>

---

## Технологии

### Основной стек

| Технология | Версия | Назначение |
|---|---|---|
| [React](https://react.dev) | 18.2 | UI-фреймворк |
| [TypeScript](https://typescriptlang.org) | 5.2 | Типизация |
| [Vite](https://vitejs.dev) | 5.0 | Сборщик и дев-сервер |
| [Electron](https://electronjs.org) | 28.0 | Десктопная оболочка |
| [Tailwind CSS](https://tailwindcss.com) | 3.3 | Стилизация |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.0 | Управление состоянием |

### Библиотеки

| Библиотека | Назначение |
|---|---|
| Framer Motion | Анимации и переходы |
| Lucide React | Библиотека иконок (300+) |
| React Markdown + Remark GFM | Markdown-рендеринг описаний |
| jsPDF + html2canvas | PDF-экспорт листа персонажа |
| React Easy Crop | Обрезка аватара персонажа |
| React Hot Toast | Уведомления |

### Инструменты разработки

| Инструмент | Назначение |
|---|---|
| Electron Builder | Сборка дистрибутивов (.exe, NSIS) |
| PostCSS + Autoprefixer | Обработка CSS |
| Concurrently + Wait-on | Параллельный запуск Vite + Electron |
| Sharp | Обработка изображений (иконки) |



## Структура проекта

```
Into-the-Dark-App/
|
|-- src/
|   |-- components/
|   |   |-- CharacterSheet/           # Основной вид листа персонажа
|   |   |   |-- components/
|   |   |   |   |-- Hotbar/           # Компоненты боевого режима
|   |   |   |   |-- Tabs/             # Вкладки: здоровье, заклинания, атаки...
|   |   |   |   |-- Modals/           # Модалки просмотра
|   |   |   |   |-- AttributesSection.tsx
|   |   |   |   |-- ConditionsSection.tsx
|   |   |   |   |-- HotbarView.tsx
|   |   |   |   '-- StatsHeader.tsx
|   |   |   |-- CharacterSheetLogic.ts
|   |   |   '-- index.tsx
|   |   |
|   |   |-- CharacterCreation/        # Мастер создания персонажа
|   |   |   |-- steps/                # Шаги: инфо, атрибуты, навыки
|   |   |   |-- CharacterCreationLogic.ts
|   |   |   '-- index.tsx
|   |   |
|   |   |-- CharacterList.tsx          # Экран выбора персонажа
|   |   |-- CharacterCard.tsx          # Карточка персонажа
|   |   |-- Navbar.tsx                 # Навигационная панель
|   |   |-- DiceRoller.tsx             # Бросок кубиков
|   |   |-- SettingsModal.tsx          # Настройки приложения
|   |   |-- SpellModal.tsx             # Редактирование заклинаний
|   |   |-- AttackModal.tsx            # Редактирование атак
|   |   |-- AbilityModal.tsx           # Редактирование способностей
|   |   |-- MarkdownEditor.tsx         # Markdown-редактор
|   |   |-- IconPicker.tsx             # Выбор иконки
|   |   |-- CustomSelect.tsx           # Кастомный селект
|   |   '-- [другие модалки и компоненты]
|   |
|   |-- store/
|   |   '-- useCharacterStore.ts       # Zustand: состояние персонажей
|   |
|   |-- hooks/character/               # React-хуки
|   |   |-- useCharacterActions.ts
|   |   |-- useCharacterInventory.ts
|   |   |-- useCharacterModals.ts
|   |   |-- useCharacterSpells.ts
|   |   |-- useCharacterStats.ts
|   |   '-- useCharacterUpdate.ts
|   |
|   |-- constants/
|   |   '-- conditions.ts              # Определения состояний D&D
|   |
|   |-- utils/
|   |   |-- damageUtils.tsx            # Утилиты типов урона
|   |   |-- iconUtils.tsx              # Утилиты иконок
|   |   '-- pdfExport.ts              # Логика PDF-экспорта
|   |
|   |-- types.ts                       # TypeScript-интерфейсы (600+ строк)
|   |-- App.tsx                        # Корневой компонент
|   |-- main.tsx                       # Точка входа
|   '-- index.css                      # Глобальные стили
|
|-- electron/
|   |-- main.cjs                       # Main-процесс Electron
|   '-- preload.cjs                    # Preload-скрипт (IPC)
|
|-- assets/
|   '-- icon.ico                       # Иконка приложения
|
|-- scripts/
|   '-- create-icon.cjs                # Генерация иконок
|
|-- dist/                              # Собранный фронтенд
|-- release/                           # Собранные дистрибутивы
|
|-- package.json
|-- tsconfig.json
|-- vite.config.ts
|-- tailwind.config.js
'-- postcss.config.js
```

---

## Архитектура

### Управление состоянием

```
Zustand Store (useCharacterStore)
       |
       |-- characters[]        # Массив всех персонажей
       |-- currentCharacterId  # Активный персонаж
       |-- settings            # Глобальные настройки
       |
       |-- addCharacter()
       |-- updateCharacter()
       |-- deleteCharacter()
       |-- importCharacter()
       '-- exportCharacter()
```

Состояние персидится в `localStorage` и в файловой системе (через Electron IPC). Автосохранение можно настроить в параметрах приложения.

### Electron IPC

```
Renderer (React)  <--preload-->  Main Process (Node.js)
     |                                |
     |-- save-character         -->   fs.writeFile
     |-- load-characters        -->   fs.readdir + readFile
     |-- select-directory       -->   dialog.showOpenDialog
     |-- get-settings           -->   fs.readFile
     '-- toggle-fullscreen      -->   BrowserWindow API
```

Context isolation включена, node integration отключена. Всё взаимодействие с ОС идёт через безопасный preload-скрипт.

### Система типов урона

Приложение поддерживает 13 типов урона D&D 5e, каждый с собственным цветом:

| Тип | Цвет |
|---|---|
| Физический | `#94a3b8` |
| Колющий | `#64748b` |
| Рубящий | `#78716c` |
| Дробящий | `#a8a29e` |
| Огненный | `#ef4444` |
| Холод | `#38bdf8` |
| Молния | `#facc15` |
| Яд | `#22c55e` |
| Кислота | `#a3e635` |
| Психический | `#e879f9` |
| Некротический | `#6b7280` |
| Излучение | `#fbbf24` |
| Силовое поле | `#818cf8` |

