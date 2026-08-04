/* =============================================
   DGDsmart — Interactive JavaScript
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // Shop details used in more than one place.
    const SHOP = {
        whatsapp: '38970251225',      // international format, no "+" — used for wa.me links
        email: 'dgdsmart@gmail.com',
        timeZone: 'Europe/Skopje',
        openHour: 9,                  // 09:00
        closeHour: 19,                // 19:00
        openDays: [1, 2, 3, 4, 5, 6], // Mon–Sat (0 = Sunday)
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ==========================================
    // Single rAF-throttled scroll pipeline
    // ==========================================
    const navbar = document.getElementById('navbar');
    const progressBar = document.getElementById('scrollProgress');
    const backToTop = document.getElementById('backToTop');
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-link');

    let ticking = false;

    const onScroll = () => {
        const y = window.scrollY;

        // Navbar background
        navbar.classList.toggle('scrolled', y > 50);

        // Progress bar
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? y / scrollable : 0;
        progressBar.style.transform = `scaleX(${progress})`;

        // Back to top
        backToTop.hidden = y < 600;

        // Active nav link
        const scrollPos = y + 150;
        let currentId = null;
        sections.forEach(section => {
            if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
                currentId = section.getAttribute('id');
            }
        });
        if (currentId) {
            navItems.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
            });
        }

        animateCounters();
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(onScroll);
        }
    }, { passive: true });

    // ==========================================
    // Mobile Navigation Toggle
    // ==========================================
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    const closeNav = () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };

    navToggle.addEventListener('click', () => {
        const willOpen = !navLinks.classList.contains('active');
        navToggle.classList.toggle('active', willOpen);
        navLinks.classList.toggle('active', willOpen);
        navToggle.setAttribute('aria-expanded', String(willOpen));
        document.body.style.overflow = willOpen ? 'hidden' : '';
    });

    // Close the drawer on any link inside it, including the "Book a Repair" button
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeNav();
            navToggle.focus();
        }
    });

    // ==========================================
    // Counter Animation
    // ==========================================
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    let countersAnimated = false;

    function animateCounters() {
        if (countersAnimated) return;

        const heroSection = document.getElementById('hero');
        if (!heroSection) return;

        if (heroSection.getBoundingClientRect().bottom < window.innerHeight + 200) {
            countersAnimated = true;

            statNumbers.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-target'), 10);

                if (prefersReducedMotion) {
                    counter.textContent = target;
                    return;
                }

                const duration = 2000;
                const startTime = performance.now();
                const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

                const updateCounter = (currentTime) => {
                    const progress = Math.min((currentTime - startTime) / duration, 1);
                    counter.textContent = Math.round(easeOutQuart(progress) * target);
                    if (progress < 1) requestAnimationFrame(updateCounter);
                };

                requestAnimationFrame(updateCounter);
            });
        }
    }

    animateCounters();

    // ==========================================
    // Scroll Reveal Animations
    // ==========================================
    const revealSelectors = [
        '.section-header',
        '.about-card',
        '.service-card',
        '.category-card',
        '.why-card',
        '.contact-card',
        '.contact-map',
        '.process-step',
        '.repair-note',
        '.reviews-cta-card',
        '.faq-item',
        '.book-form',
        '.book-side-card',
        '.trust-item',
    ];

    document.querySelectorAll(revealSelectors.join(',')).forEach(el => {
        el.classList.add('reveal');
    });

    [
        '.about-grid',
        '.services-grid',
        '.product-categories',
        '.why-grid',
        '.reviews-cta',
        '.trust-list',
    ].forEach(selector => {
        const grid = document.querySelector(selector);
        if (grid) grid.classList.add('reveal-stagger');
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => revealObserver.observe(el));

    // ==========================================
    // Repair Catalog Tabs
    // ==========================================
    const repairTabs = Array.from(document.querySelectorAll('.repair-tab'));

    const selectTab = (tab) => {
        repairTabs.forEach(t => {
            const isActive = t === tab;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', String(isActive));
            t.tabIndex = isActive ? 0 : -1;

            const panel = document.getElementById(t.getAttribute('aria-controls'));
            if (panel) {
                panel.hidden = !isActive;
                panel.classList.toggle('active', isActive);
            }
        });
    };

    repairTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectTab(tab));

        // Left/right arrows move between tabs, per the ARIA tabs pattern
        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const offset = e.key === 'ArrowRight' ? 1 : -1;
            const next = repairTabs[(index + offset + repairTabs.length) % repairTabs.length];
            selectTab(next);
            next.focus();
        });
    });

    // ==========================================
    // Repair Request Form → WhatsApp
    // Nothing is stored or sent anywhere: the form only builds a
    // pre-written WhatsApp message that the visitor sends themselves.
    // ==========================================
    const repairForm = document.getElementById('repairForm');

    if (repairForm) {
        const showError = (field, message) => {
            const wrapper = field.closest('.form-field');
            wrapper.classList.toggle('invalid', Boolean(message));
            const errorEl = wrapper.querySelector('.form-error');
            if (errorEl) errorEl.textContent = message || '';
        };

        repairForm.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('input', () => showError(field, ''));
            field.addEventListener('change', () => showError(field, ''));
        });

        // Returns the message body, or null when something is missing.
        const collect = () => {
            const { name, phone, device, model, issue } = repairForm.elements;
            let firstInvalid = null;

            const validate = (field, condition, message) => {
                showError(field, condition ? '' : message);
                if (!condition && !firstInvalid) firstInvalid = field;
            };

            validate(name, name.value.trim().length >= 2, 'Please tell us your name.');
            validate(phone, phone.value.replace(/\D/g, '').length >= 6, 'Please enter a phone number we can reach you on.');
            validate(device, device.value !== '', 'Please choose a device type.');
            validate(issue, issue.value.trim().length >= 10, 'A few more words about the problem, please.');

            if (firstInvalid) {
                firstInvalid.focus();
                return null;
            }

            const lines = [
                `Name: ${name.value.trim()}`,
                `Phone: ${phone.value.trim()}`,
                `Device: ${device.value}`,
            ];

            if (model.value.trim()) lines.push(`Model: ${model.value.trim()}`);
            lines.push('', `Problem: ${issue.value.trim()}`);

            return lines.join('\n');
        };

        repairForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const body = collect();
            if (!body) return;

            const text = `Repair request — DGDsmart\n\n${body}`;
            window.open(`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        });

        document.getElementById('sendByEmail')?.addEventListener('click', () => {
            const body = collect();
            if (!body) return;

            const subject = encodeURIComponent('Repair request — DGDsmart');
            window.location.href = `mailto:${SHOP.email}?subject=${subject}&body=${encodeURIComponent(body)}`;
        });
    }

    // ==========================================
    // Open / Closed Badge (shop's local time)
    // ==========================================
    const openStatus = document.getElementById('openStatus');

    if (openStatus) {
        try {
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: SHOP.timeZone,
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).formatToParts(new Date());

            const get = type => parts.find(p => p.type === type)?.value;
            const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
            const hour = parseInt(get('hour'), 10);

            const isOpen = SHOP.openDays.includes(dayIndex)
                && hour >= SHOP.openHour
                && hour < SHOP.closeHour;

            openStatus.textContent = isOpen ? 'Open now' : 'Closed';
            openStatus.classList.add(isOpen ? 'is-open' : 'is-closed');
            openStatus.hidden = false;
        } catch {
            // Older browser without full Intl time zone support — leave the badge hidden.
        }
    }

    // ==========================================
    // Footer Year
    // ==========================================
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ==========================================
    // Back to Top
    // ==========================================
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    // ==========================================
    // Floating Particles in Hero
    // ==========================================
    const particlesContainer = document.getElementById('particles');

    if (particlesContainer && !prefersReducedMotion) {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes floatParticle {
                0%   { transform: translateY(0) scale(1); opacity: 0; }
                10%  { opacity: 1; }
                90%  { opacity: 1; }
                100% { transform: translateY(-100vh) scale(0); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < 24; i++) {
            const particle = document.createElement('div');
            const size = Math.random() * 4 + 1;

            Object.assign(particle.style, {
                position: 'absolute',
                width: `${size}px`,
                height: `${size}px`,
                background: Math.random() > 0.5
                    ? 'rgba(21, 116, 181, 0.3)'
                    : 'rgba(0, 212, 255, 0.2)',
                borderRadius: '50%',
                left: `${Math.random() * 100}%`,
                bottom: '-10px',
                animation: `floatParticle ${Math.random() * 20 + 15}s ${Math.random() * 10}s linear infinite`,
                pointerEvents: 'none',
            });

            fragment.appendChild(particle);
        }

        particlesContainer.appendChild(fragment);
    }

    // ==========================================
    // Smooth Scroll for Anchor Links
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href.length < 2) return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            window.scrollTo({
                top: target.offsetTop - navbar.offsetHeight - 20,
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
            });
        });
    });

    // ==========================================
    // Cursor & Parallax Effects (Desktop Only)
    // ==========================================
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice && !prefersReducedMotion) {
        const cursorGlow = document.createElement('div');
        cursorGlow.classList.add('cursor-glow');
        document.body.appendChild(cursorGlow);

        const cursorDot = document.createElement('div');
        cursorDot.classList.add('cursor-dot');
        document.body.appendChild(cursorDot);

        let mouseX = 0, mouseY = 0;
        let glowX = 0, glowY = 0;
        let dotX = 0, dotY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }, { passive: true });

        const animateCursor = () => {
            glowX += (mouseX - glowX) * 0.08;
            glowY += (mouseY - glowY) * 0.08;
            cursorGlow.style.transform = `translate(${glowX - 200}px, ${glowY - 200}px)`;

            dotX += (mouseX - dotX) * 0.2;
            dotY += (mouseY - dotY) * 0.2;
            cursorDot.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`;

            requestAnimationFrame(animateCursor);
        };
        requestAnimationFrame(animateCursor);

        const interactiveEls = document.querySelectorAll(
            'a, button, input, select, textarea, summary, .service-card, .about-card, .category-card, .why-card, .contact-card, .brand-item, .repair-item'
        );
        interactiveEls.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorDot.classList.add('cursor-hover');
                cursorGlow.classList.add('cursor-glow-hover');
            });
            el.addEventListener('mouseleave', () => {
                cursorDot.classList.remove('cursor-hover');
                cursorGlow.classList.remove('cursor-glow-hover');
            });
        });

        // Card spotlight
        document.querySelectorAll('.about-card, .service-card, .category-card, .why-card, .contact-card')
            .forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    card.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
                    card.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
                });
            });

        // Hero parallax
        const hero = document.querySelector('.hero');
        const heroContent = document.querySelector('.hero-content');
        const heroBg = document.querySelector('.hero-bg-img');

        if (hero && heroContent && heroBg) {
            hero.addEventListener('mousemove', (e) => {
                const moveX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
                const moveY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);

                heroContent.style.transform = `translate(${moveX * 8}px, ${moveY * 5}px)`;
                heroBg.style.transform = `scale(1.14) translate(${moveX * -15}px, ${moveY * -10}px)`;
            });

            hero.addEventListener('mouseleave', () => {
                heroContent.style.transform = 'translate(0, 0)';
                heroBg.style.transform = 'scale(1.1) translate(0, 0)';
            });
        }
    }

});
