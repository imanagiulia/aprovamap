# AprovaMap — Mapa de Estudos para Concursos

Aplicação web responsiva em **React + TypeScript + Vite + Tailwind CSS + Supabase (PostgreSQL)** para mapear seu progresso nos estudos para concursos públicos.

## Recursos

- **Múltiplos Concursos:** cadastre os concursos que está estudando (com banca, data da prova e cor) e agrupe suas matérias por edital.
- **Cadastro de Matérias e Subtópicos** vinculados a cada concurso, com cor identificadora, meta de acertos, status de estudo e anotações.
- **Resolução de Questões & Nível de Compreensão Automático:**
  - Registro de **baterias de questões com histórico** e gráfico de evolução por subtópico.
  - Faixas automáticas: **Crítico** (`< 50%`), **Básico** (`50% – 69%`), **Bom** (`70% – 84%`) e **Dominado** (`≥ 85%`).
- **Alertas de Revisão:** destaque automático para conteúdos com baixo desempenho ou sem prática de questões, filtráveis por concurso e com agendamento em 1 clique.
- **Calendário Interativo (Mensal e Semanal):** clique no dia para agendar matérias/subtópicos, filtre por concurso/matéria, marque sessões concluídas e arraste cartões entre datas (drag-and-drop).
- **Acesso Protegido:** autenticação com e-mail e senha + Row Level Security (RLS) no Supabase PostgreSQL, além de Modo Local com senha para testes imediatos.

## Executar localmente

```bash
npm install
npm run dev
```

## Conectar ao Supabase (PostgreSQL na nuvem)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute o script [supabase/schema.sql](./supabase/schema.sql) (ou [supabase/migration_exams.sql](./supabase/migration_exams.sql) se você já tinha o banco criado na versão anterior).
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Reinicie `npm run dev` (ou configure essas mesmas variáveis na Vercel/GitHub Pages ao publicar).
