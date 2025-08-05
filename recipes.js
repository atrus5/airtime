console.log("Executing recipes.js version 6.0 - Fixed Nav UI Bug");

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
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-by-select');
    const favoritesBtn = document.getElementById('favorites-btn');
    const recipesLink = document.querySelector('a[href="recipes.html"]');


    // --- APPLICATION STATE ---
    let publicRecipes = [];
    let communityRecipes = [];
    let myRecipes = [];
    let currentUser = null;
    let currentTab = 'official';
    let showingFavorites = false;
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
            loadAllRecipes();
            updateUIBasedOnTab();
        });
    } else {
        loadAllRecipes();
        updateUIBasedOnTab();
    }

    function loadAllRecipes() {
        if (unsubscribePublic) unsubscribePublic();
        if (unsubscribeCommunity) unsubscribeCommunity();
        if (unsubscribeMyRecipes) unsubscribeMyRecipes();

        unsubscribePublic = db.collection('public_recipes').onSnapshot(snapshot => {
            publicRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRecipes();
        }, err => console.error("Error fetching public recipes:", err));

        if (currentUser) {
            unsubscribeCommunity = db.collection('community_recipes').onSnapshot(snapshot => {
                communityRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderRecipes();
            }, err => console.error("Error fetching community recipes:", err));
            
            unsubscribeMyRecipes = db.collection('users').doc(currentUser.uid).collection('recipes').onSnapshot(snapshot => {
                myRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderRecipes();
            }, err => console.error("Error fetching user recipes:", err));
        } else {
            communityRecipes = [];
            myRecipes = [];
            renderRecipes();
        }
    }

    // --- TAB, FILTER & SORT LOGIC ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentTab = e.currentTarget.dataset.tab;
            showingFavorites = false;
            updateUIBasedOnTab();
        });
    });
    
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', () => {
            if (!currentUser) {
                showToast("Please sign in to use favorites.", "error");
                return;
            }
            showingFavorites = true;
            updateUIBasedOnTab();
        });
    }

    if(searchInput) searchInput.addEventListener('input', renderRecipes);
    if(sortSelect) sortSelect.addEventListener('change', renderRecipes);

    function updateUIBasedOnTab() {
        tabBtns.forEach(b => b.classList.remove('active'));
        if (!showingFavorites) {
            // A main tab is active
            document.querySelector(`.tab-btn[data-tab="${currentTab}"]`).classList.add('active');
            
            // Style the bottom nav: Make Recipes active, Favorites inactive
            recipesLink.classList.add('text-indigo-600', 'dark:text-indigo-400');
            recipesLink.classList.remove('text-gray-500', 'dark:text-slate-400');
            
            favoritesBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
            favoritesBtn.classList.add('text-gray-500', 'dark:text-slate-400');

        } else {
            // Favorites is active
            // Style the bottom nav: Make Favorites active, Recipes inactive
            favoritesBtn.classList.add('text-indigo-600', 'dark:text-indigo-400');
            favoritesBtn.classList.remove('text-gray-500', 'dark:text-slate-400');
            
            recipesLink.classList.remove('text-indigo-600', 'dark:text-indigo-400');
            recipesLink.classList.add('text-gray-500', 'dark:text-slate-400');
        }
        
        if (currentTab === 'my-recipes' && currentUser && !showingFavorites) {
            addRecipeSection.classList.remove('hidden');
        } else {
            addRecipeSection.classList.add('hidden');
        }
        renderRecipes();
    }

    function renderRecipes() {
        let recipesToRender = [];
        let message = "No recipes found.";

        if (showingFavorites) {
            if (!currentUser) {
                 recipeContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-slate-400">Please sign in to view favorites.</p>`;
                 return;
            }
            // Favorites are ONLY from the user's own collection.
            recipesToRender = myRecipes.filter(r => r.favorite);
            message = "You haven't favorited any recipes yet.";
        } else {
            switch(currentTab) {
                case 'official':
                    recipesToRender = publicRecipes;
                    message = "No official recipes yet. Check back soon!";
                    break;
                case 'community':
                    if (!currentUser) {
                        recipeContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-slate-400">Please sign in to view community recipes.</p>`;
                        if(noRecipes) noRecipes.classList.add('hidden');
                        return;
                    }
                    recipesToRender = communityRecipes;
                    message = "No community recipes yet. Be the first to share one!";
                    break;
                case 'my-recipes':
                    if (!currentUser) {
                        recipeContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-slate-400">Please sign in to manage your recipes.</p>`;
                        if(noRecipes) noRecipes.classList.add('hidden');
                        return;
                    }
                    recipesToRender = myRecipes;
                    message = "You haven't added any private recipes yet.";
                    break;
            }
        }

        // --- Filtering ---
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            recipesToRender = recipesToRender.filter(recipe => recipe.name.toLowerCase().includes(searchTerm));
        }

        // --- Sorting ---
        const sortBy = sortSelect.value;
        switch (sortBy) {
            case 'latest':
                recipesToRender.sort((a, b) => (b.id > a.id) ? 1 : -1);
                break;
            case 'alpha-asc':
                recipesToRender.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'alpha-desc':
                recipesToRender.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'time-asc':
                recipesToRender.sort((a, b) => (parseInt(a.cookTime) || 0) - (parseInt(b.cookTime) || 0));
                break;
            case 'time-desc':
                recipesToRender.sort((a, b) => (parseInt(b.cookTime) || 0) - (parseInt(a.cookTime) || 0));
                break;
        }

        if (recipesToRender.length === 0) {
            if(noRecipes) {
                noRecipes.innerHTML = `<p>${message}</p>`;
                noRecipes.classList.remove('hidden');
            }
            recipeContainer.innerHTML = '';
            return;
        }

        if(noRecipes) noRecipes.classList.add('hidden');
        recipeContainer.innerHTML = '';
        // Create a set of favorite IDs from the user's private recipes for quick lookup
        const favoriteIds = new Set(myRecipes.filter(r => r.favorite).map(r => r.id));
        recipesToRender.forEach(recipe => {
            // A recipe is considered a favorite for the UI if its ID is in the user's favorite set.
            const isFavorite = favoriteIds.has(recipe.id);
            const card = createRecipeCard(recipe, isFavorite);
            recipeContainer.appendChild(card);
        });
    }

    function createRecipeCard(recipe, isFavorite) {
        const card = document.createElement('div');
        card.className = 'card bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden';
        card.dataset.id = recipe.id;
        const placeholderImg = `https://placehold.co/600x400/e0e7ff/4338ca?text=${encodeURIComponent(recipe.name)}`;
        
        card.innerHTML = `
            <div class="relative">
                <img src="${recipe.imageUrl || placeholderImg}" alt="${recipe.name}" class="w-full h-40 object-cover cursor-pointer" onerror="this.onerror=null;this.src='${placeholderImg}';">
                <button class="favorite-btn absolute top-2 right-2 bg-white/70 p-1.5 rounded-full text-gray-600 hover:text-red-500" data-id="${recipe.id}" title="Favorite">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ${isFavorite ? 'text-red-500 fill-current' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </button>
            </div>
            <div class="p-4 cursor-pointer">
                <h3 class="font-bold text-lg text-gray-800 dark:text-slate-100">${recipe.name}</h3>
                <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400 mt-2">
                    <span>Prep: ${recipe.prepTime || 'N/A'} min</span>
                    <span>Cook: ${recipe.cookTime || 'N/A'} min</span>
                </div>
            </div>
        `;
        card.querySelector('.p-4').addEventListener('click', () => viewRecipe(recipe));
        card.querySelector('img').addEventListener('click', () => viewRecipe(recipe));
        card.querySelector('.favorite-btn').addEventListener('click', () => toggleFavorite(recipe));
        return card;
    }

    // --- MODAL & FORM HANDLING ---
    if(addRecipeBtn) {
        addRecipeBtn.addEventListener('click', () => {
            recipeForm.reset();
            document.getElementById('recipe-id').value = '';
            document.getElementById('recipe-modal-title').textContent = "Add New Recipe";
            const preview = document.getElementById('recipe-image-preview');
            preview.src = '';
            preview.classList.add('hidden');
            recipeModal.classList.remove('hidden');
        });
    }

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => {
        btn.closest('.modal').classList.add('hidden');
    }));

    if(recipeForm) recipeForm.addEventListener('submit', handleSaveRecipe);

    // --- RECIPE ACTIONS (SAVE, VIEW, DELETE, FAVORITE) ---
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
            favorite: isEditing ? (myRecipes.find(r => r.id === recipeId)?.favorite || false) : false
        };

        const newCollectionPath = shareWithCommunity ? 'community_recipes' : `users/${currentUser.uid}/recipes`;
        const docId = isEditing ? recipeId : db.collection('users').doc().id;

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
            recipeModal.classList.add('hidden');
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
                viewRecipeModal.classList.add('hidden');
                editUserRecipe(recipe);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteUserRecipe(recipe);

            actionsContainer.appendChild(editBtn);
            actionsContainer.appendChild(deleteBtn);
        }

        viewRecipeModal.classList.remove('hidden');
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
        if (recipe.imageUrl) {
            preview.src = recipe.imageUrl;
            preview.classList.remove('hidden');
        } else {
            preview.src = '';
            preview.classList.add('hidden');
        }
        recipeModal.classList.remove('hidden');
    }

    async function deleteUserRecipe(recipe) {
        if (window.confirm('Are you sure you want to delete this recipe?')) {
            // A user can only delete recipes they are the author of.
            if (!currentUser || recipe.authorId !== currentUser.uid) {
                showToast("You can only delete your own recipes.", "error");
                return;
            }

            try {
                // Delete from the user's private collection
                await db.collection(`users/${currentUser.uid}/recipes`).doc(recipe.id).delete();

                // If it was also a community recipe, delete that too
                const communityDocRef = db.collection('community_recipes').doc(recipe.id);
                const communityDoc = await communityDocRef.get();
                if (communityDoc.exists() && communityDoc.data().authorId === currentUser.uid) {
                    await communityDocRef.delete();
                }
                
                showToast('Recipe deleted!');
                viewRecipeModal.classList.add('hidden');
            } catch (err) {
                console.error("Error deleting recipe:", err);
                showToast(`Error: ${err.message}`, 'error');
            }
        }
    }

    async function toggleFavorite(recipe) {
        if (!currentUser) {
            showToast("Please sign in to favorite recipes.", "error");
            return;
        }
        
        const userRecipeRef = db.collection(`users/${currentUser.uid}/recipes`).doc(recipe.id);
        const userRecipeDoc = await userRecipeRef.get();

        if (userRecipeDoc.exists) {
            // The recipe is in the user's collection, so we just toggle the favorite status.
            const currentFavoriteState = userRecipeDoc.data().favorite || false;
            await userRecipeRef.update({ favorite: !currentFavoriteState });
            showToast(!currentFavoriteState ? "Recipe favorited!" : "Recipe unfavorited.");
        } else {
            // The recipe is not in the user's collection (it's a public or community one).
            // We copy it to the user's collection and set favorite to true.
            const newRecipeData = { ...recipe, favorite: true, authorId: currentUser.uid };
            await userRecipeRef.set(newRecipeData);
            showToast("Recipe added to your collection and favorited!");
        }
    }

    // --- UTILITIES ---
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = `toast shadow-lg flex items-center text-white px-4 py-3 rounded-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});

