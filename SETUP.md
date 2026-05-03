# ENERGIA A — Guia de Configuração e Deploy

## Visão Geral

Este projeto é uma landing page com backend serverless.
- **Frontend**: HTML/CSS/JS estático servido pelo Vercel
- **Backend**: `api/leads.js` (função serverless no Vercel)
- **Banco de dados**: Google Sheets (via Google Sheets API)
- **Notificações**: E-mail via Gmail (nodemailer)

---

## PASSO 1 — Adicionar o Logo

1. Pegue o arquivo da sua logo (PNG com fundo transparente, preferencialmente)
2. Renomeie para `logo.png`
3. Coloque em: `public/images/logo.png`
4. Verifique se a logo aparece corretamente abrindo o `index.html` no navegador

---

## PASSO 2 — Criar a Planilha Google Sheets

1. Acesse **sheets.google.com** e crie uma nova planilha
2. Renomeie a aba (parte inferior) para exatamente: `Leads`
3. Na linha 1, crie os seguintes cabeçalhos (uma palavra por célula):

   | A | B | C | D | E | F | G | H | I |
   |---|---|---|---|---|---|---|---|---|
   | Data/Hora | Nome | WhatsApp | Origem | Cidade | Consumo (kWh) | Valor Conta (R$) | Status | Observações |

4. Formate conforme preferir (negrito, cor de fundo etc.)
5. **Copie o ID da planilha** da URL:
   - URL exemplo: `https://docs.google.com/spreadsheets/d/`**`1A2B3C4D5E6F7G...`**`/edit`
   - O ID é a parte em negrito. Guarde para o Passo 3.

---

## PASSO 3 — Criar Service Account no Google Cloud

1. Acesse: **console.cloud.google.com**
2. Crie um novo projeto (ou use um existente) — pode chamar de `energia-a`
3. No menu lateral: **APIs e serviços > Biblioteca**
4. Pesquise e ative: **Google Sheets API**
5. Vá em: **APIs e serviços > Credenciais**
6. Clique em **+ Criar credenciais > Conta de serviço**
   - Nome: `energia-a-sheets`
   - Clique em **Criar e continuar** (sem precisar de permissões adicionais)
7. Na lista de contas de serviço, clique na que criou
8. Vá na aba **Chaves > Adicionar chave > Criar nova chave**
9. Escolha formato **JSON** e clique em **Criar**
10. O arquivo JSON será baixado — guarde com segurança!

No arquivo JSON, você vai precisar de:
- `client_email` → é o `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → é o `GOOGLE_PRIVATE_KEY`

11. **Compartilhe a planilha com a Service Account:**
    - Abra a planilha do Passo 2
    - Clique em **Compartilhar**
    - Cole o e-mail da Service Account (o `client_email` do JSON)
    - Permissão: **Editor**
    - Clique em **Enviar**

---

## PASSO 4 — Configurar E-mail Gmail

1. Use uma conta Gmail dedicada para envio (recomendado criar uma nova)
2. Ative a verificação em 2 etapas: **myaccount.google.com > Segurança**
3. Gere uma **Senha de App**:
   - **myaccount.google.com > Segurança > Senhas de app**
   - App: `Outro (nome personalizado)` → `ENERGIA A`
   - Copie a senha gerada (16 caracteres)
4. Essa senha vai para `SMTP_PASS` (não a senha normal do Gmail)

---

## PASSO 5 — Colocar o Projeto no GitHub

1. Crie uma conta em **github.com** (se não tiver)
2. Crie um novo repositório: **New Repository**
   - Nome: `energia-a-landing`
   - Visibilidade: **Private** (recomendado)
3. Na sua máquina, abra o terminal na pasta do projeto e rode:

```bash
git init
git add .
git commit -m "feat: landing page inicial ENERGIA A"
git remote add origin https://github.com/SEU_USUARIO/energia-a-landing.git
git push -u origin main
```

---

## PASSO 6 — Deploy no Vercel

1. Acesse **vercel.com** e faça login com sua conta GitHub
2. Clique em **Add New > Project**
3. Selecione o repositório `energia-a-landing`
4. Na tela de configuração:
   - **Framework Preset**: Other
   - **Output Directory**: `public`
   - Deixe o resto padrão
5. **Antes de clicar em Deploy**, vá em **Environment Variables** e adicione:

| Nome | Valor |
|------|-------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | e-mail da sua service account |
| `GOOGLE_PRIVATE_KEY` | chave privada (com `\n` nas quebras de linha) |
| `GOOGLE_SHEET_ID` | ID da planilha |
| `SMTP_USER` | seu Gmail |
| `SMTP_PASS` | senha de app do Gmail |
| `NOTIFY_EMAIL` | e-mail que recebe os leads |
| `CLOSER_EMAIL` | e-mail do closer |

> **Atenção para a GOOGLE_PRIVATE_KEY**: No Vercel, cole o valor completo incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`. Substitua as quebras de linha reais por `\n`.

6. Clique em **Deploy** 🚀

O site vai ao ar em ~30 segundos.

---

## PASSO 7 — Domínio Personalizado (Opcional)

1. No painel do Vercel, vá em **Settings > Domains**
2. Adicione seu domínio (ex: `energiaa.com.br`)
3. Configure os DNS conforme instruído pelo Vercel
4. O SSL (HTTPS) é ativado automaticamente, grátis

---

## Testando o Formulário

1. Acesse o site publicado
2. Preencha o formulário com dados de teste
3. Verifique:
   - [ ] Modal de confirmação aparece
   - [ ] Redirecionamento para WhatsApp funciona
   - [ ] Lead aparece na planilha Google Sheets
   - [ ] E-mail de notificação chega

---

## Atualizações Futuras

Para atualizar o site após qualquer mudança:

```bash
git add .
git commit -m "sua descrição da mudança"
git push
```

O Vercel faz o redeploy automaticamente em ~30 segundos.

---

## Integrações Futuras (já preparadas no código)

O arquivo `api/leads.js` já tem blocos comentados prontos para:

- **Webhook (n8n / Make / Zapier)**: Descomente e defina `WEBHOOK_URL`
- **WhatsApp via CallMeBot**: Registro gratuito em callmebot.com
- **CRM / RD Station / HubSpot**: Adicione a chamada de API no bloco de webhook

---

## Suporte

Dúvidas técnicas? Entre em contato via WhatsApp: (67) 9 9842-5163
