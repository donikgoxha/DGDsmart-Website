/* =============================================
   DGDsmart — Interactive JavaScript
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // Navbar Scroll Effect
    // ==========================================
    const navbar = document.getElementById('navbar');

    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ==========================================
    // Mobile Navigation Toggle
    // ==========================================
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ==========================================
    // Active Navigation Link on Scroll
    // ==========================================
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-link');

    const updateActiveLink = () => {
        const scrollPos = window.scrollY + 150;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPos >= top && scrollPos < top + height) {
                navItems.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', updateActiveLink, { passive: true });

    // ==========================================
    // Counter Animation
    // ==========================================
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    let countersAnimated = false;

    const animateCounters = () => {
        if (countersAnimated) return;

        const heroSection = document.getElementById('hero');
        const heroBottom = heroSection.getBoundingClientRect().bottom;

        if (heroBottom < window.innerHeight + 200) {
            countersAnimated = true;

            statNumbers.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-target'));
                const duration = 2000;
                const startTime = performance.now();

                const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

                const updateCounter = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = easeOutQuart(progress);
                    const current = Math.round(easedProgress * target);

                    counter.textContent = current;

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    }
                };

                requestAnimationFrame(updateCounter);
            });
        }
    };

    window.addEventListener('scroll', animateCounters, { passive: true });
    // Run once on load in case already visible
    animateCounters();

    // ==========================================
    // Scroll Reveal Animations
    // ==========================================
    const revealElements = () => {
        const reveals = [
            ...document.querySelectorAll('.section-header'),
            ...document.querySelectorAll('.about-card'),
            ...document.querySelectorAll('.service-card'),
            ...document.querySelectorAll('.category-card'),
            ...document.querySelectorAll('.why-card'),
            ...document.querySelectorAll('.contact-card'),
            ...document.querySelectorAll('.contact-map'),
        ];

        reveals.forEach(el => {
            if (!el.classList.contains('reveal')) {
                el.classList.add('reveal');
            }
        });

        // Stagger grids
        const grids = [
            document.querySelector('.about-grid'),
            document.querySelector('.services-grid'),
            document.querySelector('.product-categories'),
            document.querySelector('.why-grid'),
        ];

        grids.forEach(grid => {
            if (grid && !grid.classList.contains('reveal-stagger')) {
                grid.classList.add('reveal-stagger');
            }
        });
    };

    revealElements();

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
        revealObserver.observe(el);
    });

    // ==========================================
    // Floating Particles in Hero
    // ==========================================
    const particlesContainer = document.getElementById('particles');

    const createParticle = () => {
        const particle = document.createElement('div');
        const size = Math.random() * 4 + 1;
        const duration = Math.random() * 20 + 15;
        const delay = Math.random() * 10;
        const startX = Math.random() * 100;

        Object.assign(particle.style, {
            position: 'absolute',
            width: `${size}px`,
            height: `${size}px`,
            background: Math.random() > 0.5
                ? 'rgba(21, 116, 181, 0.3)'
                : 'rgba(0, 212, 255, 0.2)',
            borderRadius: '50%',
            left: `${startX}%`,
            bottom: '-10px',
            animation: `floatParticle ${duration}s ${delay}s linear infinite`,
            pointerEvents: 'none',
        });

        particlesContainer.appendChild(particle);
    };

    // Create floating particle keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatParticle {
            0% {
                transform: translateY(0) translateX(0) scale(1);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px) scale(0);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Generate particles
    for (let i = 0; i < 30; i++) {
        createParticle();
    }

    // ==========================================
    // Smooth Scroll for Anchor Links
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navHeight = navbar.offsetHeight;
                const targetPosition = target.offsetTop - navHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ==========================================
    // Cursor Glow Effect (Desktop Only)
    // ==========================================
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) {
        // Create cursor glow element
        const cursorGlow = document.createElement('div');
        cursorGlow.classList.add('cursor-glow');
        document.body.appendChild(cursorGlow);

        // Create cursor dot
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
            // Smooth follow for glow (slower)
            glowX += (mouseX - glowX) * 0.08;
            glowY += (mouseY - glowY) * 0.08;
            cursorGlow.style.transform = `translate(${glowX - 200}px, ${glowY - 200}px)`;

            // Faster follow for dot
            dotX += (mouseX - dotX) * 0.2;
            dotY += (mouseY - dotY) * 0.2;
            cursorDot.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`;

            requestAnimationFrame(animateCursor);
        };
        requestAnimationFrame(animateCursor);

        // Scale up cursor on interactive elements
        const interactiveEls = document.querySelectorAll('a, button, .service-card, .about-card, .category-card, .why-card, .contact-card, .brand-item');
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

        // ==========================================
        // Card Spotlight Effect
        // ==========================================
        const spotlightCards = document.querySelectorAll('.about-card, .service-card, .category-card, .why-card, .contact-card');

        spotlightCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--spot-x', `${x}px`);
                card.style.setProperty('--spot-y', `${y}px`);
            });
        });

        // ==========================================
        // Hero Parallax on Mouse Move
        // ==========================================
        const heroContent = document.querySelector('.hero-content');
        const heroBg = document.querySelector('.hero-bg-img');

        document.querySelector('.hero').addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const moveX = (clientX - centerX) / centerX;
            const moveY = (clientY - centerY) / centerY;

            heroContent.style.transform = `translate(${moveX * 8}px, ${moveY * 5}px)`;
            heroBg.style.transform = `scale(1.05) translate(${moveX * -15}px, ${moveY * -10}px)`;
        });

        document.querySelector('.hero').addEventListener('mouseleave', () => {
            heroContent.style.transform = 'translate(0, 0)';
            heroBg.style.transform = 'scale(1.05) translate(0, 0)';
        });
    }

});
