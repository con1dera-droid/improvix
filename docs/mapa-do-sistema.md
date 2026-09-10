# Mapa do Sistema — ImprovisaLab

## 1. Arquitetura — Etapa 1 (sem login, custo zero)

Nesta etapa não existe backend nem banco de dados: tudo roda no navegador do
usuário. Isso é o que permite custo zero.

```mermaid
flowchart LR
    U[Usuário] -->|digita tonalidade + progressão| FE[Frontend SPA<br/>HTML/JS ou React]
    FE -->|chama| ENGINE[Motor de Teoria Musical<br/>lib JS: campo harmônico,<br/>escalas, arpejos, notas-alvo]
    ENGINE -->|resultado| FE
    FE -->|renderiza abas: Visão Geral,<br/>Escalas, Arpejos, Notas-alvo| U
    FE -.hospedado em.-> HOST[Vercel/Netlify - plano gratuito]
```

## 2. Arquitetura — a partir da Etapa 4 (login/histórico)

```mermaid
flowchart LR
    U[Usuário] --> FE[Frontend SPA]
    FE --> ENGINE[Motor de Teoria Musical]
    FE -->|login/sessão| AUTH[Supabase Auth]
    FE -->|salvar histórico,<br/>favoritos, exercícios| API[Supabase Postgres<br/>+ RLS por user_id]
    AUTH --> API
    FE -.hospedado em.-> HOST[Vercel/Netlify]
```

## 3. Modelo de dados (a partir da Etapa 4)

```mermaid
erDiagram
    USERS ||--o{ ANALISES : cria
    USERS ||--o{ FAVORITOS : marca
    USERS ||--o{ EXERCICIOS_SALVOS : salva
    USERS {
        uuid id PK
        text email
        text plano
    }
    ANALISES {
        uuid id PK
        uuid user_id FK
        text tonalidade
        text progressao
        text instrumento
        text nivel
        timestamp criado_em
    }
    FAVORITOS {
        uuid id PK
        uuid user_id FK
        uuid analise_id FK
    }
    EXERCICIOS_SALVOS {
        uuid id PK
        uuid user_id FK
        uuid fraseado_id FK
        text status
    }
```

## 4. Fluxo principal — "Analisar Harmonia" (Etapa 1)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant FE as Frontend
    participant EN as Motor de Teoria Musical

    U->>FE: digita Tonalidade, Progressão, Instrumento, Nível
    U->>FE: clica "Analisar Harmonia"
    FE->>FE: valida formato dos acordes
    FE->>EN: analisar(tonalidade, progressao)
    EN->>EN: identifica campo harmônico e função de cada acorde
    EN->>EN: calcula escalas e arpejos recomendados por acorde
    EN->>EN: calcula nota-alvo de cada acorde
    EN-->>FE: resultado estruturado
    FE-->>U: renderiza Visão Geral, Escalas, Arpejos, Notas-alvo
```

## 5. Fluxo futuro — Login e salvar histórico (Etapa 4)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant FE as Frontend
    participant AUTH as Supabase Auth
    participant DB as Supabase Postgres (RLS)

    U->>FE: login (e-mail/senha ou provedor)
    FE->>AUTH: autentica
    AUTH-->>FE: sessão + user_id
    U->>FE: analisa uma progressão
    FE->>DB: insere em analises (user_id = sessão atual)
    DB->>DB: RLS verifica auth.uid() = user_id
    DB-->>FE: confirma gravação
```
