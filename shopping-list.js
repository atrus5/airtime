console.log("Executing shopping-list.js version 1.0");

document.addEventListener('DOMContentLoaded', function() {
    // --- FIREBASE CONFIG & INITIALIZATION ---
    const firebaseConfig = {
        apiKey: "AIzaSyCrFfiJJ6GUi-h5gjeJWvWFa5OVDrw_RNk",
        authDomain: "air-fryer-time-master.firebaseapp.com",
        projectId: "air-fryer-time-master",
        storageBucket: "air-fryer-time-master.firebasestorage.app",
        messagingSenderId: "468916758436",
        appId: "1:468916758436:web:871c4b59820e3d7ad6c331",
        measurementId: "G-B4S43HDY18"
    };
    
    let app, auth, db;
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        return;
    }

    // --- DOM REFERENCES ---
    const listLoading = document.getElementById('shopping-list-loading');
    const listContent = document.getElementById('shopping-list-content');
    const listContainer = document.getElementById('list-container');
    const printListBtn = document.getElementById('print-list-btn');
    const clearListBtn = document.getElementById('clear-list-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const themeToggleBtnHeader = document.getElementById('theme-toggle-btn-header');
    const themeIconDarkHeader = document.getElementById('theme-icon-dark-header');
    const themeIconLightHeader = document.getElementById('theme-icon-light-header');

    let currentUser = null;
    let unsubscribe;

    // --- THEME MANAGEMENT ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if(themeIconDarkHeader) themeIconDarkHeader.classList.add('hidden');
            if(themeIconLightHeader) themeIconLightHeader.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            if(themeIconDarkHeader) themeIconDarkHeader.classList.remove('hidden');
            if(themeIconLightHeader) themeIconLightHeader.classList.add('hidden');
        }
    }
    applyTheme(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    
    themeToggleBtnHeader.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // --- AUTHENTICATION & DATA LOADING ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            listenForShoppingList();
        } else {
            listLoading.innerHTML = `<p class="text-gray-500 dark:text-slate-400">Please sign in to use the shopping list.</p><a href="index.html" class="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline">Go to Homepage to Sign In</a>`;
            listLoading.classList.remove('hidden');
            listContent.classList.add('hidden');
        }
    });

    function listenForShoppingList() {
        if (unsubscribe) unsubscribe();
        
        const listRef = db.collection('users').doc(currentUser.uid).collection('shoppingList').doc('main');
        
        unsubscribe = listRef.onSnapshot(doc => {
            const listData = doc.exists ? doc.data().items : [];
            renderShoppingList(listData);
            listLoading.classList.add('hidden');
            listContent.classList.remove('hidden');
        }, err => {
            console.error("Error fetching shopping list:", err);
            showToast("Could not load your shopping list.", "error");
        });
    }

    function renderShoppingList(items) {
        listContainer.innerHTML = '';
        if (!items || items.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-slate-400">Your shopping list is empty. Add ingredients from a recipe!</p>';
            return;
        }

        // Simple grouping for now. A more advanced version could use a predefined category map.
        const grouped = items.reduce((acc, item) => {
            const category = item.category || 'Other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});

        for (const category in grouped) {
            const categoryDiv = document.createElement('div');
            categoryDiv.innerHTML = `<h3 class="font-semibold text-lg text-gray-700 dark:text-slate-200 mb-2 border-b border-gray-200 dark:border-slate-700 pb-1">${category}</h3>`;
            
            const itemList = document.createElement('div');
            itemList.className = 'space-y-2';

            grouped[category].forEach(item => {
                const itemEl = document.createElement('label');
                itemEl.className = 'flex items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700/50';
                itemEl.innerHTML = `
                    <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 item-checkbox" data-name="${item.name}" ${item.checked ? 'checked' : ''}>
                    <span class="ml-3 text-gray-800 dark:text-slate-200 item-name">${item.qty || ''} ${item.unit || ''} ${item.name}</span>
                `;
                itemList.appendChild(itemEl);
            });
            categoryDiv.appendChild(itemList);
            listContainer.appendChild(categoryDiv);
        }
    }

    // --- EVENT LISTENERS ---
    listContainer.addEventListener('change', async (e) => {
        if (e.target.classList.contains('item-checkbox')) {
            const itemName = e.target.dataset.name;
            const isChecked = e.target.checked;

            const listRef = db.collection('users').doc(currentUser.uid).collection('shoppingList').doc('main');
            const doc = await listRef.get();
            if (doc.exists) {
                const items = doc.data().items;
                const itemIndex = items.findIndex(i => i.name === itemName);
                if (itemIndex > -1) {
                    items[itemIndex].checked = isChecked;
                    await listRef.update({ items: items });
                }
            }
        }
    });

    printListBtn.addEventListener('click', () => {
        window.print();
    });

    clearListBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to clear your entire shopping list?")) {
            try {
                await db.collection('users').doc(currentUser.uid).collection('shoppingList').doc('main').set({ items: [] });
                showToast("Shopping list cleared!", "success");
            } catch (error) {
                console.error("Error clearing list:", error);
                showToast("Could not clear the list.", "error");
            }
        }
    });

    // --- UTILITIES ---
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = `toast shadow-lg flex items-center text-white px-4 py-3 rounded-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});

