/* =============================================================
   DGDsmart — interaction layer

   Everything a finger can touch is driven by a spring rather than a
   CSS transition. A spring animates from wherever the value currently
   is, so a gesture can grab a moving element mid-flight and reverse it
   without a jump and without waiting for anything to finish.
   ============================================================= */

(() => {
    'use strict';

    const SHOP = {
        whatsapp: '38970251225',      // international format, no "+", for wa.me links
        email: 'dgdsmart@gmail.com',
        timeZone: 'Europe/Skopje',
        openHour: 9,
        closeHour: 19,
        openDays: [1, 2, 3, 4, 5, 6], // Mon–Sat (0 = Sunday)
    };

    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => { reducedMotion = e.matches; });

    /* ---------------------------------------------------------
       Spring
       Parameterised the way Apple exposes it: damping ratio and
       response, not mass/stiffness/damping.
         damping 1.0  = critically damped, settles without overshoot
         damping ~0.8 = a little bounce, for momentum-driven motion
         response     = roughly how long it takes to get there
       --------------------------------------------------------- */

    const live = new Set();
    let rafId = null;
    let lastFrame = 0;

    function frame(now) {
        // Clamp dt so a backgrounded tab doesn't integrate a huge step.
        const dt = Math.min((now - lastFrame) / 1000, 1 / 20);
        lastFrame = now;
        for (const s of live) {
            // One failing callback must not take the whole ticker — and with
            // it every other animation on the page — down with it.
            try { s.step(dt); } catch (err) { live.delete(s); }
        }
        rafId = live.size ? requestAnimationFrame(frame) : null;
    }

    function wakeTicker() {
        if (rafId !== null) return;
        lastFrame = performance.now();
        rafId = requestAnimationFrame(frame);
    }

    class Spring {
        constructor(value, options = {}) {
            const { response = 0.4, damping = 1, precision = 0.08, onUpdate, onRest } = options;
            this.value = value;
            this.target = value;
            this.velocity = 0;
            this.precision = precision;
            this.onUpdate = onUpdate;
            this.onRest = onRest;
            this.configure(response, damping);
        }

        configure(response, damping) {
            this.response = response;
            this.damping = damping;
            const w = (2 * Math.PI) / response;  // natural angular frequency
            this.k = w * w;                      // stiffness, unit mass
            this.c = 2 * damping * w;            // damping coefficient
        }

        /** Jump straight to a value with no motion (resize, first paint). */
        set(value) {
            this.value = value;
            this.target = value;
            this.velocity = 0;
            live.delete(this);
            this.onUpdate?.(value);
        }

        /**
         * Re-target. Current value and velocity are kept, so interrupting
         * a animation blends into the new one instead of hitting a wall.
         */
        to(target, velocity) {
            this.target = target;
            if (velocity !== undefined) this.velocity = velocity;

            if (reducedMotion) {
                this.set(target);
                this.onRest?.();
                return;
            }

            live.add(this);
            wakeTicker();
        }

        stop() {
            live.delete(this);
            this.velocity = 0;
        }

        step(dt) {
            // Sub-step so a long frame can't make the integration explode.
            const steps = Math.min(8, Math.max(1, Math.ceil(dt * 240)));
            const h = dt / steps;

            for (let i = 0; i < steps; i++) {
                const accel = -this.k * (this.value - this.target) - this.c * this.velocity;
                this.velocity += accel * h;
                this.value += this.velocity * h;
            }

            const settled = Math.abs(this.value - this.target) < this.precision
                && Math.abs(this.velocity) < this.precision * 10;

            if (settled) {
                this.value = this.target;
                this.velocity = 0;
                live.delete(this);
                this.onUpdate?.(this.value);
                this.onRest?.();
                return;
            }

            this.onUpdate?.(this.value);
        }
    }

    /**
     * Where a flick would come to rest, using the same exponential decay
     * as scroll momentum. Snap to whatever is nearest the projection, not
     * nearest the release point — that is what makes a flick feel thrown.
     */
    function project(velocity, decelerationRate = 0.998) {
        return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
    }

    /** Progressive resistance past a boundary, instead of a hard stop. */
    function rubberband(overshoot, dimension, constant = 0.55) {
        return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
    }

    /** Velocity from a short history of samples, not just the last two points. */
    function tracker() {
        const samples = [];
        return {
            add(value) {
                samples.push({ value, time: performance.now() });
                if (samples.length > 8) samples.shift();
            },
            reset() { samples.length = 0; },
            velocity() {
                if (samples.length < 2) return 0;
                const last = samples[samples.length - 1];
                let first = samples[0];
                for (let i = samples.length - 1; i >= 0; i--) {
                    if (last.time - samples[i].time > 110) break;
                    first = samples[i];
                }
                const dt = (last.time - first.time) / 1000;
                return dt > 0 ? (last.value - first.value) / dt : 0;
            },
        };
    }

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /* ---------------------------------------------------------
       Theme
       --------------------------------------------------------- */

    const themeToggle = $('#themeToggle');
    const systemDark = matchMedia('(prefers-color-scheme: dark)');

    const isDark = () => document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark'
        : systemDark.matches;

    const syncThemeButton = () => themeToggle?.setAttribute('aria-pressed', String(isDark()));

    syncThemeButton();
    systemDark.addEventListener('change', syncThemeButton);

    let themeSwitchTimer = null;

    themeToggle?.addEventListener('click', () => {
        const root = document.documentElement;
        const next = isDark() ? 'light' : 'dark';

        if (!reducedMotion) {
            root.classList.add('theme-switching');
            clearTimeout(themeSwitchTimer);
            themeSwitchTimer = setTimeout(() => root.classList.remove('theme-switching'), 360);
        }

        root.dataset.theme = next;
        try { localStorage.setItem('dgd-theme', next); } catch (e) { /* private mode */ }
        syncThemeButton();
    });

    /* ---------------------------------------------------------
       Scroll: nav material, active link, quick actions, hero
       One rAF-throttled pass, not four listeners.
       --------------------------------------------------------- */

    const nav = $('#nav');
    const quick = $('#quickActions');
    const heroFrame = $('#heroFrame');
    const navLinks = $$('[data-nav]');
    const sections = $$('main section[id]');

    let scrollQueued = false;

    function onScroll() {
        const y = window.scrollY;

        nav.classList.toggle('is-scrolled', y > 8);
        quick.classList.toggle('is-visible', y > window.innerHeight * 0.6);

        // Hero image settles into place as it comes up the screen.
        if (heroFrame && !reducedMotion) {
            const rect = heroFrame.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, 1 - rect.top / window.innerHeight));
            heroFrame.style.transform = `scale(${(0.955 + progress * 0.045).toFixed(4)})`;
        }

        const probe = y + window.innerHeight * 0.3;
        let currentId = null;
        for (const section of sections) {
            if (probe >= section.offsetTop) currentId = section.id;
        }
        for (const link of navLinks) {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${currentId}`);
        }

        countUp();
        scrollQueued = false;
    }

    addEventListener('scroll', () => {
        if (scrollQueued) return;
        scrollQueued = true;
        requestAnimationFrame(onScroll);
    }, { passive: true });

    addEventListener('resize', () => { onScroll(); layoutTabIndicator(true); }, { passive: true });

    /* ---------------------------------------------------------
       Stats counter
       --------------------------------------------------------- */

    const counters = $$('[data-count]');
    let counted = false;

    function countUp() {
        if (counted || !counters.length) return;
        const first = counters[0];
        if (first.getBoundingClientRect().top > window.innerHeight - 60) return;

        counted = true;
        const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

        for (const el of counters) {
            const target = parseInt(el.dataset.count, 10);
            const suffix = el.dataset.suffix || '';

            if (reducedMotion) {
                el.textContent = target + suffix;
                continue;
            }

            const start = performance.now();
            const tickCount = (now) => {
                const t = Math.min((now - start) / 1600, 1);
                el.textContent = Math.round(easeOutQuart(t) * target) + suffix;
                if (t < 1) requestAnimationFrame(tickCount);
            };
            requestAnimationFrame(tickCount);
        }
    }

    /* ---------------------------------------------------------
       Scroll reveal
       --------------------------------------------------------- */

    const revealTargets = $$([
        '.section-head', '.card', '.strip-list li', '.step',
        '.tile', '.repair', '.reasons li', '.faq-item',
        '.detail', '.map', '.note', '.brands', '.tabs',
    ].join(','));

    revealTargets.forEach((el, i) => {
        el.classList.add('reveal');
        // Siblings cascade slightly; the delay resets per row so nothing drags.
        el.style.transitionDelay = `${(i % 6) * 45}ms`;
    });

    const revealObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
        }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealTargets.forEach((el) => revealObserver.observe(el));

    /* ---------------------------------------------------------
       Repair tabs
       X and width get their own springs — one spring on a 2D distance
       desynchronises as soon as the two axes differ.
       --------------------------------------------------------- */

    const tabList = $('#repairTabs');
    const indicator = $('.tab-indicator', tabList || document);
    const tabs = $$('.tab', tabList || document);

    const indicatorX = new Spring(0, {
        response: 0.38, damping: 1, precision: 0.2,
        onUpdate: (v) => { if (indicator) indicator.style.transform = `translate3d(${v}px,0,0)`; },
    });

    const indicatorW = new Spring(0, {
        response: 0.38, damping: 1, precision: 0.2,
        onUpdate: (v) => { if (indicator) indicator.style.width = `${v}px`; },
    });

    function layoutTabIndicator(immediate = false) {
        if (!tabList || !indicator) return;
        const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
        if (!active) return;

        const x = active.offsetLeft - tabList.scrollLeft;
        const w = active.offsetWidth;

        if (immediate) {
            indicatorX.set(x);
            indicatorW.set(w);
        } else {
            indicatorX.to(x);
            indicatorW.to(w);
        }
    }

    function selectTab(tab) {
        for (const t of tabs) {
            const selected = t === tab;
            t.setAttribute('aria-selected', String(selected));
            t.classList.toggle('is-selected', selected);
            t.tabIndex = selected ? 0 : -1;

            const panel = document.getElementById(t.getAttribute('aria-controls'));
            if (panel) panel.hidden = !selected;
        }
        layoutTabIndicator();
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const next = tabs[(index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
            selectTab(next);
            next.focus();
        });
    });

    tabList?.addEventListener('scroll', () => layoutTabIndicator(true), { passive: true });

    /* ---------------------------------------------------------
       FAQ
       Height is sprung, so a second click part-way through reverses
       from the height currently on screen.
       --------------------------------------------------------- */

    $$('.faq-item').forEach((item) => {
        const button = $('.faq-q', item);
        const region = $('.faq-a', item);
        const inner = $('.faq-a-inner', item);
        let open = false;

        const spring = new Spring(0, {
            response: 0.4, damping: 1, precision: 0.4,
            onUpdate: (v) => { region.style.height = `${Math.max(0, v)}px`; },
            onRest: () => {
                // Let an open panel size itself again once it has settled,
                // so long text still fits after a resize or font change.
                region.style.height = open ? 'auto' : '0px';
            },
        });

        button.addEventListener('click', () => {
            const current = region.offsetHeight;
            // If we were parked on `auto`, re-seed the spring from the real height.
            if (region.style.height === 'auto') spring.value = current;

            open = !open;
            button.setAttribute('aria-expanded', String(open));
            region.style.height = `${current}px`;
            spring.to(open ? inner.offsetHeight : 0);
        });
    });

    /* ---------------------------------------------------------
       Mobile menu sheet
       Draggable, rubber-banded at the top, thrown closed with
       momentum, and grabbable at any point mid-animation.
       --------------------------------------------------------- */

    const sheet = $('#menuSheet');
    const scrim = $('#menuScrim');
    const menuButton = $('#menuButton');

    if (sheet && scrim && menuButton) {
        let height = 0;
        let isOpen = false;

        const applyY = (y) => {
            sheet.style.transform = `translate3d(0, ${y}px, 0)`;
            const progress = height ? 1 - Math.min(1, Math.max(0, y / height)) : 0;
            scrim.style.opacity = String(progress);
        };

        const sheetY = new Spring(0, {
            response: 0.34, damping: 0.86, precision: 0.3,
            onUpdate: applyY,
            onRest: () => {
                if (!isOpen) {
                    sheet.hidden = true;
                    scrim.hidden = true;
                    document.body.style.overflow = '';
                }
            },
        });

        function measure() {
            height = sheet.offsetHeight;
        }

        function openSheet() {
            if (isOpen) return;
            isOpen = true;
            sheet.hidden = false;
            scrim.hidden = false;
            measure();
            // Start from fully closed unless we're interrupting a close.
            if (sheetY.value === 0) sheetY.value = height;
            applyY(sheetY.value);
            document.body.style.overflow = 'hidden';
            menuButton.setAttribute('aria-expanded', 'true');
            sheetY.to(0);
            if (reducedMotion) applyY(0);
        }

        function closeSheet(velocity) {
            if (!isOpen) return;
            isOpen = false;
            menuButton.setAttribute('aria-expanded', 'false');
            measure();
            sheetY.to(height, velocity);
        }

        menuButton.addEventListener('click', () => (isOpen ? closeSheet() : openSheet()));
        scrim.addEventListener('click', () => closeSheet());

        // Tapping a link closes the sheet, then the browser handles the hash.
        $$('a', sheet).forEach((link) => link.addEventListener('click', () => closeSheet()));

        addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeSheet();
                menuButton.focus();
            }
        });

        // --- the gesture ---
        const GRAB_THRESHOLD = 6;   // px before we commit to a drag
        const FLICK = 420;          // px/s that counts as a throw

        let pointerId = null;
        let startY = 0;
        let grabOffset = 0;
        let dragging = false;
        const velocity = tracker();

        sheet.addEventListener('pointerdown', (e) => {
            // Deliberately keyed off visibility rather than `isOpen`: a sheet
            // that is already animating closed must still be grabbable, and
            // must carry on from wherever it is on screen.
            if (sheet.hidden || pointerId !== null) return;

            pointerId = e.pointerId;
            startY = e.clientY;
            // Respect where the finger actually landed, and take over from the
            // spring's live value rather than from its target.
            grabOffset = e.clientY - sheetY.value;
            dragging = false;
            velocity.reset();
            velocity.add(sheetY.value);
        });

        sheet.addEventListener('pointermove', (e) => {
            if (e.pointerId !== pointerId) return;

            if (!dragging) {
                if (Math.abs(e.clientY - startY) < GRAB_THRESHOLD) return;
                dragging = true;
                // Capture so tracking survives the pointer leaving the sheet.
                try { sheet.setPointerCapture(pointerId); } catch (err) { /* pointer already gone */ }
                sheetY.stop();   // the finger owns the value now

                // Caught it on the way out: it is open again until released.
                if (!isOpen) {
                    isOpen = true;
                    scrim.hidden = false;
                    document.body.style.overflow = 'hidden';
                    menuButton.setAttribute('aria-expanded', 'true');
                }
                if (!height) measure();
            }

            let y = e.clientY - grabOffset;
            // Above the open position, resist instead of letting it fly up.
            if (y < 0) y = -rubberband(-y, height || window.innerHeight);

            sheetY.value = y;
            velocity.add(y);
            applyY(y);
        });

        const endDrag = (e) => {
            if (e.pointerId !== pointerId) return;

            const wasDragging = dragging;
            pointerId = null;
            dragging = false;

            if (!wasDragging) return;

            const v = velocity.velocity();
            // Where would this flick come to rest if nothing stopped it?
            const projected = sheetY.value + project(v);
            const shouldClose = v > FLICK || (v > -FLICK && projected > height * 0.4);

            // Hand the finger's velocity straight to the spring so there's
            // no seam between dragging and animating.
            if (shouldClose) closeSheet(v);
            else sheetY.to(0, v);
        };

        sheet.addEventListener('pointerup', endDrag);
        sheet.addEventListener('pointercancel', endDrag);

        addEventListener('resize', () => {
            if (!isOpen) return;
            measure();
            if (!live.has(sheetY)) applyY(sheetY.value);
        }, { passive: true });
    }

    /* ---------------------------------------------------------
       Smooth anchor scrolling
       --------------------------------------------------------- */

    $$('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (!href || href.length < 2) return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - 16;
            window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
        });
    });

    /* ---------------------------------------------------------
       Repair request form
       Nothing is stored or transmitted by this site — the buttons
       only compose a message the visitor sends themselves.
       --------------------------------------------------------- */

    const form = $('#repairForm');

    if (form) {
        const showError = (field, message) => {
            field.closest('.field').classList.toggle('is-invalid', Boolean(message));
            const slot = form.querySelector(`[data-error-for="${field.id}"]`);
            if (slot) slot.textContent = message || '';
        };

        $$('input, select, textarea', form).forEach((field) => {
            const clear = () => showError(field, '');
            field.addEventListener('input', clear);
            field.addEventListener('change', clear);
        });

        /** Returns the message body, or null when something is missing. */
        const collect = () => {
            const { name, phone, device, model, issue } = form.elements;
            let firstInvalid = null;

            const check = (field, ok, message) => {
                showError(field, ok ? '' : message);
                if (!ok && !firstInvalid) firstInvalid = field;
            };

            check(name, name.value.trim().length >= 2, 'Please tell us your name.');
            check(phone, phone.value.replace(/\D/g, '').length >= 6, 'Please add a number we can reach you on.');
            check(device, device.value !== '', 'Please choose a device type.');
            check(issue, issue.value.trim().length >= 10, 'A few more words about the problem, please.');

            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
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

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const body = collect();
            if (!body) return;

            const text = encodeURIComponent(`Repair request — DGDsmart\n\n${body}`);
            window.open(`https://wa.me/${SHOP.whatsapp}?text=${text}`, '_blank', 'noopener');
        });

        $('#sendByEmail')?.addEventListener('click', () => {
            const body = collect();
            if (!body) return;

            const subject = encodeURIComponent('Repair request — DGDsmart');
            window.location.href = `mailto:${SHOP.email}?subject=${subject}&body=${encodeURIComponent(body)}`;
        });
    }

    /* ---------------------------------------------------------
       Open / closed badge, on the shop's clock rather than the
       visitor's.
       --------------------------------------------------------- */

    const status = $('#openStatus');

    if (status) {
        try {
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: SHOP.timeZone,
                weekday: 'short',
                hour: '2-digit',
                hour12: false,
            }).formatToParts(new Date());

            const part = (type) => parts.find((p) => p.type === type)?.value;
            const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part('weekday'));
            const hour = parseInt(part('hour'), 10);

            const open = SHOP.openDays.includes(day) && hour >= SHOP.openHour && hour < SHOP.closeHour;

            status.textContent = open ? 'Open now' : 'Closed';
            status.classList.add(open ? 'is-open' : 'is-closed');
            status.hidden = false;
        } catch (e) {
            // Browser without full Intl time zone data — leave the badge hidden.
        }
    }

    /* ---------------------------------------------------------
       Boot
       --------------------------------------------------------- */

    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    layoutTabIndicator(true);
    // Fonts change tab widths, so re-measure once they land.
    document.fonts?.ready.then(() => layoutTabIndicator(true));
    onScroll();
})();
