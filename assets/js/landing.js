(function () {
        'use strict';
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* ── Nav: estado ao rolar ── */
        var nav = document.querySelector('.site-nav');
        function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 24); }
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        /* ── Título: quebra em palavras animadas (preserva o <em>) ── */
        var title = document.querySelector('.lp-title');
        if (title && !reduceMotion) {
            var i = 0;
            var frag = document.createDocumentFragment();
            Array.prototype.slice.call(title.childNodes).forEach(function (node) {
                if (node.nodeType === 3) {
                    node.textContent.split(/(\s+)/).forEach(function (tok) {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
                        var s = document.createElement('span');
                        s.className = 'w';
                        s.style.setProperty('--i', i++);
                        s.textContent = tok;
                        frag.appendChild(s);
                    });
                } else {
                    var s = document.createElement('span');
                    s.className = 'w';
                    s.style.setProperty('--i', i++);
                    s.appendChild(node.cloneNode(true));
                    frag.appendChild(s);
                }
            });
            title.textContent = '';
            title.appendChild(frag);
        }

        /* ── Reveal on scroll ── */
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                });
            }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
            document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
        } else {
            document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
        }

        /* ── Tilt 3D do destaque do hero (só ponteiro fino) ── */
        var tiltWrap = document.querySelector('.hero-shot');
        var tiltEl = document.querySelector('.hero-shot .tilt');
        if (tiltEl && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
            tiltWrap.addEventListener('pointermove', function (e) {
                var r = tiltWrap.getBoundingClientRect();
                var px = (e.clientX - r.left) / r.width - 0.5;
                var py = (e.clientY - r.top) / r.height - 0.5;
                tiltEl.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
                tiltEl.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
            });
            tiltWrap.addEventListener('pointerleave', function () {
                tiltEl.style.setProperty('--ry', '0deg');
                tiltEl.style.setProperty('--rx', '0deg');
            });
        }

        /* ── Galeria: setas ── */
        var gallery = document.getElementById('gallery');
        if (gallery) {
            var step = function () {
                var card = gallery.querySelector('.shot-card');
                return card ? card.getBoundingClientRect().width + 24 : 320;
            };
            document.querySelectorAll('.gallery-arrow').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    gallery.scrollBy({
                        left: btn.classList.contains('next') ? step() : -step(),
                        behavior: reduceMotion ? 'auto' : 'smooth'
                    });
                });
            });
        }

        /* ── Canvas: partículas orgânicas no hero ── */
        var canvas = document.getElementById('hero-canvas');
        if (canvas && !reduceMotion) {
            var ctx = canvas.getContext('2d');
            var W = 0, H = 0, parts = [], raf = null;
            var mx = 0.5, my = 0.5;

            function spawn(fromBottom) {
                var z = 0.35 + Math.random() * 0.65;
                return {
                    x: Math.random() * W,
                    y: fromBottom ? H + 12 : Math.random() * H,
                    z: z,
                    r: (0.7 + Math.random() * 1.7) * z,
                    vy: (0.12 + Math.random() * 0.30) * z,
                    drift: Math.random() * Math.PI * 2,
                    ds: 0.008 + Math.random() * 0.012,
                    a: (0.22 + Math.random() * 0.45) * z,
                    green: Math.random() < 0.85
                };
            }

            function resize() {
                var dpr = Math.min(2, window.devicePixelRatio || 1);
                W = canvas.clientWidth;
                H = canvas.clientHeight;
                canvas.width = W * dpr;
                canvas.height = H * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                var count = Math.min(80, Math.round(W * H / 16000));
                parts = [];
                for (var k = 0; k < count; k++) parts.push(spawn(false));
            }

            function tick() {
                ctx.clearRect(0, 0, W, H);
                for (var k = 0; k < parts.length; k++) {
                    var p = parts[k];
                    p.y -= p.vy;
                    p.drift += p.ds;
                    if (p.y < -12) parts[k] = p = spawn(true);
                    var x = p.x + Math.sin(p.drift) * 14 + (mx - 0.5) * 30 * p.z;
                    var y = p.y + (my - 0.5) * 18 * p.z;
                    ctx.beginPath();
                    ctx.arc(x, y, p.r, 0, 6.2832);
                    ctx.fillStyle = p.green
                        ? 'rgba(45,240,190,' + p.a.toFixed(3) + ')'
                        : 'rgba(243,246,249,' + (p.a * 0.8).toFixed(3) + ')';
                    ctx.fill();
                }
                raf = window.requestAnimationFrame(tick);
            }

            window.addEventListener('pointermove', function (e) {
                mx = e.clientX / window.innerWidth;
                my = e.clientY / window.innerHeight;
            }, { passive: true });

            window.addEventListener('resize', resize, { passive: true });

            document.addEventListener('visibilitychange', function () {
                if (document.hidden) {
                    if (raf) window.cancelAnimationFrame(raf);
                    raf = null;
                } else if (!raf) {
                    tick();
                }
            });

            resize();
            tick();
        }
    })();
