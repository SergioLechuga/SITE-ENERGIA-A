/**
 * api/leads.js — Vercel Serverless Function
 * ENERGIA A — Captura e registro de leads
 *
 * Responsabilidades:
 *   1. Valida os dados recebidos do formulário
 *   2. Salva o lead no Google Sheets
 *   3. Envia e-mail de notificação ao Closer
 *   4. Retorna confirmação ao frontend
 *
 * Variáveis de ambiente necessárias (configurar no painel Vercel):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — e-mail da Service Account
 *   GOOGLE_PRIVATE_KEY            — chave privada da Service Account
 *   GOOGLE_SHEET_ID               — ID da planilha Google Sheets
 *   SMTP_USER                     — e-mail Gmail para envio de notificações
 *   SMTP_PASS                     — senha de app do Gmail (não a senha normal)
 *   NOTIFY_EMAIL                  — e-mail do responsável comercial
 *   CLOSER_EMAIL                  — e-mail do Closer (pode ser igual ao anterior)
 */

const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// Cabeçalhos da planilha (linha 1 — criar manualmente no Google Sheets)
// | Data/Hora | Nome | WhatsApp | Origem | Cidade | Consumo (kWh) | Valor Conta (R$) | Status | Observações |

module.exports = async (req, res) => {

  // Suporte a CORS (necessário para chamadas do navegador)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde pre-flight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // ── 1. EXTRAÇÃO E VALIDAÇÃO DOS DADOS ──────────────────────────────────────

  const { name, whatsapp, consumption, billValue } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  if (!whatsapp || !whatsapp.trim()) {
    return res.status(400).json({ error: 'WhatsApp é obrigatório' });
  }

  // Formata o WhatsApp: remove tudo que não for dígito
  const whatsappClean = whatsapp.replace(/\D/g, '');

  // Timestamp no fuso de Campo Grande (MS)
  const now = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Campo_Grande',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const origin = req.headers.referer || 'Landing Page ENERGIA A';

  const results = { sheets: false, email: false };

  // ── 2. SALVAR NO GOOGLE SHEETS ─────────────────────────────────────────────

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // A chave privada vem com \n literal — precisa substituir por quebra real
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Leads!A:I',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          now,                          // A — Data/Hora
          name.trim(),                  // B — Nome
          whatsapp.trim(),              // C — WhatsApp
          'Landing Page',               // D — Origem
          '',                           // E — Cidade (capturar futuramente)
          consumption || '',            // F — Consumo (kWh)
          billValue || '',              // G — Valor Conta (R$)
          'Novo',                       // H — Status (Novo / Em Contato / Fechado / Perdido)
          '',                           // I — Observações
        ]],
      },
    });

    results.sheets = true;
  } catch (err) {
    // Não bloqueia a resposta ao usuário se o Sheets falhar
    console.error('[Google Sheets] Erro:', err.message);
  }

  // ── 3. E-MAIL DE NOTIFICAÇÃO AO CLOSER ────────────────────────────────────

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,   // Senha de App do Gmail (não a senha normal)
      },
    });

    // Destinatários: responsável comercial + Closer (deduplica se forem iguais)
    const recipients = [...new Set([
      process.env.NOTIFY_EMAIL,
      process.env.CLOSER_EMAIL,
    ].filter(Boolean))].join(', ');

    const whatsappLink = `https://wa.me/55${whatsappClean}?text=${encodeURIComponent(
      `Olá, ${name.trim()}! Aqui é da ENERGIA A. Vi que você tem interesse em economizar na sua conta de luz. Posso te ajudar com uma simulação gratuita? 😊`
    )}`;

    await transporter.sendMail({
      from: `"ENERGIA A — Leads" <${process.env.SMTP_USER}>`,
      to: recipients,
      subject: `🔥 Novo Lead — ${name.trim()} | ENERGIA A`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: #0f2d37; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #e27f1b; margin: 0; font-size: 24px;">⚡ ENERGIA A</h1>
            <p style="color: #fff; margin: 5px 0 0;">Novo Lead Capturado</p>
          </div>
          <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px; font-weight: bold; color: #0f2d37; width: 40%;">📅 Data/Hora</td>
                <td style="padding: 10px;">${now}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd; background: #fff;">
                <td style="padding: 10px; font-weight: bold; color: #0f2d37;">👤 Nome</td>
                <td style="padding: 10px;">${name.trim()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px; font-weight: bold; color: #0f2d37;">📱 WhatsApp</td>
                <td style="padding: 10px;">${whatsapp.trim()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd; background: #fff;">
                <td style="padding: 10px; font-weight: bold; color: #0f2d37;">⚡ Consumo</td>
                <td style="padding: 10px;">${consumption ? consumption + ' kWh' : 'Não informado'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px; font-weight: bold; color: #0f2d37;">💰 Valor da conta</td>
                <td style="padding: 10px;">${billValue ? 'R$ ' + billValue : 'Não informado'}</td>
              </tr>
              <tr style="background: #fff;">
                <td style="padding: 10px; font-weight: bold; color: #0f2d37;">🌐 Origem</td>
                <td style="padding: 10px;">${origin}</td>
              </tr>
            </table>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${whatsappLink}"
                 style="background: #25D366; color: #fff; padding: 14px 28px; border-radius: 6px;
                        text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">
                💬 Abrir WhatsApp do Lead
              </a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
              Lead registrado automaticamente pelo site energiaa.com.br
            </p>
          </div>
        </body>
        </html>
      `,
    });

    results.email = true;
  } catch (err) {
    console.error('[E-mail] Erro:', err.message);
  }

  // ── 4. WEBHOOK FUTURO (n8n / Make / RD Station / HubSpot) ─────────────────
  //
  // Para integrar com automações externas, descomente e configure:
  //
  // try {
  //   await fetch(process.env.WEBHOOK_URL, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       timestamp: now,
  //       name: name.trim(),
  //       whatsapp: whatsapp.trim(),
  //       consumption,
  //       billValue,
  //       source: 'landing-page-energia-a',
  //     }),
  //   });
  // } catch (err) {
  //   console.error('[Webhook] Erro:', err.message);
  // }

  // ── 5. NOTIFICAÇÃO WHATSAPP VIA CALLMEBOT (opcional) ──────────────────────
  //
  // Requer registro gratuito em: callmebot.com/blog/free-api-whatsapp-messages/
  // Adicionar variáveis: CALLMEBOT_PHONE e CALLMEBOT_APIKEY
  //
  // try {
  //   const msg = encodeURIComponent(
  //     `🔥 Novo Lead ENERGIA A!\n👤 ${name.trim()}\n📱 ${whatsapp.trim()}\n⚡ ${consumption || 'N/A'} kWh`
  //   );
  //   await fetch(
  //     `https://api.callmebot.com/whatsapp.php?phone=${process.env.CALLMEBOT_PHONE}&text=${msg}&apikey=${process.env.CALLMEBOT_APIKEY}`
  //   );
  // } catch (err) {
  //   console.error('[CallMeBot] Erro:', err.message);
  // }

  // ── 6. RESPOSTA AO FRONTEND ────────────────────────────────────────────────

  return res.status(200).json({
    success: true,
    message: 'Lead registrado com sucesso',
    integrations: results,
  });
};
