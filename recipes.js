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
    }

    // --- DOM ELEMENT REFERENCES ---
    const recipeContainer = document.getElementById('recipe-container');
    const noRecipes = document.getElementById('no-recipes');
    const addRecipeBtn = document.getElementById('add-recipe-btn');
    const recipeModal = document.getElementById('recipe-modal');
    const viewRecipeModal = document.getElementById('view-recipe-modal');
    const linkTimerModal = document.getElementById('link-timer-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const recipeForm = document.getElementById('recipe-form');
    const linkTimerBtn = document.getElementById('link-timer-btn');
    const timersListContainer = document.getElementById('timers-list');
    const linkedTimerDisplay = document.getElementById('linked-timer-display');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // --- APPLICATION STATE ---
    let recipes = [];
    let timers = [];
    let currentUser = null;
    let unsubscribeRecipes;
    let unsubscribeTimers;
    let currentLinkedTimerId = null;

    // --- THEME MANAGEMENT ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if(themeIconDark) themeIconDark.classList.add('hidden');
            if(themeIconLight) themeIconLight.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            if(themeIconDark) themeIconDark.classList.remove('hidden');
            if(themeIconLight) themeIconLight.classList.add('hidden');
        }
    }
    applyTheme(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark');
            const newTheme = isDark ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- AUTHENTICATION ---
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                loadRecipes();
                loadTimers();
            } else {
                currentUser = null;
                // Redirect to login or show message if not logged in
                recipeContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-slate-400">Please sign in on the Timers page to view and manage recipes.</p>';
            }
        });
    }

    // --- DATA LOADING ---
    function loadRecipes() {
        if (!currentUser) return;
        const collectionRef = db.collection('users').doc(currentUser.uid).collection('recipes');
        unsubscribeRecipes = collectionRef.onSnapshot(snapshot => {
            recipes = snapshot.docs.map(doc => doc.data());
            renderRecipes();
        }, error => console.error("Error fetching recipes:", error));
    }

    function loadTimers() {
        if (!currentUser) return;
        const collectionRef = db.collection('users').doc(currentUser.uid).collection('timers');
        unsubscribeTimers = collectionRef.onSnapshot(snapshot => {
            timers = snapshot.docs.map(doc => doc.data());
        }, error => console.error("Error fetching timers:", error));
    }

    // --- RENDERING ---
    function renderRecipes() {
        if (recipes.length === 0) {
            recipeContainer.innerHTML = '';
            noRecipes.classList.remove('hidden');
            return;
        }
        noRecipes.classList.add('hidden');
        recipeContainer.innerHTML = '';
        recipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            recipeContainer.appendChild(card);
        });
    }

    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'card bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden cursor-pointer';
        card.dataset.id = recipe.id;
        const placeholderImg = `https://placehold.co/600x400/e0e7ff/4338ca?text=${encodeURIComponent(recipe.name)}`;
        
        card.innerHTML = `
            <img src="${recipe.imageUrl || placeholderImg}" alt="${recipe.name}" class="w-full h-40 object-cover">
            <div class="p-4">
                <h3 class="font-bold text-lg text-gray-800 dark:text-slate-100">${recipe.name}</h3>
                <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400 mt-2">
                    <span>Prep: ${recipe.prepTime || 'N/A'} min</span>
                    <span>Cook: ${recipe.cookTime || 'N/A'} min</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => viewRecipe(recipe.id));
        return card;
    }

    // --- MODAL & FORM HANDLING ---
    addRecipeBtn.addEventListener('click', () => {
        recipeForm.reset();
        document.getElementById('recipe-id').value = '';
        document.getElementById('recipe-modal-title').textContent = "Add New Recipe";
        document.getElementById('recipe-image-preview').classList.add('hidden');
        linkedTimerDisplay.textContent = 'No time linked';
        currentLinkedTimerId = null;
        recipeModal.classList.remove('hidden');
    });

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => {
        btn.closest('.modal').classList.add('hidden');
    }));

    recipeForm.addEventListener('submit', handleSaveRecipe);
    linkTimerBtn.addEventListener('click', openLinkTimerModal);

    // --- RECIPE ACTIONS (SAVE, VIEW, DELETE) ---
    async function handleSaveRecipe(e) {
        e.preventDefault();
        if (!currentUser) {
            showToast("You must be signed in to save recipes.", "error");
            return;
        }

        const id = document.getElementById('recipe-id').value || Date.now().toString();
        const isEditing = !!document.getElementById('recipe-id').value;

        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        let imageUrl = '';
        const imageFile = document.getElementById('recipe-image').files[0];
        if (imageFile) {
            imageUrl = await toBase64(imageFile);
        } else if (isEditing) {
            const existingRecipe = recipes.find(r => r.id === id);
            imageUrl = existingRecipe?.imageUrl || '';
        }

        const recipeData = {
            id: id,
            name: document.getElementById('recipe-name').value,
            imageUrl: imageUrl,
            prepTime: document.getElementById('recipe-prep-time').value,
            cookTime: document.getElementById('recipe-cook-time').value,
            ingredients: document.getElementById('recipe-ingredients').value.split('\n').filter(i => i.trim() !== ''),
            instructions: document.getElementById('recipe-instructions').value.split('\n').filter(i => i.trim() !== ''),
            linkedTimerId: currentLinkedTimerId
        };

        try {
            await db.collection('users').doc(currentUser.uid).collection('recipes').doc(id).set(recipeData);
            showToast(`Recipe ${isEditing ? 'updated' : 'saved'}!`);
            recipeModal.classList.add('hidden');
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        }
    }

    function viewRecipe(id) {
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;

        document.getElementById('view-recipe-name').textContent = recipe.name;
        const viewImage = document.getElementById('view-recipe-image');
        const placeholderImg = `https://placehold.co/600x400/e0e7ff/4338ca?text=${encodeURIComponent(recipe.name)}`;
        viewImage.src = recipe.imageUrl || placeholderImg;

        document.getElementById('view-prep-time').textContent = `Prep: ${recipe.prepTime || 'N/A'} min`;
        document.getElementById('view-cook-time').textContent = `Cook: ${recipe.cookTime || 'N/A'} min`;
        
        document.getElementById('view-recipe-ingredients').innerHTML = `<ul>${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>`;
        document.getElementById('view-recipe-instructions').innerHTML = `<ol>${recipe.instructions.map(i => `<li>${i}</li>`).join('')}</ol>`;
        
        const linkedTimerSection = document.getElementById('view-linked-timer-section');
        if (recipe.linkedTimerId) {
            const timer = timers.find(t => t.id.toString() === recipe.linkedTimerId);
            if (timer) {
                document.getElementById('view-linked-timer').innerHTML = `
                    <p class="font-semibold dark:text-slate-200">${timer.name}</p>
                    <p class="text-sm dark:text-slate-300">${timer.minutes}m ${timer.seconds || 0}s at ${timer.temperature}°${timer.tempUnit}</p>
                `;
                linkedTimerSection.classList.remove('hidden');
            }
        } else {
            linkedTimerSection.classList.add('hidden');
        }

        viewRecipeModal.classList.remove('hidden');
    }

    // --- TIMER LINKING ---
    function openLinkTimerModal() {
        timersListContainer.innerHTML = '';
        if (timers.length === 0) {
            timersListContainer.innerHTML = '<p class="text-sm text-gray-500">No saved timers found.</p>';
        } else {
            timers.forEach(timer => {
                const button = document.createElement('button');
                button.className = 'w-full text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700';
                button.textContent = `${timer.name} (${timer.minutes}m ${timer.seconds || 0}s, ${timer.temperature}°${timer.tempUnit})`;
                button.onclick = () => selectTimerForLinking(timer.id);
                timersListContainer.appendChild(button);
            });
        }
        linkTimerModal.classList.remove('hidden');
    }

    function selectTimerForLinking(timerId) {
        currentLinkedTimerId = timerId.toString();
        const timer = timers.find(t => t.id.toString() === currentLinkedTimerId);
        linkedTimerDisplay.textContent = `${timer.name} (${timer.minutes}m ${timer.seconds || 0}s)`;
        linkTimerModal.classList.add('hidden');
    }

    // --- UTILITIES ---
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = `toast shadow-lg flex items-center text-white px-4 py-3 rounded-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});

