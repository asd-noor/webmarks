document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('webmark-container');
    const exportBrowserBtn = document.getElementById('export-browser-btn');
    const exportBtn = document.getElementById('export-btn');
    const triggerImportBtn = document.getElementById('trigger-import-btn');
    const importFile = document.getElementById('import-file');
    const searchInput = document.getElementById('search-input');
    const untaggedBtn = document.getElementById('untagged-btn');
    let showUntagged = false;

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

    // History suggestion dropdown ($ prefix)
    const historySuggestions = document.getElementById('history-suggestions');
    let historyItems = [];
    let historySelectedIdx = -1;

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
        if (!val.startsWith('$ ')) {
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
        if (val.startsWith('$ ')) {
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
                ? webmarks.filter(w =>
                    w.tags.some(t => t.toLowerCase().includes(query)) ||
                    w.title.toLowerCase().includes(query))
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
