# Agenda - Site Estático

Sistema de agendamento apenas com HTML/CSS/JS — salva dados no navegador (localStorage).

## Rodar localmente
1. Abra a pasta `agenda-static`.
2. Abra `index.html` no navegador (arrastar no browser) ou use um servidor local simples:
   - Python 3:
     ```
     python -m http.server 8000
     ```
     e acesse `http://localhost:8000`.

## Deploy na Vercel
1. Crie um repositório no GitHub com estes arquivos (ou use `vercel` CLI).
2. No terminal, instale Vercel CLI (`npm i -g vercel`) ou acesse vercel.com e conecte seu GitHub.
3. Deploy automático pela interface do Vercel (escolha repositório) — é site estático, sem build necessário.
4. Ou usar CLI:
