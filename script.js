document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bookmark-container');
    const addForm = document.getElementById('add-form');
    const exportBtn = document.getElementById('export-btn');
    const triggerImportBtn = document.getElementById('trigger-import-btn');
    const importFile = document.getElementById('import-file');

    // 1. Initial Load
    loadAndRender();

    // 2. Add New Bookmark
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newBookmark = {
            id: Date.now().toString(), // Simple unique ID
            title: document.getElementById('title-input').value,
            url: document.getElementById('url-input').value,
            tag: document.getElementById('tag-input').value
        };

        chrome.storage.local.get(['bookmarks'], (result) => {
            const bookmarks = result.bookmarks || [];
            bookmarks.push(newBookmark);
            chrome.storage.local.set({ bookmarks }, () => {
                addForm.reset();
                loadAndRender();
            });
        });
    });

    // 3. Delete Bookmark (Event Delegation)
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const idToDelete = e.target.dataset.id;
            
            chrome.storage.local.get(['bookmarks'], (result) => {
                let bookmarks = result.bookmarks || [];
                bookmarks = bookmarks.filter(b => b.id !== idToDelete);
                chrome.storage.local.set({ bookmarks }, () => {
                    loadAndRender();
                });
            });
        }
    });

    // 4. Export to JSON
    exportBtn.addEventListener('click', () => {
        chrome.storage.local.get(['bookmarks'], (result) => {
            const data = result.bookmarks || [];
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bookmarks.json';
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    // 5. Import from JSON
    triggerImportBtn.addEventListener('click', () => importFile.click());
    
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) throw new Error("JSON must be an array.");
                
                // Ensure IDs exist for imported items
                const sanitizedData = importedData.map(b => ({
                    id: b.id || Date.now().toString() + Math.random(),
                    title: b.title,
                    url: b.url,
                    tag: b.tag
                }));

                chrome.storage.local.set({ bookmarks: sanitizedData }, () => {
                    importFile.value = ''; // Reset file input
                    loadAndRender();
                });
            } catch (error) {
                alert('Invalid JSON format. Make sure it is an array of bookmark objects.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    });

    // Helper: Fetch from storage and build DOM
    function loadAndRender() {
        chrome.storage.local.get(['bookmarks'], (result) => {
            const bookmarks = result.bookmarks || [];
            container.innerHTML = ''; // Clear current

            if (bookmarks.length === 0) {
                container.innerHTML = '<p>No bookmarks yet. Add one or import a JSON file.</p>';
                return;
            }

            bookmarks.forEach(bookmark => {
                const div = document.createElement('div');
                div.className = 'bookmark-item';
                
                div.innerHTML = `
                    <span class="bookmark-tag">[${bookmark.tag}]</span>
                    <a href="${bookmark.url}" class="bookmark-link">${bookmark.title}</a>
                    <button class="delete-btn" data-id="${bookmark.id}">x</button>
                `;
                container.appendChild(div);
            });
        });
    }
});
