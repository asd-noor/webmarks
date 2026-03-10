document.addEventListener('DOMContentLoaded', () => {
    const addForm = document.getElementById('add-form');
    const status = document.getElementById('status');
    const pinToggle = document.getElementById('pin-toggle');

    pinToggle.addEventListener('click', () => {
        pinToggle.classList.toggle('active');
        pinToggle.title = pinToggle.classList.contains('active') ? 'Pinned' : 'Pin on save';
    });

    // Pre-fill title and URL from the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
            document.getElementById('title-input').value = tab.title || '';
            document.getElementById('url-input').value = tab.url || '';
        }
    });

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newWebmark = {
            id: Date.now().toString(),
            title: document.getElementById('title-input').value.trim(),
            url: document.getElementById('url-input').value.trim(),
            tags: sanitizeTags(document.getElementById('tags-input').value.split(',').map(t => t.trim()).filter(Boolean)),
            pinned: pinToggle.classList.contains('active')
        };

        chrome.storage.local.get(['webmarks'], (result) => {
            const webmarks = result.webmarks || [];
            webmarks.push(newWebmark);
            chrome.storage.local.set({ webmarks }, () => {
                addForm.reset();
                status.textContent = 'Webmark saved.';
                setTimeout(() => window.close(), 800);
            });
        });
    });

    function sanitizeTags(tags) {
        return tags.map(t => t.toLowerCase().replace(/[^a-z0-9-]/g, '')).filter(Boolean);
    }
});
