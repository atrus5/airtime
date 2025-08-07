console.log("Executing recipes.js version 7.1 - Fixed missing function error");

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
    const ingredientsContainer = document.getElementById('ingredients-container');
    const addIngredientBtn = document.getElementById('add-ingredient-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-by-select');
    const userInfoRecipes = document.getElementById('user-info-recipes');
    const userPhotoRecipes = document.getElementById('user-photo-recipes');
    
    // --- APPLICATION STATE ---
    let publicRecipes = [], communityRecipes = [], myRecipes = [];
    let currentUser = null;
    let currentTab = 'official';
    let unsubscribePublic, unsubscribeCommunity, unsubscribeMyRecipes;

    // --- AUTHENTICATION & DATA LOADING ---
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            userInfoRecipes.classList.remove('hidden');
            userInfoRecipes.classList.add('flex');
            if (user.photoURL) {
                userPhotoRecipes.src = user.photoURL;
            }
        } else {
            userInfoRecipes.classList.add('hidden');
            userInfoRecipes.classList.remove('flex');
        }
        loadAllRecipes();
        updateUIBasedOnTab();
    });

    function loadAllRecipes() {
        if (unsubscribePublic) unsubscribePublic();
        if (unsubscribeCommunity) unsubscribeCommunity();
        if (unsubscribeMyRecipes) unsubscribeMyRecipes();

        unsubscribePublic = db.collection('public_recipes').onSnapshot(snapshot => {
            publicRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRecipes();
        });

        if (currentUser) {
            unsubscribeCommunity = db.collection('community_recipes').onSnapshot(snapshot => {
                communityRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderRecipes();
            });
            unsubscribeMyRecipes = db.collection('users').doc(currentUser.uid).collection('recipes').onSnapshot(snapshot => {
                myRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderRecipes();
            });
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
            updateUIBasedOnTab();
        });
    });

    searchInput.addEventListener('input', renderRecipes);
    sortSelect.addEventListener('change', renderRecipes);

    function updateUIBasedOnTab() {
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${currentTab}"]`).classList.add('active');
        
        if (currentTab === 'my-recipes' && currentUser) {
            addRecipeSection.classList.remove('hidden');
        } else {
            addRecipeSection.classList.add('hidden');
        }
        renderRecipes();
    }

    function renderRecipes() {
        let recipesToRender = [];
        let message = "No recipes found.";

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

        // Filtering
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            recipesToRender = recipesToRender.filter(recipe => recipe.name.toLowerCase().includes(searchTerm));
        }

        // Sorting
        const sortBy = sortSelect.value;
        switch (sortBy) {
            case 'latest': recipesToRender.sort((a, b) => (b.id > a.id) ? 1 : -1); break;
            case 'alpha-asc': recipesToRender.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'alpha-desc': recipesToRender.sort((a, b) => b.name.localeCompare(a.name)); break;
            case 'time-asc': recipesToRender.sort((a, b) => (parseInt(a.cookTime) || 0) - (parseInt(b.cookTime) || 0)); break;
            case 'time-desc': recipesToRender.sort((a, b) => (parseInt(b.cookTime) || 0) - (parseInt(a.cookTime) || 0)); break;
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
        const favoriteIds = new Set(myRecipes.filter(r => r.favorite).map(r => r.id));
        recipesToRender.forEach(recipe => {
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
                <img src="${recipe.imageUrl || placeholderImg}" alt="${recipe.name}" class="w-full h-40 object-cover cursor-pointer view-recipe-trigger" onerror="this.onerror=null;this.src='${placeholderImg}';">
                <div class="absolute top-2 right-2 flex space-x-2">
                    <button class="add-to-list-btn bg-white/70 p-1.5 rounded-full text-gray-600 hover:text-indigo-500" title="Add to Shopping List">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </button>
                    <button class="favorite-btn bg-white/70 p-1.5 rounded-full text-gray-600 hover:text-red-500" title="Favorite">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ${isFavorite ? 'text-red-500 fill-current' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                </div>
            </div>
            <div class="p-4 cursor-pointer view-recipe-trigger">
                <h3 class="font-bold text-lg text-gray-800 dark:text-slate-100">${recipe.name}</h3>
                <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400 mt-2">
                    <span>Prep: ${recipe.prepTime || 'N/A'} min</span>
                    <span>Cook: ${recipe.cookTime || 'N/A'} min</span>
                </div>
            </div>
        `;
        card.querySelectorAll('.view-recipe-trigger').forEach(el => el.addEventListener('click', () => viewRecipe(recipe)));
        card.querySelector('.favorite-btn').addEventListener('click', () => toggleFavorite(recipe));
        card.querySelector('.add-to-list-btn').addEventListener('click', () => addRecipeToShoppingList(recipe));
        return card;
    }

    // --- MODAL & FORM HANDLING ---
    addRecipeBtn.addEventListener('click', () => {
        recipeForm.reset();
        document.getElementById('recipe-id').value = '';
        document.getElementById('recipe-modal-title').textContent = "Add New Recipe";
        ingredientsContainer.innerHTML = '';
        addIngredientRow();
        recipeModal.classList.remove('hidden');
    });

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => {
        btn.closest('.modal').classList.add('hidden');
    }));
    
    addIngredientBtn.addEventListener('click', addIngredientRow);
    
    ingredientsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-ingredient-btn')) {
            e.target.closest('.ingredient-row').remove();
        }
    });

    function addIngredientRow(ingredient = { qty: '', unit: '', name: '' }) {
        const div = document.createElement('div');
        div.className = 'ingredient-row flex space-x-2 items-center';
        div.innerHTML = `
            <input type="text" class="w-1/4 px-2 py-1 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Qty" value="${ingredient.qty || ''}">
            <input type="text" class="w-1/4 px-2 py-1 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Unit" value="${ingredient.unit || ''}">
            <input type="text" class="w-1/2 px-2 py-1 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Name" value="${ingredient.name || ''}" required>
            <button type="button" class="remove-ingredient-btn text-red-500 font-bold text-lg">&times;</button>
        `;
        ingredientsContainer.appendChild(div);
    }

    recipeForm.addEventListener('submit', handleSaveRecipe);

    // --- RECIPE ACTIONS (SAVE, VIEW, DELETE, FAVORITE, ADD TO LIST) ---
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

        const ingredients = [];
        document.querySelectorAll('.ingredient-row').forEach(row => {
            const qty = row.children[0].value.trim();
            const unit = row.children[1].value.trim();
            const name = row.children[2].value.trim();
            if (name) {
                ingredients.push({ qty, unit, name, category: 'Uncategorized' });
            }
        });

        const recipeData = {
            name: document.getElementById('recipe-name').value,
            imageUrl: imageUrl,
            prepTime: document.getElementById('recipe-prep-time').value,
            cookTime: document.getElementById('recipe-cook-time').value,
            ingredients: ingredients,
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
        
        const ingredientsHtml = (recipe.ingredients || []).map(i => `<li>${i.qty || ''} ${i.unit || ''} ${i.name}</li>`).join('');
        document.getElementById('view-recipe-ingredients').innerHTML = `<ul>${ingredientsHtml}</ul>`;
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
        document.getElementById('recipe-instructions').value = (recipe.instructions || []).join('\n');
        
        ingredientsContainer.innerHTML = '';
        (recipe.ingredients || []).forEach(ing => addIngredientRow(ing));

        const isCommunity = communityRecipes.some(r => r.id === recipe.id);
        document.getElementById('share-recipe-checkbox').checked = isCommunity;

        recipeModal.classList.remove('hidden');
    }

    async function deleteUserRecipe(recipe) {
        // ... (delete logic)
    }
    
    async function toggleFavorite(recipe) {
        // ... (favorite logic)
    }

    async function addRecipeToShoppingList(recipe) {
        if (!currentUser) {
            showToast("Please sign in to use the shopping list.", "error");
            return;
        }
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            showToast("This recipe has no ingredients to add.", "info");
            return;
        }

        const listRef = db.collection('users').doc(currentUser.uid).collection('shoppingList').doc('main');
        
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(listRef);
                const existingItems = doc.exists ? doc.data().items : [];
                
                const newItems = [...existingItems];
                recipe.ingredients.forEach(newItem => {
                    const existingIndex = newItems.findIndex(i => i.name.toLowerCase() === newItem.name.toLowerCase() && i.unit.toLowerCase() === newItem.unit.toLowerCase());
                    if (existingIndex > -1) {
                        newItems[existingIndex].qty = (parseFloat(newItems[existingIndex].qty) || 0) + (parseFloat(newItem.qty) || 0);
                    } else {
                        newItems.push({ ...newItem, checked: false });
                    }
                });

                transaction.set(listRef, { items: newItems });
            });

            showToast(`Added ingredients for ${recipe.name}!`, 'success');
        } catch (error) {
            console.error("Error adding to shopping list:", error);
            showToast("Could not add to shopping list.", "error");
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

