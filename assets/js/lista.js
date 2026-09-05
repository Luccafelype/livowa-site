// ----- Config -----
        const SUPABASE_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';
        const POLL_INTERVAL_MS = 30000;

        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // ----- Token extraction -----
        // URL patterns supported:
        //   /lista/{token}          (canonical)
        //   /lista/?token={token}   (fallback used by 404.html redirect)
        //   /lista/index.html?token={token}
        function extractToken() {
            const qs = new URLSearchParams(location.search);
            const fromQuery = qs.get('token');
            if (fromQuery) return fromQuery.trim();

            // Pathname pattern: /lista/{token} (last non-empty segment after "lista")
            const parts = location.pathname.split('/').filter(Boolean);
            const idx = parts.indexOf('lista');
            if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'index.html') {
                return parts[idx + 1];
            }
            return null;
        }

        const token = extractToken();

        // ----- DOM helpers -----
        const $content = document.getElementById('lc-content');
        const $progressBar = document.getElementById('lc-progress-bar');
        const $progressText = document.getElementById('lc-progress-text');
        const $subtitle = document.getElementById('lc-subtitle');
        const $refreshBtn = document.getElementById('lc-refresh');

        function escapeHtml(s) {
            return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }

        function showError(msg) {
            $content.innerHTML = `<div class="lc-error">${escapeHtml(msg)}</div>`;
            $progressText.textContent = '';
            $progressBar.style.width = '0%';
        }

        // ----- State -----
        let listaId = null;
        let itens = [];
        let marcados = new Set();

        // ----- Render -----
        function render() {
            if (!itens || itens.length === 0) {
                $content.innerHTML = '<div class="lc-card"><div class="lc-empty">Esta lista está vazia.</div></div>';
                $progressText.textContent = 'Sem itens.';
                $progressBar.style.width = '0%';
                return;
            }

            // Group by section
            const groupOrder = ['Hortifruti', 'Açougue', 'Peixaria', 'Frios', 'Laticínios', 'Mercearia', 'Bebidas', 'Outros', 'Variar', 'Recompensa'];
            const groups = {};
            for (const item of itens) {
                const sec = item.secao || 'Outros';
                if (!groups[sec]) groups[sec] = [];
                groups[sec].push(item);
            }

            const orderedSecs = Object.keys(groups).sort((a, b) => {
                const ia = groupOrder.indexOf(a);
                const ib = groupOrder.indexOf(b);
                return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
            });

            const checkedCount = itens.filter(i => marcados.has(i.alimento_id)).length;
            const pct = itens.length > 0 ? (checkedCount / itens.length) * 100 : 0;
            $progressBar.style.width = pct + '%';
            $progressText.textContent = `${checkedCount} de ${itens.length} marcados`;

            const html = orderedSecs.map(sec => {
                const items = groups[sec];
                const isExtra = sec === 'Variar' || sec === 'Recompensa';
                const badge = isExtra ? `<span class="lc-badge">${escapeHtml(sec)}</span>` : '';
                const title = isExtra ? sec : sec;
                return `
                    <div class="lc-card">
                        <div class="lc-section-title">${escapeHtml(title)} ${badge}</div>
                        ${items.map(item => {
                            const checked = marcados.has(item.alimento_id);
                            const qty = item.medida_caseira || (item.comprar_g ? `${Math.round(item.comprar_g)} g` : '');
                            return `
                                <div class="lc-item ${checked ? 'checked' : ''}" data-id="${escapeHtml(item.alimento_id)}">
                                    <button class="lc-checkbox ${checked ? 'checked' : ''}" data-toggle="${escapeHtml(item.alimento_id)}" aria-label="Marcar ${escapeHtml(item.nome)}"></button>
                                    <div class="lc-item-body">
                                        <div class="lc-item-name">${escapeHtml(item.nome)}</div>
                                        ${qty ? `<div class="lc-item-meta">${escapeHtml(qty)}</div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }).join('');

            $content.innerHTML = html;

            // Attach handlers
            $content.querySelectorAll('[data-toggle]').forEach(btn => {
                btn.addEventListener('click', () => toggleItem(btn.dataset.toggle, btn));
            });
        }

        // ----- Toggle item -----
        async function toggleItem(alimentoId, btnEl) {
            const wasMarked = marcados.has(alimentoId);
            const newValue = !wasMarked;

            // Optimistic UI
            if (newValue) marcados.add(alimentoId);
            else marcados.delete(alimentoId);
            render();
            btnEl.disabled = true;

            try {
                // Upsert (insert or update)
                const { error } = await client
                    .from('lista_compartilhada_marcacao')
                    .upsert({
                        lista_id: listaId,
                        alimento_id: alimentoId,
                        marcado: newValue,
                        marcado_at: new Date().toISOString()
                    }, { onConflict: 'lista_id,alimento_id' });

                if (error) {
                    // Rollback
                    if (newValue) marcados.delete(alimentoId);
                    else marcados.add(alimentoId);
                    render();
                    console.warn('toggle error:', error);
                    alert('Não foi possível salvar. Tente novamente.');
                }
            } catch (err) {
                if (newValue) marcados.delete(alimentoId);
                else marcados.add(alimentoId);
                render();
                console.warn('toggle exception:', err);
            } finally {
                btnEl.disabled = false;
            }
        }

        // ----- Load lista + marcacoes -----
        async function loadAll() {
            if (!token) {
                showError('Link inválido. Faltou o token na URL.');
                return;
            }

            // Naive UUID v4-ish format check
            if (!/^[0-9a-f-]{32,36}$/i.test(token)) {
                showError('Link inválido (token mal formado).');
                return;
            }

            try {
                const { data: lista, error: listaErr } = await client
                    .from('lista_compartilhada')
                    .select('id, token, itens, expira_em, created_at')
                    .eq('token', token)
                    .maybeSingle();

                if (listaErr) {
                    showError('Erro ao carregar lista: ' + listaErr.message);
                    return;
                }
                if (!lista) {
                    showError('Link não encontrado ou expirado. Peça uma lista nova.');
                    return;
                }

                listaId = lista.id;
                itens = Array.isArray(lista.itens) ? lista.itens : [];

                // Subtitle: created_at relative
                try {
                    const created = new Date(lista.created_at);
                    const expira = new Date(lista.expira_em);
                    const diasRestantes = Math.max(0, Math.ceil((expira - new Date()) / 86400000));
                    $subtitle.textContent = `via Livowa · expira em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`;
                } catch {}

                // Fetch marcacoes
                const { data: marcs, error: marcsErr } = await client
                    .from('lista_compartilhada_marcacao')
                    .select('alimento_id, marcado')
                    .eq('lista_id', lista.id);

                if (!marcsErr && Array.isArray(marcs)) {
                    marcados = new Set(marcs.filter(m => m.marcado).map(m => m.alimento_id));
                }

                render();
            } catch (err) {
                showError('Erro inesperado: ' + (err.message || err));
            }
        }

        // ----- Lightweight polling (only when tab visible) -----
        let pollTimer = null;
        function startPolling() {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = setInterval(() => {
                if (!document.hidden && listaId) refreshMarcacoes();
            }, POLL_INTERVAL_MS);
        }

        async function refreshMarcacoes() {
            if (!listaId) return;
            try {
                const { data, error } = await client
                    .from('lista_compartilhada_marcacao')
                    .select('alimento_id, marcado')
                    .eq('lista_id', listaId);
                if (!error && Array.isArray(data)) {
                    const next = new Set(data.filter(m => m.marcado).map(m => m.alimento_id));
                    // Only re-render if changed
                    if (next.size !== marcados.size || [...next].some(x => !marcados.has(x))) {
                        marcados = next;
                        render();
                    }
                }
            } catch (e) {
                // ignore
            }
        }

        $refreshBtn.addEventListener('click', () => {
            $refreshBtn.disabled = true;
            $refreshBtn.textContent = 'Atualizando...';
            refreshMarcacoes().finally(() => {
                $refreshBtn.disabled = false;
                $refreshBtn.textContent = 'Atualizar';
            });
        });

        // Boot
        loadAll().then(startPolling);
