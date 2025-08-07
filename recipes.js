console.log("Executing recipes.js version 7.0 - Added Shopping List features");

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
    
    // --- APPLICATION STATE ---
    let publicRecipes = [], communityRecipes = [], myRecipes = [];
    let currentUser = null;
    let currentTab = 'official';
    let unsubscribePublic, unsubscribeCommunity, unsubscribeMyRecipes;

    // --- AUTHENTICATION & DATA LOADING ---
    auth.onAuthStateChanged(user => {
        currentUser = user;
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

    // --- RENDER & FILTER LOGIC ---
    function renderRecipes() {
        let recipesToRender = [];
        // ... (rest of the render logic remains the same)

        // --- Filtering & Sorting Logic (no changes here) ---

        if (recipesToRender.length === 0) {
            // ... (no changes here)
            return;
        }

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
                <img src="${recipe.imageUrl || placeholderImg}" alt="${recipe.name}" class="w-full h-40 object-cover cursor-pointer view-recipe-trigger">
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
        addIngredientRow(); // Add one empty row to start
        recipeModal.classList.remove('hidden');
    });
    
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
            <input type="text" class="w-1/4 px-2 py-1 border rounded-md dark:bg-slate-700 dark:border-slate-600" placeholder="Qty" value="${ingredient.qty}">
            <input type="text" class="w-1/4 px-2 py-1 border rounded-md dark:bg-slate-700 dark:border-slate-600" placeholder="Unit" value="${ingredient.unit}">
            <input type="text" class="w-1/2 px-2 py-1 border rounded-md dark:bg-slate-700 dark:border-slate-600" placeholder="Name" value="${ingredient.name}" required>
            <button type="button" class="remove-ingredient-btn text-red-500">&times;</button>
        `;
        ingredientsContainer.appendChild(div);
    }

    // --- RECIPE ACTIONS (SAVE, VIEW, DELETE, FAVORITE, ADD TO LIST) ---
    async function handleSaveRecipe(e) {
        e.preventDefault();
        // ... (form validation and setup)

        const ingredients = [];
        document.querySelectorAll('.ingredient-row').forEach(row => {
            const qty = row.children[0].value.trim();
            const unit = row.children[1].value.trim();
            const name = row.children[2].value.trim();
            if (name) {
                ingredients.push({ qty, unit, name, category: 'Uncategorized' }); // Default category
            }
        });

        const recipeData = {
            // ... (other recipe data)
            ingredients: ingredients,
            // ... (rest of data)
        };
        
        // ... (rest of save logic)
    }

    function viewRecipe(recipe) {
        // ... (view recipe logic)
        
        const ingredientsHtml = (recipe.ingredients || []).map(i => `<li>${i.qty || ''} ${i.unit || ''} ${i.name}</li>`).join('');
        document.getElementById('view-recipe-ingredients').innerHTML = `<ul>${ingredientsHtml}</ul>`;

        // ... (rest of view logic)
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
                
                // A simple merge logic. More complex logic could handle unit conversions.
                const newItems = [...existingItems];
                recipe.ingredients.forEach(newItem => {
                    const existingIndex = newItems.findIndex(i => i.name.toLowerCase() === newItem.name.toLowerCase() && i.unit.toLowerCase() === newItem.unit.toLowerCase());
                    if (existingIndex > -1) {
                        // If item exists, add quantities. Assumes they are numbers.
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
        // ...
    }
});

