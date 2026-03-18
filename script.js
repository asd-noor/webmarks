document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('webmark-container');
    const exportBrowserBtn = document.getElementById('export-browser-btn');
    const exportBtn = document.getElementById('export-btn');
    const triggerImportBtn = document.getElementById('trigger-import-btn');
    const importFile = document.getElementById('import-file');
    const searchInput = document.getElementById('search-input');
    const untaggedBtn = document.getElementById('untagged-btn');
    const searchModeBtn = document.getElementById('search-mode-btn');
    let showUntagged = false;

    // Search mode: 'tags' | 'title'
    const MODES = ['tags', 'title'];
    const PLACEHOLDERS = {
        tags:  'Filter by tag... | / history | > chrome:// | !bang | : url',
        title: 'Filter by title... | / history | > chrome:// | !bang | : url',
    };
    let searchMode = 'tags';

    function setSearchMode(mode) {
        searchMode = mode;
        searchModeBtn.dataset.mode = mode;
        searchModeBtn.textContent = mode;
        searchInput.placeholder = PLACEHOLDERS[mode];
        loadAndRender();
    }

    searchModeBtn.addEventListener('click', () => {
        const next = MODES[(MODES.indexOf(searchMode) + 1) % MODES.length];
        setSearchMode(next);
        searchInput.focus();
    });

    // 1. Initial Load
    loadAndRender();

    // Chromium/Brave deliberately prevent new tab pages from stealing focus from
    // the address bar. The only workaround: if we're not already on a ?f URL,
    // redirect to ourselves with a query param — that navigation is treated as a
    // real page load which allows focus() to succeed.
    if (location.search !== '?f') {
        location.search = '?f';
    } else {
        searchInput.focus();
    }

    // History suggestion dropdown (/ prefix) and chrome:// suggestion dropdown (> prefix)
    const historySuggestions = document.getElementById('history-suggestions');
    let historyItems = [];
    let historySelectedIdx = -1;

    // Static list of chrome:// pages with friendly titles
    // Sourced from chrome://chrome-urls (Chrome 139 Canary) and Chromium source.
    // Ordered: everyday → settings → developer/internals → account → debug
    const CHROME_URLS = [
        // ── Everyday ──────────────────────────────────────────────────────────
        { url: 'chrome://newtab',                       title: 'New Tab' },
        { url: 'chrome://history',                      title: 'History' },
        { url: 'chrome://bookmarks',                    title: 'Bookmarks' },
        { url: 'chrome://downloads',                    title: 'Downloads' },
        { url: 'chrome://extensions',                   title: 'Extensions' },
        { url: 'chrome://extensions/shortcuts',         title: 'Extensions — Keyboard Shortcuts' },
        { url: 'chrome://extensions-internals',         title: 'Extensions Internals' },
        { url: 'chrome://apps',                         title: 'Apps' },
        { url: 'chrome://flags',                        title: 'Flags (Experiments)' },
        { url: 'chrome://password-manager',             title: 'Password Manager' },
        { url: 'chrome://print',                        title: 'Print Preview' },
        { url: 'chrome://dino',                         title: 'Dino Game' },
        { url: 'chrome://feedback',                     title: 'Send Feedback' },
        { url: 'chrome://whats-new',                    title: "What's New" },
        { url: 'chrome://credits',                      title: 'Credits' },
        { url: 'chrome://terms',                        title: 'Terms of Service' },
        { url: 'chrome://version',                      title: 'Version / About' },
        { url: 'chrome://help',                         title: 'Help & Updates' },
        { url: 'chrome://about',                        title: 'About (all internal URLs)' },
        { url: 'chrome://chrome-urls',                  title: 'All Chrome URLs' },

        // ── Settings ──────────────────────────────────────────────────────────
        { url: 'chrome://settings',                     title: 'Settings' },
        { url: 'chrome://settings/appearance',          title: 'Settings — Appearance' },
        { url: 'chrome://settings/autofill',            title: 'Settings — Autofill' },
        { url: 'chrome://settings/content',             title: 'Settings — Content' },
        { url: 'chrome://settings/cookies',             title: 'Settings — Cookies' },
        { url: 'chrome://settings/downloads',           title: 'Settings — Downloads' },
        { url: 'chrome://settings/languages',           title: 'Settings — Languages' },
        { url: 'chrome://settings/onStartup',           title: 'Settings — On Startup' },
        { url: 'chrome://settings/passwords',           title: 'Settings — Passwords' },
        { url: 'chrome://settings/payments',            title: 'Settings — Payment Methods' },
        { url: 'chrome://settings/performance',         title: 'Settings — Performance' },
        { url: 'chrome://settings/privacy',             title: 'Settings — Privacy & Security' },
        { url: 'chrome://settings/reset',               title: 'Settings — Reset' },
        { url: 'chrome://settings/safetyCheck',         title: 'Settings — Safety Check' },
        { url: 'chrome://settings/search',              title: 'Settings — Search Engine' },
        { url: 'chrome://settings/security',            title: 'Settings — Security' },
        { url: 'chrome://settings/syncSetup',           title: 'Settings — Sync' },
        { url: 'chrome://settings/system',              title: 'Settings — System' },

        // ── Developer / Network ───────────────────────────────────────────────
        { url: 'chrome://inspect',                      title: 'Inspect (DevTools targets)' },
        { url: 'chrome://net-internals',                title: 'Net Internals' },
        { url: 'chrome://net-internals/#dns',           title: 'Net Internals — DNS' },
        { url: 'chrome://net-internals/#hsts',          title: 'Net Internals — HSTS' },
        { url: 'chrome://net-internals/#proxy',         title: 'Net Internals — Proxy' },
        { url: 'chrome://net-internals/#sockets',       title: 'Net Internals — Sockets' },
        { url: 'chrome://net-export',                   title: 'Net Export (save network log)' },
        { url: 'chrome://network-errors',               title: 'Network Error Codes' },
        { url: 'chrome://tracing',                      title: 'Tracing' },
        { url: 'chrome://webrtc-internals',             title: 'WebRTC Internals' },
        { url: 'chrome://webrtc-logs',                  title: 'WebRTC Logs' },
        { url: 'chrome://serviceworker-internals',      title: 'Service Worker Internals' },
        { url: 'chrome://indexeddb-internals',          title: 'IndexedDB Internals' },
        { url: 'chrome://blob-internals',               title: 'Blob Internals' },
        { url: 'chrome://quota-internals',              title: 'Quota Internals' },
        { url: 'chrome://process-internals',            title: 'Process Internals (site isolation)' },
        { url: 'chrome://usb-internals',                title: 'USB Internals' },

        // ── Performance / System ──────────────────────────────────────────────
        { url: 'chrome://gpu',                          title: 'GPU Info' },
        { url: 'chrome://memory-internals',             title: 'Memory Internals' },
        { url: 'chrome://discards',                     title: 'Tab Discards' },
        { url: 'chrome://histograms',                   title: 'Histograms (page load stats)' },
        { url: 'chrome://metrics-internals',            title: 'Metrics Internals (UMA)' },
        { url: 'chrome://ukm',                          title: 'UKM (URL-Keyed Metrics)' },
        { url: 'chrome://system',                       title: 'System Info (OS / resources)' },
        { url: 'chrome://sandbox',                      title: 'Sandbox Status' },
        { url: 'chrome://conflicts',                    title: 'Module Conflicts' },
        { url: 'chrome://components',                   title: 'Components' },

        // ── Privacy / Security ────────────────────────────────────────────────
        { url: 'chrome://safe-browsing',                title: 'Safe Browsing' },
        { url: 'chrome://certificate-manager',          title: 'Certificate Manager' },
        { url: 'chrome://view-cert',                    title: 'View Certificate' },
        { url: 'chrome://policy',                       title: 'Policy (Group Policy / MDM)' },
        { url: 'chrome://management',                   title: 'Management (is this browser managed?)' },
        { url: 'chrome://privacy-sandbox-internals',    title: 'Privacy Sandbox Internals' },
        { url: 'chrome://topics-internals',             title: 'Topics API Internals' },
        { url: 'chrome://attribution-internals',        title: 'Attribution Reporting Internals' },
        { url: 'chrome://private-aggregation-internals', title: 'Private Aggregation Internals' },

        // ── Media / Bluetooth / Devices ───────────────────────────────────────
        { url: 'chrome://media-internals',              title: 'Media Internals' },
        { url: 'chrome://media-engagement',             title: 'Media Engagement' },
        { url: 'chrome://bluetooth-internals',          title: 'Bluetooth Internals' },
        { url: 'chrome://device-log',                   title: 'Device Log' },

        // ── Sync / Account ────────────────────────────────────────────────────
        { url: 'chrome://sync-internals',               title: 'Sync Internals' },
        { url: 'chrome://signin-internals',             title: 'Sign-in Internals' },
        { url: 'chrome://identity-internals',           title: 'Identity Token Internals' },
        { url: 'chrome://gcm-internals',                title: 'GCM (Push Messaging) Internals' },

        // ── AI / Lens / Translate ─────────────────────────────────────────────
        { url: 'chrome://translate-internals',          title: 'Translate Internals' },
        { url: 'chrome://on-device-translation-internals', title: 'On-Device Translation Internals' },
        { url: 'chrome://on-device-internals',          title: 'On-Device AI Internals' },
        { url: 'chrome://optimization-guide-internals', title: 'Optimization Guide Internals' },
        { url: 'chrome://suggest-internals',            title: 'Suggest / Autocomplete Internals' },
        { url: 'chrome://omnibox',                      title: 'Omnibox (address bar debug)' },

        // ── History / NTP ─────────────────────────────────────────────────────
        { url: 'chrome://ntp-tiles-internals',          title: 'NTP Tiles Internals (Top Sites)' },
        { url: 'chrome://predictors',                   title: 'Predictors (autocomplete & prefetch)' },
        { url: 'chrome://site-engagement',              title: 'Site Engagement Scores' },
        { url: 'chrome://history-clusters-internals',   title: 'History Clusters Internals' },

        // ── Web App / PWA ─────────────────────────────────────────────────────
        { url: 'chrome://web-app-internals',            title: 'Web App Internals (PWA)' },
        { url: 'chrome://app-service-internals',        title: 'App Service Internals' },

        // ── Misc Internals ────────────────────────────────────────────────────
        { url: 'chrome://accessibility',                title: 'Accessibility' },
        { url: 'chrome://autofill-internals',           title: 'Autofill Internals' },
        { url: 'chrome://password-manager-internals',   title: 'Password Manager Internals' },
        { url: 'chrome://download-internals',           title: 'Download Internals' },
        { url: 'chrome://local-state',                  title: 'Local State (browser prefs JSON)' },
        { url: 'chrome://prefs-internals',              title: 'Prefs Internals (all preferences JSON)' },
        { url: 'chrome://crashes',                      title: 'Crashes' },
        { url: 'chrome://invalidations',                title: 'Invalidations Debug' },
        { url: 'chrome://user-actions',                 title: 'User Actions Log' },
        { url: 'chrome://segmentation-internals',       title: 'Segmentation Internals' },
        { url: 'chrome://commerce-internals',           title: 'Commerce / Shopping Internals' },
        { url: 'chrome://internals',                    title: 'Internals Hub' },
        { url: 'chrome://support-tool',                 title: 'Support Tool (diagnostics export)' },
        { url: 'chrome://webui-gallery',                title: 'WebUI Component Gallery' },
        { url: 'chrome://interstitials',                title: 'Interstitials (SSL / captive portal previews)' },

        // ── Debug (crash/hang triggers — use with care) ───────────────────────
        { url: 'chrome://restart',                      title: 'Restart Chrome' },
        { url: 'chrome://quit',                         title: 'Quit Chrome' },
        { url: 'chrome://crash',                        title: 'DEBUG: Trigger renderer crash' },
        { url: 'chrome://kill',                         title: 'DEBUG: Kill renderer process' },
        { url: 'chrome://hang',                         title: 'DEBUG: Trigger browser hang' },
        { url: 'chrome://gpucrash',                     title: 'DEBUG: Trigger GPU process crash' },
    ];

    function showHistorySuggestions(items) {
        historyItems = items;
        historySelectedIdx = -1;
        historySuggestions.innerHTML = '';
        if (items.length === 0) {
            historySuggestions.hidden = true;
            return;
        }
        items.forEach((item, i) => {
            const li = document.createElement('li');
            li.dataset.idx = i;
            const titleSpan = document.createElement('span');
            titleSpan.className = 'hs-title';
            titleSpan.textContent = item.title || item.url;
            const urlSpan = document.createElement('span');
            urlSpan.className = 'hs-url';
            urlSpan.textContent = item.url;
            li.appendChild(titleSpan);
            li.appendChild(urlSpan);
            li.addEventListener('mousedown', (e) => {
                e.preventDefault(); // keep input focused
                chrome.tabs.getCurrent(tab => chrome.tabs.update(tab.id, { url: item.url }));
            });
            li.addEventListener('mousemove', () => {
                setHistoryActive(i);
            });
            historySuggestions.appendChild(li);
        });
        historySuggestions.hidden = false;
    }

    function hideHistorySuggestions() {
        historySuggestions.hidden = true;
        historyItems = [];
        historySelectedIdx = -1;
    }

    function setHistoryActive(idx) {
        const lis = historySuggestions.querySelectorAll('li');
        lis.forEach(li => li.classList.remove('active'));
        historySelectedIdx = idx;
        if (idx >= 0 && idx < lis.length) {
            lis[idx].classList.add('active');
            lis[idx].scrollIntoView({ block: 'nearest' });
        }
    }

    function updateHistorySuggestions() {
        const val = searchInput.value;
        if (val.startsWith('> ')) {
            const query = val.slice(2).trim().toLowerCase();
            const matches = query
                ? CHROME_URLS.filter(item =>
                    item.url.includes(query) || item.title.toLowerCase().includes(query))
                : CHROME_URLS.slice(0, 10);
            showHistorySuggestions(matches);
            return;
        }
        if (!val.startsWith('/ ')) {
            hideHistorySuggestions();
            return;
        }
        const query = val.slice(2).trim();
        chrome.history.search({ text: query, maxResults: 10 }, (results) => {
            showHistorySuggestions(results);
        });
    }

    // 2. Search/filter
    searchInput.addEventListener('input', () => {
        loadAndRender();
        updateHistorySuggestions();
    });

    searchInput.addEventListener('keydown', (e) => {
        // Tab switches search mode
        if (e.key === 'Tab') {
            e.preventDefault();
            const next = MODES[(MODES.indexOf(searchMode) + 1) % MODES.length];
            setSearchMode(next);
            return;
        }

        // Handle history suggestion navigation
        if (!historySuggestions.hidden) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHistoryActive(Math.min(historySelectedIdx + 1, historyItems.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHistoryActive(Math.max(historySelectedIdx - 1, 0));
                return;
            }
            if (e.key === 'Escape') {
                hideHistorySuggestions();
                return;
            }
            if (e.key === 'Enter' && historySelectedIdx >= 0) {
                e.preventDefault();
                const selected = historyItems[historySelectedIdx];
                chrome.tabs.getCurrent(tab => chrome.tabs.update(tab.id, { url: selected.url }));
                return;
            }
        }

        if (e.key !== 'Enter') return;
        const val = searchInput.value.trim();
        if (val.startsWith('> ')) {
            // Navigate to top chrome:// suggestion if available
            if (historyItems.length > 0) {
                chrome.tabs.getCurrent(tab => chrome.tabs.update(tab.id, { url: historyItems[0].url }));
            }
        } else if (val.startsWith('/ ')) {
            // Navigate to top history suggestion if available, else do nothing
            if (historyItems.length > 0) {
                chrome.tabs.getCurrent(tab => chrome.tabs.update(tab.id, { url: historyItems[0].url }));
            }
        } else if (val.startsWith(': ')) {
            const raw = val.slice(2).trim();
            let url;
            if (/^\w+:\/\//.test(raw)) {
                url = raw;
            } else if (raw.startsWith('/')) {
                url = 'file://' + raw;
            } else {
                url = 'https://' + raw;
            }
            chrome.tabs.getCurrent(tab => chrome.tabs.update(tab.id, { url }));
        } else if (val.startsWith('!')) {
            location.href = 'https://duckduckgo.com/?q=' + encodeURIComponent(val);
        }
    });

    searchInput.addEventListener('blur', () => hideHistorySuggestions());

    // Untagged toggle
    untaggedBtn.addEventListener('click', () => {
        showUntagged = !showUntagged;
        untaggedBtn.classList.toggle('active', showUntagged);
        loadAndRender();
    });

    // 3. Delete / Edit / Pin webmark (Event Delegation)
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const idToDelete = e.target.dataset.id;
            chrome.storage.local.get(['webmarks'], (result) => {
                let webmarks = result.webmarks || [];
                webmarks = webmarks.filter(w => w.id !== idToDelete);
                chrome.storage.local.set({ webmarks }, () => loadAndRender());
            });
        }

        if (e.target.classList.contains('pin-btn')) {
            const id = e.target.dataset.id;
            chrome.storage.local.get(['webmarks'], (result) => {
                const webmarks = (result.webmarks || []).map(w =>
                    w.id === id ? { ...w, pinned: !w.pinned } : w
                );
                chrome.storage.local.set({ webmarks }, () => loadAndRender());
            });
        }

        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            const item = e.target.closest('.webmark-item');
            chrome.storage.local.get(['webmarks'], (result) => {
                const webmark = (result.webmarks || []).find(w => w.id === id);
                if (!webmark) return;
                item.classList.add('editing');
                item.innerHTML = `
                    <input class="edit-title" type="text" value="${escapeAttr(webmark.title)}">
                    <input class="edit-url" type="url" value="${escapeAttr(webmark.url)}">
                    <input class="edit-tags" type="text" value="${escapeAttr(webmark.tags.join(', '))}">
                    <button class="save-btn" data-id="${id}">save</button>
                    <button class="cancel-btn" data-id="${id}">cancel</button>
                `;
            });
        }

        if (e.target.classList.contains('cancel-btn')) {
            loadAndRender();
        }

        if (e.target.classList.contains('save-btn')) {
            const id = e.target.dataset.id;
            const item = e.target.closest('.webmark-item');
            const updatedTitle = item.querySelector('.edit-title').value.trim();
            const updatedUrl = item.querySelector('.edit-url').value.trim();
            const updatedTags = sanitizeTags(item.querySelector('.edit-tags').value.split(',').map(t => t.trim()).filter(Boolean));
            if (!updatedTitle || !updatedUrl) return;
            chrome.storage.local.get(['webmarks'], (result) => {
                const webmarks = (result.webmarks || []).map(w =>
                    w.id === id ? { ...w, title: updatedTitle, url: updatedUrl, tags: updatedTags } : w
                );
                chrome.storage.local.set({ webmarks }, () => loadAndRender());
            });
        }
    });

    // 4. Export to Browser Bookmarks
    exportBrowserBtn.addEventListener('click', () => {
        chrome.storage.local.get(['webmarks'], (result) => {
            const webmarks = result.webmarks || [];

            // Search for an existing 'Webmarks' folder anywhere in the bookmark tree
            chrome.bookmarks.search({ title: 'Webmarks' }, (found) => {
                const existing = found.filter(n => !n.url); // folders have no url

                function createFolderAndPopulate() {
                    chrome.bookmarks.create({ parentId: '1', title: 'Webmarks' }, (folder) => {
                        webmarks.forEach(w => {
                            chrome.bookmarks.create({ parentId: folder.id, title: w.title, url: w.url });
                        });
                        alert(`Exported ${webmarks.length} bookmark(s) to the "Webmarks" folder.`);
                    });
                }

                if (existing.length === 0) {
                    createFolderAndPopulate();
                } else {
                    // Remove all existing 'Webmarks' folders, then recreate
                    let removed = 0;
                    existing.forEach(folder => {
                        chrome.bookmarks.removeTree(folder.id, () => {
                            removed++;
                            if (removed === existing.length) {
                                createFolderAndPopulate();
                            }
                        });
                    });
                }
            });
        });
    });

    // 5. Export to JSON
    exportBtn.addEventListener('click', () => {
        chrome.storage.local.get(['webmarks'], (result) => {
            const data = result.webmarks || [];
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'webmarks.json';
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    // 6. Import from JSON
    triggerImportBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) throw new Error("JSON must be an array.");

                const sanitizedData = importedData.map(w => ({
                    id: w.id || Date.now().toString() + Math.random(),
                    title: w.title,
                    url: w.url,
                    tags: sanitizeTags(Array.isArray(w.tags) ? w.tags : []),
                    pinned: w.pinned === true
                }));

                chrome.storage.local.set({ webmarks: sanitizedData }, () => {
                    importFile.value = '';
                    loadAndRender();
                });
            } catch (error) {
                alert('Invalid JSON format. Make sure it is an array of webmark objects.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    });

    function escapeAttr(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function sanitizeTags(tags) {
        return tags.map(t => t.toLowerCase().replace(/[^a-z0-9-]/g, '')).filter(Boolean);
    }

    // Helper: Fetch from storage and build DOM
    function loadAndRender() {
        const query = searchInput.value.trim().toLowerCase();
        chrome.storage.local.get(['webmarks'], (result) => {
            const webmarks = result.webmarks || [];
            const filtered = query
                ? webmarks.filter(w => {
                    if (searchMode === 'tags') {
                        return w.tags.some(t => t.toLowerCase().includes(query));
                    } else {
                        return w.title.toLowerCase().includes(query);
                    }
                })
                : webmarks;
            const displayed = showUntagged ? filtered.filter(w => w.tags.length === 0) : filtered;
            const sorted = [...displayed].sort((a, b) => {
                return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
            });
            container.innerHTML = '';

            if (displayed.length === 0) {
                container.innerHTML = showUntagged
                    ? '<p>No untagged webmarks.</p>'
                    : query
                        ? '<p>No webmarks match that search.</p>'
                        : '<p>No webmarks yet. Add one via the extension button or import a JSON file.</p>';
                return;
            }

            sorted.forEach(webmark => {
                const div = document.createElement('div');
                div.className = 'webmark-item' + (webmark.pinned ? ' pinned' : '');
                div.innerHTML = `
                    <a href="${webmark.url}" class="webmark-link">${webmark.title}</a>
                    <span class="webmark-tags">${webmark.tags.map(t => `[${t}]`).join(' ')}</span>
                    <button class="pin-btn ${webmark.pinned ? 'active' : ''}" data-id="${webmark.id}" title="${webmark.pinned ? 'Unpin' : 'Pin'}">★</button>
                    <button class="edit-btn" data-id="${webmark.id}" title="Edit">✎</button>
                    <button class="delete-btn" data-id="${webmark.id}">x</button>
                `;
                container.appendChild(div);
            });
        });
    }
});
