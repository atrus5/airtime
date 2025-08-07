console.log("Executing profile.js version 1.2 - Added user stats and lists");

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
    
    let app, auth, storage, db;
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        storage = firebase.storage();
        db = firebase.firestore();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        return;
    }

    // --- DOM REFERENCES ---
    const profileLoading = document.getElementById('profile-loading');
    const profileContent = document.getElementById('profile-content');
    const profileImagePreview = document.getElementById('profile-image-preview');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const changePhotoBtn = document.getElementById('change-photo-btn');
    const profileDetailsForm = document.getElementById('profile-details-form');
    const displayNameInput = document.getElementById('display-name');
    const emailAddressInput = document.getElementById('email-address');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const themeToggleBtnHeader = document.getElementById('theme-toggle-btn-header');
    const themeIconDarkHeader = document.getElementById('theme-icon-dark-header');
    const themeIconLightHeader = document.getElementById('theme-icon-light-header');
    const recipeCountEl = document.getElementById('recipe-count');
    const timerCountEl = document.getElementById('timer-count');
    const favoriteTimersList = document.getElementById('favorite-timers-list');
    const myRecipesList = document.getElementById('my-recipes-list');


    let currentUser = null;

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
            loadProfileData();
            loadUserStats();
        } else {
            // User is not logged in. Show a message instead of redirecting immediately.
            profileLoading.innerHTML = `
                <p class="text-gray-500 dark:text-slate-400">You must be logged in to view this page.</p>
                <a href="index.html" class="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline">Go to Homepage to Sign In</a>
            `;
            profileLoading.classList.remove('hidden');
            profileContent.classList.add('hidden');
        }
    });

    function loadProfileData() {
        if (!currentUser) return;

        displayNameInput.value = currentUser.displayName || '';
        emailAddressInput.value = currentUser.email || '';
        if (currentUser.photoURL) {
            profileImagePreview.src = currentUser.photoURL;
        }

        // Disable password change for Google/social sign-ins
        if (currentUser.providerData.some(provider => provider.providerId === 'google.com')) {
            changePasswordBtn.disabled = true;
            changePasswordBtn.textContent = 'Password managed by Google';
            changePasswordBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        profileLoading.classList.add('hidden');
        profileContent.classList.remove('hidden');
    }

    async function loadUserStats() {
        if (!currentUser) return;

        try {
            // Get Timers
            const timersSnapshot = await db.collection('users').doc(currentUser.uid).collection('timers').get();
            const timers = timersSnapshot.docs.map(doc => doc.data());
            const favoriteTimers = timers.filter(t => t.favorite);

            timerCountEl.textContent = timers.length;
            renderFavoriteTimers(favoriteTimers);

            // Get Recipes
            const recipesSnapshot = await db.collection('users').doc(currentUser.uid).collection('recipes').get();
            const recipes = recipesSnapshot.docs.map(doc => doc.data());
            
            recipeCountEl.textContent = recipes.length;
            renderMyRecipes(recipes);

        } catch (error) {
            console.error("Error loading user stats:", error);
            showToast("Could not load your stats.", "error");
        }
    }

    function renderFavoriteTimers(timers) {
        favoriteTimersList.innerHTML = '';
        if (timers.length === 0) {
            favoriteTimersList.innerHTML = '<p class="text-sm text-gray-500 dark:text-slate-400">No favorite timers yet. You can favorite them on the Timers page.</p>';
            return;
        }
        timers.forEach(timer => {
            const item = document.createElement('div');
            item.className = 'p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center';
            item.innerHTML = `
                <div>
                    <p class="font-medium text-gray-800 dark:text-slate-200">${timer.name}</p>
                    <p class="text-xs text-gray-500 dark:text-slate-400">${timer.minutes}m ${timer.seconds || 0}s at ${timer.temperature}°${timer.tempUnit}</p>
                </div>
                <a href="index.html" class="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">View</a>
            `;
            favoriteTimersList.appendChild(item);
        });
    }

    function renderMyRecipes(recipes) {
        myRecipesList.innerHTML = '';
        if (recipes.length === 0) {
            myRecipesList.innerHTML = '<p class="text-sm text-gray-500 dark:text-slate-400">You haven\'t created any recipes yet. You can add them on the Recipes page.</p>';
            return;
        }
        recipes.forEach(recipe => {
            const item = document.createElement('div');
            item.className = 'p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center';
            item.innerHTML = `
                <div>
                    <p class="font-medium text-gray-800 dark:text-slate-200">${recipe.name}</p>
                    <p class="text-xs text-gray-500 dark:text-slate-400">Cook time: ${recipe.cookTime || 'N/A'} min</p>
                </div>
                <a href="recipes.html" class="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">View</a>
            `;
            myRecipesList.appendChild(item);
        });
    }

    // --- EVENT LISTENERS ---
    changePhotoBtn.addEventListener('click', () => {
        profileImageUpload.click();
    });

    profileImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show a preview
        const reader = new FileReader();
        reader.onload = (event) => {
            profileImagePreview.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    profileDetailsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newDisplayName = displayNameInput.value.trim();
        const imageFile = profileImageUpload.files[0];

        if (!newDisplayName) {
            showToast("Display name cannot be empty.", "error");
            return;
        }

        const submitButton = profileDetailsForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';

        try {
            let photoURL = currentUser.photoURL;
            // If a new image was selected, upload it
            if (imageFile) {
                const filePath = `profile_pictures/${currentUser.uid}/${imageFile.name}`;
                const fileSnapshot = await storage.ref(filePath).put(imageFile);
                photoURL = await fileSnapshot.ref.getDownloadURL();
            }

            // Update profile
            await currentUser.updateProfile({
                displayName: newDisplayName,
                photoURL: photoURL
            });
            
            showToast("Profile updated successfully!", "success");
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast(`Error: ${error.message}`, "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Changes';
        }
    });

    changePasswordBtn.addEventListener('click', () => {
        if (!currentUser || !currentUser.email) {
            showToast("Could not send reset email.", "error");
            return;
        }
        auth.sendPasswordResetEmail(currentUser.email)
            .then(() => {
                showToast("Password reset email sent! Check your inbox.", "success");
            })
            .catch((error) => {
                console.error("Error sending password reset email:", error);
                showToast(`Error: ${error.message}`, "error");
            });
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // --- UTILITIES ---
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = `toast shadow-lg flex items-center text-white px-4 py-3 rounded-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});

