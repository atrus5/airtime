console.log("Executing recipes.js version 3.0 - If you see this, the correct file is loaded.");

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
        // Initialize Firebase using the compat libraries
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        // If Firebase fails, stop here and show an error message to the user.
        return;
    }

    // --- DOM REFERENCES ---
    const recipeContainer = document.getElementById('recipe-container');
    const noRecipes = document.getElementById('no-recipes');
    const addRecipeBtn = document.getElementById('add-recipe-btn');
    const addRecipeSection = document.getElementById('add-recipe-section');
    const recipeModal = document.getElementById('recipe-modal');
    const viewRecipeModal = document.getElementById('view-recipe-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const recipeForm = document.getElementById('recipe-form');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // --- APPLICATION STATE ---
    let publicRecipes = [];
    let communityRecipes = [];
    let myRecipes = [];
    let currentUser = null;
    let currentTab = 'official'; // Default tab
    let unsubscribePublic, unsubscribeCommunity, unsubscribeMyRecipes;


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
    // Set theme on initial load
    applyTheme(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark');
            const newTheme = isDark ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- AUTHENTICATION & DATA LOADING ---
    if (auth) {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            loadAllRecipes(); // This will load data based on the user's auth state
            updateUIBasedOnTab(); // This will set the correct view based on the current tab
        });
    } else {
        // Fallback for when Firebase auth isn't available
        loadAllRecipes();
        updateUIBasedOnTab();
    }

    function loadAllRecipes() {
        // Detach previous listeners to prevent memory leaks and duplicate data fetching
        if (unsubscribePublic) unsubscribePublic();
        if (unsubscribeCommunity) unsubscribeCommunity();
        if (unsubscribeMyRecipes) unsubscribeMyRecipes();

        // Load public (official) recipes for everyone
        unsubscribePublic = db.collection('public_recipes').onSnapshot(snapshot => {
            publicRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRecipes(); // Re-render with the latest data
        }, err => console.error("Error fetching public recipes:", err));

        if (currentUser) {
            // Load community recipes if a user is signed in
            unsubscribeCommunity = db.collection('community_recipes').onSnapshot(snapshot => {
                communityRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderRecipes();
            }, err => console.error("Error fetching community recipes:", err));
            
            // Load user's private recipes if a user is signed in
            unsubscribeMyRecipes = db.collection('users').doc(currentUser.uid).collection('recipes').onSnapshot(snapshot => {
                myRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderRecipes();
            }, err => console.error("Error fetching user recipes:", err));
        } else {
            // Clear user-specific data if the user is logged out
            communityRecipes = [];
            myRecipes = [];
            renderRecipes();
        }
    }

    // --- TAB & RENDERING LOGIC ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // When a tab is clicked, update the state and the UI
            currentTab = e.currentTarget.dataset.tab;
            updateUIBasedOnTab();
        });
    });

    function updateUIBasedOnTab() {
        // Update active state on tab buttons
        tabBtns.forEach(b => {
            if (b.dataset.tab === currentTab) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        
        // Show or hide the "Add New Recipe" button based on the tab and login status
        if (currentTab === 'my-recipes' && currentUser) {
            if(addRecipeSection) addRecipeSection.classList.remove('hidden');
        } else {
            if(addRecipeSection) addRecipeSection.classList.add('hidden');
        }
        renderRecipes(); // Re-render the recipe list for the selected tab
    }

    function renderRecipes() {
        let recipesToRender = [];
        let message = "No recipes found.";

        // Determine which list of recipes to show
        switch(currentTab) {
            case 'official':
                recipesToRender = publicRecipes;
                message = "No official recipes yet. Check back soon!";
                break;
            case 'community':
                if (!currentUser) {
                    if(recipeContainer) recipeContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-slate-400">Please sign in to view community recipes.</p>`;
                    if(noRecipes) noRecipes.classList.add('hidden');
                    return;
                }
                recipesToRender = communityRecipes;
                message = "No community recipes yet. Be the first to share one!";
                break;
            case 'my-recipes':
                if (!currentUser) {
                    if(recipeContainer) recipeContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-slate-400">Please sign in to manage your recipes.</p>`;
                    if(noRecipes) noRecipes.classList.add('hidden');
                    return;
                }
                recipesToRender = myRecipes;
                message = "You haven't added any private recipes yet.";
                break;
        }

        // Handle the case where there are no recipes to display
        if (!recipesToRender || recipesToRender.length === 0) {
            if(noRecipes) {
                noRecipes.innerHTML = `<p>${message}</p>`;
                noRecipes.classList.remove('hidden');
            }
            if(recipeContainer) recipeContainer.innerHTML = '';
            return;
        }

        // If we have recipes, hide the 'no recipes' message and render the cards
        if(noRecipes) noRecipes.classList.add('hidden');
        if(recipeContainer) {
            recipeContainer.innerHTML = '';
            recipesToRender.forEach(recipe => {
                const card = createRecipeCard(recipe);
                recipeContainer.appendChild(card);
            });
        }
    }

    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'card bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden cursor-pointer';
        card.dataset.id = recipe.id;
        const placeholderImg = `https://placehold.co/600x400/e0e7ff/4338ca?text=${encodeURIComponent(recipe.name)}`;
        
        card.innerHTML = `
            <img src="${recipe.imageUrl || placeholderImg}" alt="${recipe.name}" class="w-full h-40 object-cover" onerror="this.onerror=null;this.src='${placeholderImg}';">
            <div class="p-4">
                <h3 class="font-bold text-lg text-gray-800 dark:text-slate-100">${recipe.name}</h3>
                <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400 mt-2">
                    <span>Prep: ${recipe.prepTime || 'N/A'} min</span>
                    <span>Cook: ${recipe.cookTime || 'N/A'} min</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => viewRecipe(recipe));
        return card;
    }

    // --- MODAL & FORM HANDLING ---
    if(addRecipeBtn) {
        addRecipeBtn.addEventListener('click', () => {
            if (recipeForm) recipeForm.reset();
            document.getElementById('recipe-id').value = '';
            document.getElementById('recipe-modal-title').textContent = "Add New Recipe";
            const preview = document.getElementById('recipe-image-preview');
            if (preview) {
                preview.src = '';
                preview.classList.add('hidden');
            }
            if (recipeModal) recipeModal.classList.remove('hidden');
        });
    }

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => {
        btn.closest('.modal').classList.add('hidden');
    }));

    if(recipeForm) recipeForm.addEventListener('submit', handleSaveRecipe);

    // --- RECIPE ACTIONS (SAVE, VIEW, DELETE) ---
    async function handleSaveRecipe(e) {
        e.preventDefault();
        if (!currentUser) {
            showToast("You must be signed in to save recipes.", "error");
            return;
        }

        const recipeId = document.getElementById('recipe-id').value;
        const isEditing = !!recipeId;
        const shareWithCommunity = document.getElementById('share-recipe-checkbox').checked;

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
            const existingRecipe = myRecipes.find(r => r.id === recipeId) || communityRecipes.find(r => r.id === recipeId);
            imageUrl = existingRecipe?.imageUrl || '';
        }

        const recipeData = {
            name: document.getElementById('recipe-name').value,
            imageUrl: imageUrl,
            prepTime: document.getElementById('recipe-prep-time').value,
            cookTime: document.getElementById('recipe-cook-time').value,
            ingredients: document.getElementById('recipe-ingredients').value.split('\n').filter(i => i.trim() !== ''),
            instructions: document.getElementById('recipe-instructions').value.split('\n').filter(i => i.trim() !== ''),
            authorId: currentUser.uid,
        };

        const newCollectionPath = shareWithCommunity ? 'community_recipes' : `users/${currentUser.uid}/recipes`;
        const docId = isEditing ? recipeId : db.collection('users').doc().id; // Generate a new ID for new recipes

        try {
            if (isEditing) {
                const wasInCommunity = communityRecipes.some(r => r.id === recipeId);
                const wasPrivate = myRecipes.some(r => r.id === recipeId);
                if (shareWithCommunity && wasPrivate) {
                    await db.collection(`users/${currentUser.uid}/recipes`).doc(recipeId).delete();
                } else if (!shareWithCommunity && wasInCommunity) {
                    await db.collection('community_recipes').doc(recipeId).delete();
                }
            }
            await db.collection(newCollectionPath).doc(docId).set({ ...recipeData, id: docId });
            showToast(`Recipe ${isEditing ? 'updated' : 'saved'}!`);
            if (recipeModal) recipeModal.classList.add('hidden');
        } catch (err) {
            console.error("Error saving recipe:", err);
            showToast(`Error: ${err.message}`, 'error');
        }
    }

    function viewRecipe(recipe) {
        document.getElementById('view-recipe-name').textContent = recipe.name;
        const viewImage = document.getElementById('view-recipe-image');
        const placeholderImg = `https://placehold.co/600x400/e0e7ff/4338ca?text=${encodeURIComponent(recipe.name)}`;
        viewImage.src = recipe.imageUrl || placeholderImg;
        viewImage.onerror = () => { viewImage.src = placeholderImg; };

        document.getElementById('view-prep-time').textContent = `Prep: ${recipe.prepTime || 'N/A'} min`;
        document.getElementById('view-cook-time').textContent = `Cook: ${recipe.cookTime || 'N/A'} min`;
        
        document.getElementById('view-recipe-ingredients').innerHTML = `<ul>${(recipe.ingredients || []).map(i => `<li>${i}</li>`).join('')}</ul>`;
        document.getElementById('view-recipe-instructions').innerHTML = `<ol>${(recipe.instructions || []).map(i => `<li>${i}</li>`).join('')}</ol>`;
        
        const actionsContainer = document.getElementById('view-recipe-actions');
        actionsContainer.innerHTML = ''; 
        if (currentUser && recipe.authorId === currentUser.uid) {
            const editBtn = document.createElement('button');
            editBtn.className = 'bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => {
                if (viewRecipeModal) viewRecipeModal.classList.add('hidden');
                editUserRecipe(recipe);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteUserRecipe(recipe);

            actionsContainer.appendChild(editBtn);
            actionsContainer.appendChild(deleteBtn);
        }

        if (viewRecipeModal) viewRecipeModal.classList.remove('hidden');
    }

    function editUserRecipe(recipe) {
        document.getElementById('recipe-modal-title').textContent = 'Edit Recipe';
        document.getElementById('recipe-id').value = recipe.id;
        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('recipe-prep-time').value = recipe.prepTime;
        document.getElementById('recipe-cook-time').value = recipe.cookTime;
        document.getElementById('recipe-ingredients').value = (recipe.ingredients || []).join('\n');
        document.getElementById('recipe-instructions').value = (recipe.instructions || []).join('\n');
        
        const isCommunity = communityRecipes.some(r => r.id === recipe.id);
        document.getElementById('share-recipe-checkbox').checked = isCommunity;

        const preview = document.getElementById('recipe-image-preview');
        if (preview) {
            if (recipe.imageUrl) {
                preview.src = recipe.imageUrl;
                preview.classList.remove('hidden');
            } else {
                preview.src = '';
                preview.classList.add('hidden');
            }
        }
        if (recipeModal) recipeModal.classList.remove('hidden');
    }

    async function deleteUserRecipe(recipe) {
        if (window.confirm('Are you sure you want to delete this recipe?')) {
            const isCommunity = communityRecipes.some(r => r.id === recipe.id);
            const collectionPath = isCommunity ? 'community_recipes' : `users/${currentUser.uid}/recipes`;
            try {
                await db.collection(collectionPath).doc(recipe.id).delete();
                showToast('Recipe deleted!');
                if (viewRecipeModal) viewRecipeModal.classList.add('hidden');
            } catch (err) {
                console.error("Error deleting recipe:", err);
                showToast(`Error: ${err.message}`, 'error');
            }
        }
    }

    // --- UTILITIES ---
    function showToast(message, type = 'success') {
        if (toastMessage) toastMessage.textContent = message;
        if (toast) {
            toast.className = `toast shadow-lg flex items-center text-white px-4 py-3 rounded-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }
});

