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
        alert("Could not connect to the database. Please check the console for errors.");
    }

    // --- DOM REFERENCES ---
    const loginView = document.getElementById('admin-login');
    const dashboardView = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const logoutBtn = document.getElementById('admin-logout-btn');
    const recipeForm = document.getElementById('admin-recipe-form');
    const recipesListContainer = document.getElementById('public-recipes-list');
    const formTitle = document.getElementById('form-title');
    const recipeImageInput = document.getElementById('recipe-image');
    const imagePreview = document.getElementById('recipe-image-preview');
    const saveButton = document.querySelector('#admin-recipe-form button[type="submit"]');

    let allPublicRecipes = []; // Cache recipes to avoid re-fetching

    // --- AUTH STATE ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // A simple check for an admin user. In a real app, use custom claims.
            if (user.email === "admin@example.com") {
                loginView.classList.add('hidden');
                dashboardView.classList.remove('hidden');
                loadPublicRecipes();
            } else {
                alert("You are not authorized to view this page.");
                auth.signOut();
            }
        } else {
            loginView.classList.remove('hidden');
            dashboardView.classList.add('hidden');
        }
    });

    // --- EVENT LISTENERS ---
    if(loginForm) loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
    });

    if(logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut());
    if(recipeForm) recipeForm.addEventListener('submit', handleSaveRecipe);
    if(recipeImageInput) recipeImageInput.addEventListener('change', previewImage);

    // --- FUNCTIONS ---
    function loadPublicRecipes() {
        db.collection('public_recipes').onSnapshot(snapshot => {
            allPublicRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRecipesList(allPublicRecipes);
        }, err => {
            console.error("Error loading public recipes: ", err);
            alert("Could not load recipes.");
        });
    }
    
    function renderRecipesList(recipes) {
        if (!recipesListContainer) return;
        recipesListContainer.innerHTML = '<h2 class="text-2xl font-bold mb-4">Existing Recipes</h2>';
        if (recipes.length === 0) {
            recipesListContainer.innerHTML += '<p>No public recipes found.</p>';
            return;
        }
        recipes.forEach(recipe => {
            const div = document.createElement('div');
            div.className = 'bg-gray-50 p-4 rounded-lg shadow-md flex justify-between items-center';
            div.innerHTML = `
                <span class="font-medium">${recipe.name}</span>
                <div>
                    <button class="edit-btn bg-yellow-500 text-white px-3 py-1 rounded mr-2 hover:bg-yellow-600" data-id="${recipe.id}">Edit</button>
                    <button class="delete-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" data-id="${recipe.id}">Delete</button>
                </div>
            `;
            recipesListContainer.appendChild(div);
        });

        // Add event listeners for new edit/delete buttons
        recipesListContainer.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => editRecipe(e.target.dataset.id)));
        recipesListContainer.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteRecipe(e.target.dataset.id)));
    }

    async function handleSaveRecipe(e) {
        e.preventDefault();
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        const id = document.getElementById('recipe-id').value;
        const isEditing = !!id;

        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        let imageUrl = imagePreview.src;
        if (recipeImageInput.files[0]) {
            imageUrl = await toBase64(recipeImageInput.files[0]);
        }

        const recipeData = {
            name: document.getElementById('recipe-name').value,
            imageUrl: imageUrl,
            prepTime: document.getElementById('recipe-prep-time').value,
            cookTime: document.getElementById('recipe-cook-time').value,
            ingredients: document.getElementById('recipe-ingredients').value.split('\n').filter(i => i.trim() !== ''),
            instructions: document.getElementById('recipe-instructions').value.split('\n').filter(i => i.trim() !== ''),
            authorId: 'admin' // Mark official recipes
        };

        try {
            if (isEditing) {
                // Update existing recipe
                await db.collection('public_recipes').doc(id).update(recipeData);
                alert('Recipe updated!');
            } else {
                // Add new recipe with a specific ID
                const newDocRef = db.collection('public_recipes').doc();
                await newDocRef.set({ ...recipeData, id: newDocRef.id });
                alert('Recipe added!');
            }
            resetForm();
        } catch (err) {
            console.error("Error saving recipe: ", err);
            alert('Failed to save recipe. Check console for details.');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Recipe';
        }
    }

    function editRecipe(id) {
        const recipe = allPublicRecipes.find(r => r.id === id);
        if (!recipe) return;

        formTitle.textContent = 'Edit Recipe';
        document.getElementById('recipe-id').value = recipe.id;
        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('recipe-prep-time').value = recipe.prepTime;
        document.getElementById('recipe-cook-time').value = recipe.cookTime;
        document.getElementById('recipe-ingredients').value = (recipe.ingredients || []).join('\n');
        document.getElementById('recipe-instructions').value = (recipe.instructions || []).join('\n');
        
        if (recipe.imageUrl) {
            imagePreview.src = recipe.imageUrl;
            imagePreview.classList.remove('hidden');
        } else {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }
        window.scrollTo(0, 0); // Scroll to top to see the form
    }

    function deleteRecipe(id) {
        if (confirm('Are you sure you want to permanently delete this recipe?')) {
            db.collection('public_recipes').doc(id).delete()
            .then(() => alert("Recipe deleted."))
            .catch(err => {
                console.error("Error deleting recipe: ", err);
                alert("Failed to delete recipe.");
            });
        }
    }
    
    function previewImage() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    function resetForm() {
        recipeForm.reset();
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        formTitle.textContent = 'Add New Recipe';
        document.getElementById('recipe-id').value = '';
    }
});

