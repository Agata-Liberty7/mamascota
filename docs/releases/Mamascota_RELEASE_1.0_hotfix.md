# RELEASE_1.0.md
# Mamascota Release 1.0

Дата фиксации: 05.07.2026  
Статус: релиз готов к публикации / блокеров нет

## 1. Общий статус релиза

Mamascota подготовлена к стабильному web/PWA-релизу 1.0.

Базовый пользовательский сценарий проверен:

- первый вход;
- Terms;
- FAQ / About;
- выбор питомца;
- выбор симптомов;
- чат;
- финализация;
- PDF;
- Support / донаты;
- Plus / подписки.

Критических блокеров на момент фиксации нет.

## 2. Архитектура и окружение

### 2.1. Frontend

Expo React Native / Web / PWA.

Основной web build собирается через:

```bash
npx expo export --platform web --clear
```

Деплой frontend выполняется через Cloudflare Pages загрузкой свежего `dist`.

### 2.2. Backend

Cloudflare Worker TypeScript.

```text
Worker endpoint: https://agent.mamascota.com/agent
Health endpoint: https://agent.mamascota.com/health
```

### 2.3. Proxy URL

```text
EXPO_PUBLIC_PROXY_URL содержит полный путь с /agent
```

Повторно `/agent` в коде не добавлять.

### 2.4. OpenAI model

```text
gpt-5-mini
```

### 2.5. Stripe

Монетизация работает через Stripe Payment Links. Worker для оплаты не используется.

```text
app/plus.tsx
app/paywall.tsx
```

### 2.6. Мобильные версии iOS и Android

Mamascota изначально начиналась как мобильное приложение для iOS и Android.

Текущий релиз 1.0 сфокусирован на стабильной web/PWA-версии, но мобильные версии уже существуют в проектной архитектуре и частично учитывались при развитии PWA.

Статус мобильных версий на момент релиза 1.0:

```text
iOS — существует, требует отдельной подготовки к App Store review
Android — существует, требует отдельной подготовки к Google Play review
```

Мобильные версии не являются блокером текущего web/PWA-релиза.

Параллельно с работой над Mamascota v2.0 нужно подготовить мобильные сборки к проверке.

#### iOS

- проверить `app.json` / `app.config`;
- проверить bundle identifier;
- проверить иконки, splash, permissions;
- проверить privacy labels / App Privacy;
- проверить медицинские дисклеймеры;
- проверить in-app purchase / external payment policy, если Plus будет доступен в native app;
- собрать production build;
- прогнать TestFlight;
- подготовить App Store metadata.

#### Android

- проверить package name;
- проверить adaptive icon / splash;
- проверить permissions;
- проверить Data Safety;
- проверить medical disclaimers;
- проверить Google Play payment policy, если Plus будет доступен в native app;
- собрать production build;
- прогнать internal testing;
- подготовить Google Play metadata.

Отдельное важное решение:

```text
Web/PWA монетизация через Stripe Payment Links уже работает.
Для native iOS/Android нужно отдельно проверить правила App Store и Google Play по оплатам, подпискам и внешним ссылкам.
Не переносить web-оплату в native без policy review.
```

Вывод:

```text
Release 1.0 = стабильный web/PWA-релиз.
Mobile iOS/Android = следующий параллельный трек подготовки к stores вместе с v2.0.
```

## 3. Что вошло в релиз

### 3.1. Языковой фикс чата

```text
Первый вопрос агента → язык интерфейса
После первого реального ответа пользователя → язык пользователя
Финализация → язык пользователя
PDF → выбранный язык PDF
```

Для обычного чата и финализации используется `userLang: "auto"`. `decisionTree` для PDF остаётся на выбранном языке PDF.

### 3.2. Поддержка языков

Подключены 14 языков:

```text
bg, de, en, es, fr, he, it, ka, pl, pt, ru, sr, tr, uk
```

Обновлены `i18n.ts`, `locales/*.json`, `LanguageSelector`, PDF language modal. RTL учитывать для Hebrew.

### 3.3. FAQ / onboarding lock

Закрыт UX-баг первого входа:

```text
Первый вход → Terms → FAQ
меню и сердце в шапке disabled
кнопка “Продолжить” ведёт дальше
после выхода в обычный About меню снова работает
```

Файл: `app/about.tsx`. Проверено на проде: работает нормально.

### 3.4. Финализация и PDF

Принятое поведение финализационных бабблов:

```text
PDF ещё не создан → финальные бабблы остаются в чате
PDF создан → при возврате финальные бабблы скрываются
```

Это осознанное UX-решение, не баг. `decisionTree` не рендерится в чате и используется только для PDF.

### 3.5. Support / донаты

Support реализован через Stripe Payment Links.

Файл: `app/paywall.tsx`.

Проверены реальные сценарии оплаты. Финальная ручная проверка пройдена.

### 3.6. Plus / подписки

Plus реализован через Stripe Payment Links.

Файл: `app/plus.tsx`.

Проверены реальные сценарии оплаты. Финальная ручная проверка пройдена.

## 4. Что проверено на проде

### 4.1. Onboarding / FAQ

```text
Первый вход → Terms → FAQ
меню и сердце disabled
кнопка “Продолжить” ведёт дальше
обычный About после выхода работает нормально
Статус: закрыто
```

### 4.2. Stripe

```text
Support / донаты
Plus / подписки
общая настройка методов оплаты Stripe
Статус: закрыто
```

### 4.3. Worker

```text
Worker: mamascota-agent
Version ID: b1d43425-94ba-41a0-93eb-1ddd06849493
Model: gpt-5-mini
Health: ok
```

Health check:

```json
{
  "ok": true,
  "status": "up",
  "hasApiKey": true,
  "model": "gpt-5-mini"
}
```

### 4.4. Web dist

FAQ/onboarding fix закоммичен. `dist` собран. Проверка после деплоя пройдена. Статус: закрыто.

## 5. Деплои и версии

### 5.1. Worker prod

```text
mamascota-agent
Version ID: b1d43425-94ba-41a0-93eb-1ddd06849493
```

### 5.2. Git

Последний известный стабильный языковой коммит:

```text
f9eff504 feat: expand locales and preserve chat language
```

FAQ/onboarding lock закоммичен отдельно:

```text
fix: lock menu during first-entry FAQ
```

Точный hash FAQ-коммита в этом документе не зафиксирован.

### 5.3. Frontend

Frontend деплоится вручную через Cloudflare Pages свежим `dist`.


### 5.4. Post-release hotfix: start flow and photo requests

After the v1.0.0 release, a hotfix was added and merged into main.

Scope:

- Clarified the first-entry start flow.
- The main CTA remains clear before Terms acceptance.
- The first-entry FAQ CTA now uses the generic Continue action.
- Legal links are hidden on the first-entry FAQ screen because Terms and Privacy are already shown in the Terms step and remain available later in the regular About screen.
- Mamascota no longer asks users to send, upload, attach, or provide photos or videos in chat.
- If visual information would help, Mamascota asks the user to describe it in words.

Affected areas:

- Frontend: `app/index.tsx`, `app/about.tsx`
- Worker prompts: `systemPrompt.ts`, `processMessage.ts`

Status:

- Merged into `main`.
- Pulled into `v2.0-product`.
- Deployed to production Worker and Pages.
## 6. Известные ограничения, не блокирующие релиз

### 6.1. WA / качество консультации

Файл будущей работы:

```text
cloudflare/agent-worker/mamascota-agent/src/brain/processMessage.ts
```

Открытые задачи:

- меньше допроса;
- раньше давать навигацию;
- объяснять срочность / несрочность;
- не использовать “дифференциальные диагнозы”;
- не просить фото/видео, если функция не поддержана;
- учитывать первый / повторный / известный эпизод;
- раньше спрашивать хронические болезни и регулярные лекарства;
- в ЖКТ отдельно спрашивать смену корма и пищевой инцидент.

Предыдущий runtime guard-патч был откатан. Не возвращать его без отдельного проектирования.

### 6.2. PDF / DecisionTree v2

Файлы будущей работы:

```text
cloudflare/agent-worker/mamascota-agent/src/brain/processMessage.ts
utils/exportPDF.ts
```

Текущая схема `decisionTree` слишком узкая:

```text
anamnesis_short
next_steps.observe_at_home
next_steps.urgent_now
next_steps.plan_visit
```

Нужна новая схема PDF / DT v2 с отдельным проектированием.

Возможные будущие поля:

```text
clinical_context
triage_reasoning
known_risks
missing_critical_questions
diet_change
dietary_incident
chronic_conditions
guardian_observation
vet_questions
what_changed_now
first_or_recurrent_episode
why_urgency
age_breed_species_risks
```

### 6.3. PDF: убрать мимишных животных

Файл будущей работы: `utils/exportPDF.ts`.

Задача:

- убрать декоративные картинки животных из PDF;
- не заменять их новыми милыми иллюстрациями;
- если фото питомца нет — PDF должен выглядеть профессионально без заглушки-картинки.

### 6.4. Фото питомца

Файлы нужно найти перед патчем.

Задача:

- предусмотреть загрузку фото в карточке питомца;
- если фото загружено — подтягивать его в PDF;
- если фото нет — не показывать изображение.

Делать отдельными шагами:

1. убрать текущие картинки из PDF;
2. добавить фото в карточку питомца;
3. подключить фото к PDF.

### 6.5. Native review новых языков

Файлы: `locales/*.json`.

Технически языки подключены. Перед широким публичным запуском желательно проверить носителями:

```text
pt, tr, sr, ka, bg, uk, pl
```

Особенно: paywall, plus, PDF modal, onboarding, FAQ, medical disclaimers.

### 6.6. UI / адаптивность

Открытые задачи:

- десктопные экраны кроме чата не полностью адаптивные;
- онбординг mobile web выглядит слабее приложения;
- выбор животного нужно сделать более резиновым;
- PDF открывается в браузере, не в PWA desktop.

Не блокирует текущий релиз.

### 6.7. Mobile iOS/Android store readiness

Мобильные версии существуют, но не подготовлены к App Store / Google Play review в рамках релиза 1.0.

Это отдельный параллельный трек вместе с v2.0:

- подготовка iOS-версии к App Store review;
- подготовка Android-версии к Google Play review;
- проверка store policies для Plus / Support / внешних Stripe-ссылок;
- проверка нативных сборок, permissions, privacy labels, Data Safety, metadata.

## 7. Что сознательно не делаем в этом релизе

- не меняем архитектуру оплаты;
- не переводим Stripe Payment Links на Worker Checkout Sessions;
- не трогаем PDF translation layer без отдельного плана;
- не возвращаем откатанный WA runtime guard;
- не расширяем decisionTree косметическим prompt-патчем;
- не добавляем фото питомца без отдельного проектирования хранения;
- не делаем UI-рефакторинг перед релизом;
- не отправляем native iOS/Android в App Store / Google Play до отдельной policy-подготовки.

## 8. Smoke test checklist

- [ ] Открыть приложение с чистого состояния
- [ ] Пройти Terms
- [ ] Попасть в FAQ / About
- [ ] Проверить disabled menu / support heart
- [ ] Нажать “Продолжить”
- [ ] Выбрать питомца
- [ ] Выбрать симптомы
- [ ] Начать чат
- [ ] Проверить язык первого вопроса
- [ ] Ответить на другом языке
- [ ] Проверить, что чат переключился на язык пользователя
- [ ] Дойти до финализации
- [ ] Проверить финализацию
- [ ] Создать PDF
- [ ] Проверить выбор языка PDF
- [ ] Проверить, что decisionTree не появился в чате
- [ ] Открыть Support
- [ ] Проверить донат
- [ ] Открыть Plus
- [ ] Проверить monthly / yearly
- [ ] Проверить Worker health

На момент фиксации ключевые пункты проверены вручную.

## 9. Следующие задачи после релиза

### Приоритет 1

PDF / DecisionTree v2. Цель: сделать PDF более содержательным, профессиональным и полезным для визита к ветеринару.

### Приоритет 2

Убрать мимишных животных из PDF и подготовить фото питомца.

### Приоритет 3

Качество WA / агента: меньше допроса, больше навигации и объяснения срочности.

### Приоритет 4

Native review новых языков.

### Приоритет 5

Адаптивность UI.

### Приоритет 6

Подготовка iOS-версии к App Store review, подготовка Android-версии к Google Play review, проверка store policies для Plus / Support / внешних Stripe-ссылок.

## 10. Релизный вывод

Mamascota готова к стабильному web/PWA-релизу. Блокеров нет.

Текущий релиз фиксирует:

- работающий основной сценарий;
- стабильный Worker;
- исправленный языковой режим;
- расширенную языковую поддержку;
- исправленный FAQ/onboarding flow;
- работающие Support и Plus оплаты;
- готовый web dist;
- зафиксированный параллельный трек подготовки mobile iOS/Android к stores.

Следующий этап — не срочные релизные фиксы, а улучшение качества PDF, decisionTree, консультационного поведения агента и подготовка native mobile версий к App Store / Google Play.
