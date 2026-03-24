# Ego Spa — Cloudflare Pages Deployment

## Структура
```
ego-spa/
├── functions/
│   ├── _middleware.js   ← Basic Auth для /admin.html и /save
│   ├── data.json.js     ← GET /data.json → KV или статика
│   └── save.js          ← POST /save → сохраняет в KV
├── index.html
├── admin.html
├── app.js
├── styles.css
└── data.json            ← seed-файл (используется при первом запуске)
```

---

## 1. Установить Wrangler

```bash
npm install -g wrangler
wrangler login
```

---

## 2. Создать KV namespace

```bash
# Production
wrangler kv:namespace create EGO_DATA

# Preview (для локальной разработки)
wrangler kv:namespace create EGO_DATA --preview
```

Wrangler выведет два ID. Запиши их.

---

## 3. Создать Pages проект и задеплоить

```bash
cd ego-spa

# Первый деплой (создаёт проект)
wrangler pages deploy . --project-name ego-spa
```

---

## 4. Привязать KV через Dashboard

Cloudflare Dashboard → **Pages → ego-spa → Settings → Functions**:

| Поле | Значение |
|------|----------|
| KV namespace binding | `EGO_DATA` |
| KV namespace ID | `<id из шага 2>` |

Сделай это для **Production** и **Preview** окружений.

---

## 5. Задать пароль для админки

Cloudflare Dashboard → **Pages → ego-spa → Settings → Environment variables**:

| Variable name | Value | Environment |
|--------------|-------|-------------|
| `ADMIN_PASSWORD` | `твой_пароль` | Production |
| `ADMIN_PASSWORD` | `твой_пароль` | Preview |

> ⚠️ Не коммить пароль в git.

---

## 6. Редеплой после привязки KV

```bash
wrangler pages deploy . --project-name ego-spa
```

---

## Как это работает

- **`/data.json`** — сначала смотрит в KV. Если пусто (первый запуск) — отдаёт статический `data.json` из проекта.
- **`/save`** — POST, сохраняет JSON в KV. Защищён Basic Auth.
- **`/admin.html`** — защищён Basic Auth. Логин: `admin`, пароль: значение `ADMIN_PASSWORD`.
- После первого сохранения в админке KV заполняется, статический файл больше не используется.

---

## Локальная разработка

```bash
# Создать .dev.vars
echo 'ADMIN_PASSWORD=localpass' > .dev.vars

# Запустить с привязкой к preview KV
wrangler pages dev . --kv EGO_DATA=<preview_kv_id>
```

Открыть: http://localhost:8788

---

## Деплой через GitHub (опционально)

1. Push репо на GitHub
2. Dashboard → Pages → Create a project → Connect to Git
3. Build settings: оставь пустыми (нет сборки, статика)
4. Добавь KV binding и env var через Dashboard как в шагах 4–5
