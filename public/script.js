/**
 * script.js — ENERGIA A Landing Page
 * Compatível com Tailwind CSS
 * Funcionalidades: Simulador · FAQ · Formulário · Modal · Header · Animações
 */

/* ═══════════════════════════════════════════════════════════════════
   CONFIGURAÇÕES DO SIMULADOR
   ═══════════════════════════════════════════════════════════════════ */

const TARIFA_KWH = 1.20;  // Tarifa média ENERGISA–MS 2024 (R$/kWh)
let DESCONTO   = 0.20;  // Desconto médio estimado (25% — centro de 20–30%)

let simMode = 'kwh';

/**
 * Alterna modo do simulador entre kWh e R$
 */
function setSimMode(mode) {
  simMode = mode;

  const btnKwh   = document.getElementById('btnKwh');
  const btnReais = document.getElementById('btnReais');
  const label    = document.getElementById('simLabel');
  const prefix   = document.getElementById('simPrefix');
  const hint     = document.getElementById('simHint');
  const input    = document.getElementById('simInput');

  // Estilos do toggle — ativo vs inativo
  const activeClasses   = ['bg-white', 'text-primary', 'shadow-sm'];
  const inactiveClasses = ['text-gray-500', 'hover:text-gray-700'];

  if (mode === 'kwh') {
    btnKwh.classList.add(...activeClasses);
    btnKwh.classList.remove(...inactiveClasses);
    btnReais.classList.remove(...activeClasses);
    btnReais.classList.add(...inactiveClasses);
    btnKwh.setAttribute('aria-selected', 'true');
    btnReais.setAttribute('aria-selected', 'false');

    label.textContent = 'Consumo médio mensal (kWh)';
    prefix.textContent = 'kWh';
    hint.innerHTML = '💡 Você encontra esse número na sua conta de luz, no campo <strong class="text-gray-600">"Consumo do Mês"</strong>.';
    input.placeholder = 'Ex: 350';
  } else {
    btnReais.classList.add(...activeClasses);
    btnReais.classList.remove(...inactiveClasses);
    btnKwh.classList.remove(...activeClasses);
    btnKwh.classList.add(...inactiveClasses);
    btnKwh.setAttribute('aria-selected', 'false');
    btnReais.setAttribute('aria-selected', 'true');

    label.textContent = 'Valor médio da sua conta (R$)';
    prefix.textContent = 'R$';
    hint.innerHTML = '💡 Use o valor total que você paga na conta de luz, sem descontos.';
    input.placeholder = 'Ex: 350';
  }

  input.value = '';
  resetSimulator();
}

/**
 * Calcula e exibe a economia estimada
 */
function calcSimulator() {
  const raw = parseFloat(document.getElementById('simInput').value);

  if (!raw || raw <= 0) {
    resetSimulator();
    return;
  }

  if (raw < 1000){
    DESCONTO = 0.20;  
  }
  if (raw >= 1000 && raw < 5000){
    DESCONTO = 0.25;
  }
  if (raw >= 5000){
    DESCONTO = 0.27;
  }

  const valorConta     = simMode === 'kwh' ? raw * TARIFA_KWH : raw;
  const economiaMensal = valorConta * DESCONTO;
  const economiaAnual  = economiaMensal * 12;
  const contasEco      = economiaAnual / valorConta;

  document.getElementById('monthlyValue').textContent = formatBRL(economiaMensal);
  document.getElementById('yearlyValue').textContent  = formatBRL(economiaAnual);
  document.getElementById('billsValue').textContent   = contasEco.toFixed(1).replace('.', ',') + ' contas';

  // Exibe o botão CTA
  const cta = document.getElementById('simCTA');
  cta.classList.remove('hidden');
  cta.classList.add('flex');
}

/**
 * Reseta os resultados do simulador
 */
function resetSimulator() {
  document.getElementById('monthlyValue').textContent = '–';
  document.getElementById('yearlyValue').textContent  = '–';
  document.getElementById('billsValue').textContent   = '–';

  const cta = document.getElementById('simCTA');
  cta.classList.add('hidden');
  cta.classList.remove('flex');
}

/**
 * Formata número como moeda BRL
 */
function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ═══════════════════════════════════════════════════════════════════
   FAQ — ACCORDION
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Abre ou fecha um item do FAQ
 */
function toggleFaq(btn) {
  const item   = btn.closest('.faq-item');
  const body   = item.querySelector('.faq-body');
  const isOpen = item.classList.contains('faq-open');

  // Fecha todos os outros itens
  document.querySelectorAll('.faq-item.faq-open').forEach(openItem => {
    openItem.classList.remove('faq-open', 'border-secondary/50');
    openItem.classList.add('border-gray-100');
    openItem.querySelector('.faq-body').classList.remove('open');
    openItem.querySelector('button').setAttribute('aria-expanded', 'false');
  });

  // Abre o clicado (se estava fechado)
  if (!isOpen) {
    item.classList.add('faq-open', 'border-secondary/50');
    item.classList.remove('border-gray-100');
    body.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

/* ═══════════════════════════════════════════════════════════════════
   FORMULÁRIO DE LEADS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Envia o lead para a API e redireciona para WhatsApp
 */
async function submitLead(event) {
  event.preventDefault();

  const name        = document.getElementById('leadName').value.trim();
  const whatsapp    = document.getElementById('leadWhatsapp').value.trim();
  const consumption = document.getElementById('leadConsumption').value.trim();
  const btn         = document.getElementById('submitBtn');

  if (!name) {
    shakeInput('leadName');
    return;
  }
  if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
    shakeInput('leadWhatsapp');
    return;
  }

  btn.textContent = '⏳ Enviando...';
  btn.disabled    = true;

  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        whatsapp,
        consumption: consumption || null,
        billValue: null,
      }),
    });
  } catch (err) {
    console.warn('API indisponível — redirecionando mesmo assim:', err.message);
  }

  // Webhook n8n - Envia os dados do formulário
  try {
    await fetch('https://n8n.energiaa.com.br/webhook/7a0364cb-155e-4415-83ef-f9903183a7c4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'formulario_lead',
        nome: name,
        whatsapp: whatsapp,
        consumo: consumption || null
      }),
    });
  } catch (err) {
    console.error('Erro ao enviar webhook n8n:', err);
  }

  showModal(name, whatsapp);
}

/**
 * Efeito de shake no input com erro
 */
function shakeInput(id) {
  const el = document.getElementById(id);
  el.classList.add('border-red-400', 'ring-4', 'ring-red-100');
  el.focus();
  el.animate([
    { transform: 'translateX(-5px)' },
    { transform: 'translateX(5px)'  },
    { transform: 'translateX(-3px)' },
    { transform: 'translateX(3px)'  },
    { transform: 'translateX(0)'    },
  ], { duration: 280, easing: 'ease' });
  setTimeout(() => el.classList.remove('border-red-400', 'ring-4', 'ring-red-100'), 2000);
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL DE CONFIRMAÇÃO
   ═══════════════════════════════════════════════════════════════════ */

let _name = '';
let _wa   = '';
let _timer = null;

/**
 * Exibe o modal e agenda redirect para WhatsApp
 */
function showModal(name, whatsapp) {
  _name = name;
  _wa   = whatsapp.replace(/\D/g, '');

  const modal = document.getElementById('confirmModal');
  modal.classList.add('modal-visible');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Inicia a barra de progresso
  const bar = document.getElementById('modalProgressBar');
  requestAnimationFrame(() => { bar.classList.add('running'); });

  // Redirect automático após 2.8s
  _timer = setTimeout(() => redirectToWhatsApp(_name, _wa), 2900);
}

/**
 * Fecha o modal e redireciona imediatamente
 */
function closeModal() {
  clearTimeout(_timer);
  redirectToWhatsApp(_name, _wa);

  const modal = document.getElementById('confirmModal');
  modal.classList.remove('modal-visible');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // Reset form
  document.getElementById('leadForm').reset();
  const btn = document.getElementById('submitBtn');
  btn.textContent = '⚡ Quero economizar agora';
  btn.disabled    = false;

  // Reset progress bar
  const bar = document.getElementById('modalProgressBar');
  setTimeout(() => {
    bar.style.transition = 'none';
    bar.classList.remove('running');
    setTimeout(() => { bar.style.transition = ''; }, 50);
  }, 300);
}

/**
 * Abre WhatsApp com mensagem pré-preenchida
 */
function redirectToWhatsApp(name, wa) {
  if (!name || !wa) return;
  const firstName = name.split(' ')[0];
  const msg = encodeURIComponent(
    `Olá! Sou ${firstName}. Quero simular minha economia com energia solar por assinatura. 🌞`
  );
  window.open(`https://wa.me/5567998425163?text=${msg}`, '_blank');
}

/* ═══════════════════════════════════════════════════════════════════
   HEADER — scroll + menu mobile
   ═══════════════════════════════════════════════════════════════════ */

function initHeader() {
  const header    = document.getElementById('header');
  const menuBtn   = document.getElementById('menuBtn');
  const mobileNav = document.getElementById('mobileNav');

  // Sombra ao fazer scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('shadow-2xl');
    } else {
      header.classList.remove('shadow-2xl');
    }
  }, { passive: true });

  // Toggle menu mobile
  menuBtn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('hidden') === false;
    menuBtn.classList.toggle('menu-open', isOpen);
    menuBtn.setAttribute('aria-expanded', isOpen);
  });

  // Fecha menu ao clicar em link
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.add('hidden');
      menuBtn.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Fecha menu ao clicar fora
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) {
      mobileNav.classList.add('hidden');
      menuBtn.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SMOOTH SCROLL
   ═══════════════════════════════════════════════════════════════════ */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = document.getElementById('header').offsetHeight + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   ANIMAÇÕES SCROLL — Intersection Observer
   ═══════════════════════════════════════════════════════════════════ */

function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════════
   TRACKING DE CLIQUES WHATSAPP
   ═══════════════════════════════════════════════════════════════════ */

function initWhatsAppTracking() {
  document.querySelectorAll('a[href^="https://wa.me"]').forEach(link => {
    link.addEventListener('click', () => {
      try {
        fetch('https://n8n.energiaa.com.br/webhook/7a0364cb-155e-4415-83ef-f9903183a7c4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'aviso_clique_link',
            mensagem: 'Alguém clicou em um link direto de redirecionamento para o WhatsApp',
            url: link.href
          })
        });
      } catch (err) {
        console.error('Erro ao enviar webhook de aviso:', err);
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initSmoothScroll();
  initAnimations();
  initWhatsAppTracking();
});
