/* ============================================
   WAGGO Internal Site — Interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Intersection Observer for section animations ──
  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  sections.forEach(s => observer.observe(s));

  // ── Active nav link tracking ──
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const sectionEls = document.querySelectorAll('[id]');

  function updateActiveNav() {
    let current = '';
    sectionEls.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 120) {
        current = section.id;
      }
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // ── Scroll progress bar ──
  const progressBar = document.querySelector('.scroll-progress-bar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrollTop = document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / scrollHeight) * 100;
      progressBar.style.width = progress + '%';
    }, { passive: true });
  }

  // ── Mobile sidebar toggle ──
  const toggle = document.querySelector('.mobile-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar on nav click (mobile)
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('open');
        }
      });
    });
  }

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Phase navigation (auto-inject on detail pages) ──
  const detailBody = document.querySelector('.detail-body');
  if (detailBody) {
    const phases = [
      { file: 'fase-0.html', num: '0', name: 'Research' },
      { file: 'fase-03.html', num: '0.3', name: 'Funnel Hack' },
      { file: 'fase-1.html', num: '1', name: 'Product Strategy' },
      { file: 'fase-2.html', num: '2', name: 'Segmentação' },
      { file: 'fase-3.html', num: '3', name: 'Funnel Architecture' },
      { file: 'fase-41.html', num: '4.1', name: 'Ângulos' },
      { file: 'fase-42.html', num: '4.2', name: 'LP Copy' },
      { file: 'fase-43.html', num: '4.3', name: 'LP Review' },
      { file: 'fase-6.html', num: '6', name: 'VSL Script' },
      { file: 'fase-7.html', num: '7', name: 'Email Strategy' },
      { file: 'fase-8.html', num: '8', name: 'Final Review' },
    ];
    const currentFile = location.pathname.split('/').pop();
    const currentIdx = phases.findIndex(p => p.file === currentFile);
    if (currentIdx !== -1) {
      const prev = currentIdx > 0 ? phases[currentIdx - 1] : null;
      const next = currentIdx < phases.length - 1 ? phases[currentIdx + 1] : null;
      const nav = document.createElement('div');
      nav.className = 'phase-nav';
      nav.innerHTML = `
        ${prev ? `<a href="${prev.file}" class="phase-nav-link prev"><span class="phase-nav-arrow">←</span><span><span class="phase-nav-label">Anterior</span><span class="phase-nav-name">Fase ${prev.num}: ${prev.name}</span></span></a>` : '<span></span>'}
        ${next ? `<a href="${next.file}" class="phase-nav-link next"><span><span class="phase-nav-label">Próxima</span><span class="phase-nav-name">Fase ${next.num}: ${next.name}</span></span><span class="phase-nav-arrow">→</span></a>` : '<span></span>'}
      `;
      detailBody.appendChild(nav);
    }
  }

  // ── Score ring animation ──
  document.querySelectorAll('.score-ring').forEach(ring => {
    const score = parseFloat(ring.dataset.score);
    const max = parseFloat(ring.dataset.max || 5);
    const deg = (score / max) * 360;
    ring.style.setProperty('--score-deg', deg + 'deg');
  });

  // ── Counter animation for metric values ──
  const metricObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = 'true';
        animateCounter(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => {
    metricObserver.observe(el);
  });

  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const duration = 1200;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      const current = target * eased;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }
});
