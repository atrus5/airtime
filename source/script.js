// This script manages the functionality of the Air Fryer Times application,
// including Firebase authentication, data storage (Firestore and local),
// and all user interface interactions.

document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase Configuration ---
    // This configuration object connects the web app to your Firebase project.
    // Replace the placeholder values with your actual Firebase project credentials.
    const firebaseConfig = {
        apiKey: "AIzaSyCrFfiJJ6GUi-h5gjeJWvWFa5OVDrw_RNk",
        authDomain: "air-fryer-time-master.firebaseapp.com",
        projectId: "air-fryer-time-master",
        storageBucket: "air-fryer-time-master.firebasestorage.app",
        messagingSenderId: "468916758436",
        appId: "1:468916758436:web:871c4b59820e3d7ad6c331",
        measurementId: "G-B4S43HDY18"
    };

    // --- Firebase Initialization ---
    // We initialize Firebase and its services here, inside DOMContentLoaded,
    // to ensure the Firebase scripts have loaded first.
    let app, auth, db, googleProvider;
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        console.log("Firebase initialized successfully.");
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        // If Firebase fails, the app can still run in offline/local mode.
        // The auth and cloud storage features will be disabled.
    }

    // --- DOM Element References ---
    // Get references to all necessary HTML elements to avoid repeated lookups.
    const addTimerModal = document.getElementById('add-timer-modal');
    const exportModal = document.getElementById('export-modal');
    const importModal = document.getElementById('import-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const timerForm = document.getElementById('timer-form');
    const addTimerBtn = document.getElementById('add-timer-btn');
    const timerContainer = document.getElementById('timer-container');
    const noTimers = document.getElementById('no-timers');
    const tempSlider = document.getElementById('temp-slider');
    const tempValue = document.getElementById('temp-value');
    const tempUnitToggle = document.getElementById('temp-unit-toggle');
    const searchInput = document.getElementById('search-input');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtnHeader = document.getElementById('import-btn-header');
    const downloadJsonBtn = document.getElementById('download-json-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const exportDataTextarea = document.getElementById('export-data');
    const importDataTextarea = document.getElementById('import-data');
    const importFileInput = document.getElementById('import-file');
    const importBtnConfirm = document.getElementById('import-btn-confirm');
    const homeBtn = document.getElementById('home-btn');
    const favoritesBtn = document.getElementById('favorites-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const signoutBtn = document.getElementById('signout-btn');
    const userInfoDiv = document.getElementById('user-info');
    const userPhoto = document.getElementById('user-photo');
    const timerIdInput = document.getElementById('timer-id');
    const foodImageInput = document.getElementById('food-image');
    const imagePreview = document.getElementById('image-preview');
    const sortSelect = document.getElementById('sort-by-select');
    const countdownDisplay = document.getElementById('countdown-display');
    const countdownMinutesInput = document.getElementById('countdown-minutes');
    const countdownSecondsInput = document.getElementById('countdown-seconds');
    const countdownStartBtn = document.getElementById('countdown-start-btn');
    const countdownPauseBtn = document.getElementById('countdown-pause-btn');
    const countdownResetBtn = document.getElementById('countdown-reset-btn');
    const countdownInputsDiv = document.getElementById('countdown-inputs');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');

    // --- Application State ---
    // Variables to hold the application's state.
    let timers = []; // Array to store all timer objects
    let isCelsius = true; // Temperature unit flag
    let currentCategory = 'all'; // Currently selected food category
    let showingFavorites = false; // Flag for favorites view
    let currentUser = null; // Holds the signed-in user object
    let unsubscribe; // Firestore listener unsubscribe function
    let countdownInterval; // Interval for the countdown timer
    let countdownTotalSeconds = 0; // Total seconds for the countdown
    let isCountdownPaused = false; // Flag for paused countdown
    let audioCtx; // AudioContext for sound notifications

    /**
     * Initializes the Web Audio API context.
     * This is required to play sounds and must be triggered by a user action.
     */
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Plays a beep sound.
     * @param {number} times - The number of beeps to play.
     * @param {number} duration - The duration of each beep in ms.
     * @param {number} delay - The delay between beeps in ms.
     */
    function beep(times = 3, duration = 150, delay = 100) {
        if (!audioCtx) return;
        let time = audioCtx.currentTime;
        for (let i = 0; i < times; i++) {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, time);
            gainNode.gain.setValueAtTime(0.3, time);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration / 1000);
            oscillator.start(time);
            oscillator.stop(time + duration / 1000);
            time += (duration + delay) / 1000;
        }
    }

    // Initialize audio on the first user click
    document.body.addEventListener('click', initAudio, {
        once: true
    });

    // --- Theme Management ---
    /**
     * Applies the selected theme and updates the icon.
     * @param {string} theme - 'dark' or 'light'.
     */
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

    /**
     * Toggles the color theme between light and dark.
     */
    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }

    // Set initial theme on load
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    // --- Firebase Authentication & Data Loading ---
    // We only set up auth listeners if Firebase initialized correctly.
    if (auth) {
        /**
         * Observer for authentication state changes.
         * Updates the UI and data source based on whether a user is signed in.
         */
        auth.onAuthStateChanged(async user => {
            if (user) {
                // User is signed in
                currentUser = user;
                googleSigninBtn.classList.add('hidden');
                userInfoDiv.classList.remove('hidden');
                userInfoDiv.classList.add('flex');
                userPhoto.src = user.photoURL;

                if (unsubscribe) unsubscribe(); // Detach previous listener
                await migrateLocalToFirestore();
                loadFromFirestore();
                showToast(`Welcome, ${user.displayName}!`, 'success');

            } else {
                // User is signed out
                currentUser = null;
                googleSigninBtn.classList.remove('hidden');
                userInfoDiv.classList.add('hidden');
                userInfoDiv.classList.remove('flex');

                if (unsubscribe) unsubscribe(); // Detach listener
                timers = [];
                loadFromLocalStorage(); // Fallback to local storage
                renderTimers();
            }
        });

        // Sign in with Google
        googleSigninBtn.addEventListener('click', () => {
            auth.signInWithPopup(googleProvider).catch(err => {
                console.error("Sign in error", err);
                showToast(`Error: ${err.message}`, 'error');
            });
        });

        // Sign out
        signoutBtn.addEventListener('click', () => {
            auth.signOut();
            showToast("You've been signed out.", 'success');
        });

    } else {
        // Handle the case where Firebase is not available
        console.log("Firebase not available. Running in local mode.");
        document.getElementById('auth-container').style.display = 'none'; // Hide auth buttons
        loadFromLocalStorage(); // Load local data
        renderTimers();
    }


    // --- Event Listeners ---
    // Theme toggle - Check if the button exists before adding listener
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Close modals
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            addTimerModal.classList.add('hidden');
            exportModal.classList.add('hidden');
            importModal.classList.add('hidden');
        });
    });

    // Open "Add Timer" modal
    addTimerBtn.addEventListener('click', () => {
        timerForm.reset();
        timerIdInput.value = '';
        document.querySelector('#add-timer-modal h2').textContent = "Add New Timer";
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        addTimerModal.classList.remove('hidden');
    });

    // Handle form submission for adding/editing timers
    timerForm.addEventListener('submit', handleSaveTimer);

    // Update UI elements based on user input
    tempSlider.addEventListener('input', updateTempValue);
    tempUnitToggle.addEventListener('change', toggleTempUnit);
    searchInput.addEventListener('input', filterTimers);
    sortSelect.addEventListener('change', filterTimers);

    // Handle category filtering
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;
            showingFavorites = false;
            filterTimers();
            // Update active category styling
            categoryBtns.forEach(b => b.classList.remove('ring-2', 'ring-indigo-500'));
            btn.classList.add('ring-2', 'ring-indigo-500');
            homeBtn.classList.add('text-indigo-600', 'dark:text-indigo-400');
            homeBtn.classList.remove('text-gray-500', 'dark:text-slate-400');
            favoritesBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
            favoritesBtn.classList.add('text-gray-500', 'dark:text-slate-400');
            timerContainer.scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Handle data export/import
    exportBtn.addEventListener('click', () => {
        exportDataTextarea.value = JSON.stringify(timers, null, 2);
        exportModal.classList.remove('hidden');
    });

    importBtnHeader.addEventListener('click', () => {
        importModal.classList.remove('hidden');
    });

    downloadJsonBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(timers));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "air_fryer_timers.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast("Data downloaded successfully!");
    });

    copyJsonBtn.addEventListener('click', () => {
        exportDataTextarea.select();
        document.execCommand('copy');
        showToast("Data copied to clipboard!");
    });

    importBtnConfirm.addEventListener('click', handleImport);

    // --- Navigation ---
    homeBtn.addEventListener('click', () => {
        showingFavorites = false;
        currentCategory = 'all';
        filterTimers();
        categoryBtns.forEach(b => b.classList.remove('ring-2', 'ring-indigo-500'));
        document.querySelector('.category-btn[data-category="all"]').classList.add('ring-2', 'ring-indigo-500');
        homeBtn.classList.add('text-indigo-600', 'dark:text-indigo-400');
        homeBtn.classList.remove('text-gray-500', 'dark:text-slate-400');
        favoritesBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
        favoritesBtn.classList.add('text-gray-500', 'dark:text-slate-400');
    });

    favoritesBtn.addEventListener('click', () => {
        showingFavorites = true;
        filterTimers();
        categoryBtns.forEach(b => b.classList.remove('ring-2', 'ring-indigo-500'));
        favoritesBtn.classList.add('text-indigo-600', 'dark:text-indigo-400');
        favoritesBtn.classList.remove('text-gray-500', 'dark:text-slate-400');
        homeBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
        homeBtn.classList.add('text-gray-500', 'dark:text-slate-400');
    });

    // Handle image preview for file input
    foodImageInput.addEventListener('change', () => {
        const file = foodImageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }
    });

    // Countdown timer controls
    countdownStartBtn.addEventListener('click', startCountdown);
    countdownPauseBtn.addEventListener('click', pauseCountdown);
    countdownResetBtn.addEventListener('click', resetCountdown);

    // --- Core Functions ---
    /**
     * Saves or updates a timer.
     * @param {Event} e - The form submission event.
     */
    async function handleSaveTimer(e) {
        e.preventDefault();
        const id = timerIdInput.value || Date.now().toString();
        const isEditing = !!timerIdInput.value;

        // Helper function to convert a file to a Base64 string
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        let imageUrl = '';
        const imageFile = foodImageInput.files[0];

        if (imageFile) {
            imageUrl = await toBase64(imageFile);
        } else if (isEditing) {
            const existingTimer = timers.find(t => t.id === id);
            imageUrl = existingTimer?.imageUrl || '';
        }

        const timerData = {
            id: id,
            name: document.getElementById('food-name').value,
            imageUrl: imageUrl,
            category: document.getElementById('food-category').value,
            foodState: document.querySelector('input[name="food-state"]:checked').value,
            temperature: parseInt(tempSlider.value),
            tempUnit: isCelsius ? 'C' : 'F',
            minutes: parseInt(document.getElementById('time-minutes').value) || 0,
            seconds: parseInt(document.getElementById('time-seconds').value) || 0,
            notes: document.getElementById('food-notes').value,
            favorite: isEditing ? (timers.find(t => t.id === id)?.favorite || false) : false
        };

        if (currentUser && db) {
            // Save to Firestore if user is logged in
            try {
                await db.collection('users').doc(currentUser.uid).collection('timers').doc(id).set(timerData);
                showToast(`Timer ${isEditing ? 'updated' : 'added'} successfully!`);
            } catch (err) {
                showToast(`Error: ${err.message}`, 'error');
            }
        } else {
            // Save to local storage if user is not logged in or Firebase failed
            if (isEditing) {
                const index = timers.findIndex(t => t.id.toString() === id);
                if (index !== -1) timers[index] = timerData;
            } else {
                timers.unshift(timerData);
            }
            saveToLocalStorage();
            renderTimers();
            showToast(`Timer ${isEditing ? 'updated' : 'added'} successfully!`);
        }

        addTimerModal.classList.add('hidden');
        timerForm.reset();
    }

    /**
     * Imports timer data from a JSON file or text input.
     */
    function handleImport() {
        let importedData;
        const processData = (dataString) => {
            try {
                importedData = JSON.parse(dataString);
                if (!Array.isArray(importedData)) {
                    showToast("Invalid data format!", "error");
                    return;
                }

                if (currentUser && db) {
                    // Batch write to Firestore
                    const batch = db.batch();
                    const collectionRef = db.collection('users').doc(currentUser.uid).collection('timers');
                    importedData.forEach(timer => {
                        const docRef = collectionRef.doc(timer.id.toString());
                        batch.set(docRef, timer);
                    });
                    batch.commit().then(() => {
                        showToast("Data imported to your account!");
                        importModal.classList.add('hidden');
                    }).catch(err => showToast(`Import failed: ${err.message}`, 'error'));
                } else {
                    // Overwrite local storage data
                    timers = importedData;
                    saveToLocalStorage();
                    renderTimers();
                    importModal.classList.add('hidden');
                    showToast("Data imported successfully!");
                }

            } catch (error) {
                showToast("Error parsing JSON data!", "error");
            }
        };

        if (importFileInput.files.length > 0) {
            const file = importFileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => processData(e.target.result);
            reader.readAsText(file);
        } else if (importDataTextarea.value.trim() !== '') {
            processData(importDataTextarea.value);
        } else {
            showToast("No data to import!", "error");
        }
    }

    /**
     * Updates the temperature value display next to the slider.
     */
    function updateTempValue() {
        const temp = tempSlider.value;
        tempValue.textContent = `${temp}°${isCelsius ? 'C' : 'F'}`;
    }

    /**
     * Toggles the temperature unit between Celsius and Fahrenheit.
     */
    function toggleTempUnit() {
        isCelsius = !tempUnitToggle.checked;
        const currentTemp = parseInt(tempSlider.value);
        let newTemp;

        if (isCelsius) {
            // Convert F to C
            newTemp = Math.round((currentTemp - 32) * 5 / 9);
            tempSlider.min = "160";
            tempSlider.max = "230";
            tempSlider.value = Math.max(160, Math.min(230, newTemp));
        } else {
            // Convert C to F
            newTemp = Math.round(currentTemp * 9 / 5 + 32);
            tempSlider.min = "320";
            tempSlider.max = "450";
            tempSlider.value = Math.max(320, Math.min(450, newTemp));
        }
        updateTempValue();
    }

    /**
     * Filters and sorts the timers based on current state.
     */
    function filterTimers() {
        let filteredTimers = [...timers];
        const searchTerm = searchInput.value.toLowerCase();

        // Filter by favorites or category
        if (showingFavorites) {
            filteredTimers = filteredTimers.filter(timer => timer.favorite);
        } else if (currentCategory !== 'all') {
            filteredTimers = filteredTimers.filter(timer => timer.category === currentCategory);
        }

        // Filter by search term
        if (searchTerm) {
            filteredTimers = filteredTimers.filter(timer => timer.name.toLowerCase().includes(searchTerm));
        }

        // Sort the results
        const sortBy = sortSelect.value;
        switch (sortBy) {
            case 'latest':
                filteredTimers.sort((a, b) => b.id - a.id);
                break;
            case 'alpha-asc':
                filteredTimers.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'alpha-desc':
                filteredTimers.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'time-asc':
                filteredTimers.sort((a, b) => (a.minutes * 60 + (a.seconds || 0)) - (b.minutes * 60 + (b.seconds || 0)));
                break;
            case 'time-desc':
                filteredTimers.sort((a, b) => (b.minutes * 60 + (b.seconds || 0)) - (a.minutes * 60 + (a.seconds || 0)));
                break;
        }

        renderFilteredTimers(filteredTimers);
    }

    /**
     * Renders a filtered list of timers to the DOM.
     * @param {Array} filteredTimers - The array of timers to render.
     */
    function renderFilteredTimers(filteredTimers) {
        if (filteredTimers.length === 0) {
            timerContainer.innerHTML = `<div class="text-center py-8 text-gray-500 dark:text-slate-400" id="no-timers-message"><p>${showingFavorites ? 'No favorites found.' : 'No matching timers found.'}</p></div>`;
            return;
        }
        timerContainer.innerHTML = '';
        filteredTimers.forEach(timer => {
            const timeString = timer.seconds > 0 ? `${timer.minutes}m ${timer.seconds}s` : `${timer.minutes} min`;
            // Determine category color for styling
            let categoryColor;
            switch (timer.category) {
                case 'beef':
                    categoryColor = 'red';
                    break;
                case 'chicken':
                    categoryColor = 'orange';
                    break;
                case 'fish':
                    categoryColor = 'blue';
                    break;
                case 'pork':
                    categoryColor = 'pink';
                    break;
                case 'vegetables':
                    categoryColor = 'green';
                    break;
                case 'frozen':
                    categoryColor = 'yellow';
                    break;
                default:
                    categoryColor = 'gray';
            }
            const card = document.createElement('div');
            card.className = 'card bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-slate-600';
            card.innerHTML = `
                ${timer.imageUrl ? `<img src="${timer.imageUrl}" alt="${timer.name}" class="w-full h-40 object-cover">` : ''}
                
                <div class="p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-lg text-gray-800 dark:text-slate-100">${timer.name}</h3>
                            <div class="flex items-center mt-1 space-x-2">
                                <span class="px-2 py-1 bg-${categoryColor}-100 text-${categoryColor}-800 dark:bg-${categoryColor}-900/50 dark:text-${categoryColor}-300 text-xs rounded-full">${timer.category.charAt(0).toUpperCase() + timer.category.slice(1)}</span>
                                <span class="px-2 py-1 bg-${timer.foodState === 'frozen' ? 'blue' : 'green'}-100 text-${timer.foodState === 'frozen' ? 'blue' : 'green'}-800 dark:bg-${timer.foodState === 'frozen' ? 'blue' : 'green'}-900/50 dark:text-${timer.foodState === 'frozen' ? 'blue' : 'green'}-300 text-xs rounded-full">${timer.foodState.charAt(0).toUpperCase() + timer.foodState.slice(1)}</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end">
                            <div class="text-indigo-600 dark:text-indigo-400 font-bold">${timer.temperature}°${timer.tempUnit}</div>
                            <div class="text-gray-500 dark:text-slate-400 text-sm">${timeString}</div>
                        </div>
                    </div>
                    ${timer.notes ? `<p class="text-gray-600 dark:text-slate-300 text-sm mt-2 border-t border-gray-100 dark:border-slate-600 pt-2">${timer.notes}</p>` : ''}
                    <div class="flex justify-end items-center mt-3">
                        <button class="text-indigo-500 dark:text-indigo-400 mr-2 start-main-timer" title="Start this timer" data-minutes="${timer.minutes}" data-seconds="${timer.seconds || 0}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg></button>
                        <button class="text-gray-500 dark:text-slate-400 mr-2 favorite-timer" data-id="${timer.id}" title="Favorite"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${timer.favorite ? 'text-yellow-400 fill-current' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></button>
                        <button class="text-gray-500 dark:text-slate-400 mr-2 edit-timer" data-id="${timer.id}" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button class="text-red-500 dark:text-red-400 delete-timer" data-id="${timer.id}" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>
            `;
            timerContainer.appendChild(card);
            // Add event listeners to the new card's buttons
            card.querySelector('.delete-timer').addEventListener('click', () => deleteTimer(timer.id));
            card.querySelector('.edit-timer').addEventListener('click', () => editTimer(timer));
            card.querySelector('.favorite-timer').addEventListener('click', () => toggleFavorite(timer.id));
            card.querySelector('.start-main-timer').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const minutes = btn.dataset.minutes;
                const seconds = btn.dataset.seconds;
                loadAndStartCountdown(minutes, seconds);
            });
        });
    }

    /**
     * Renders all timers, applying current filters and sorting.
     */
    function renderTimers() {
        if (timers.length === 0) {
            timerContainer.innerHTML = '';
            timerContainer.appendChild(noTimers);
            noTimers.classList.remove('hidden');
            return;
        }
        noTimers.classList.add('hidden');
        filterTimers();
    }

    /**
     * Deletes a timer.
     * @param {string} id - The ID of the timer to delete.
     */
    async function deleteTimer(id) {
        if (confirm("Are you sure you want to delete this timer?")) {
            if (currentUser && db) {
                try {
                    await db.collection('users').doc(currentUser.uid).collection('timers').doc(id.toString()).delete();
                    showToast("Timer deleted successfully!");
                } catch (err) {
                    showToast(`Error: ${err.message}`, 'error');
                }
            } else {
                timers = timers.filter(timer => timer.id.toString() !== id.toString());
                saveToLocalStorage();
                renderTimers();
                showToast("Timer deleted successfully!");
            }
        }
    }

    /**
     * Populates the form to edit an existing timer.
     * @param {object} timerToEdit - The timer object to edit.
     */
    function editTimer(timerToEdit) {
        document.querySelector('#add-timer-modal h2').textContent = "Edit Timer";
        timerIdInput.value = timerToEdit.id;
        document.getElementById('food-name').value = timerToEdit.name;
        document.getElementById('food-category').value = timerToEdit.category;
        document.querySelector(`input[name="food-state"][value="${timerToEdit.foodState}"]`).checked = true;
        tempSlider.value = timerToEdit.temperature;
        tempUnitToggle.checked = timerToEdit.tempUnit === 'F';
        isCelsius = timerToEdit.tempUnit === 'C';
        updateTempValue();
        document.getElementById('time-minutes').value = timerToEdit.minutes;
        document.getElementById('time-seconds').value = timerToEdit.seconds || '';
        document.getElementById('food-notes').value = timerToEdit.notes || '';

        if (timerToEdit.imageUrl) {
            imagePreview.src = timerToEdit.imageUrl;
            imagePreview.classList.remove('hidden');
        } else {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }

        addTimerModal.classList.remove('hidden');
    }

    /**
     * Toggles the favorite status of a timer.
     * @param {string} id - The ID of the timer to toggle.
     */
    async function toggleFavorite(id) {
        const timer = timers.find(t => t.id.toString() === id.toString());
        if (!timer) return;
        const newFavoriteState = !timer.favorite;

        if (currentUser && db) {
            try {
                await db.collection('users').doc(currentUser.uid).collection('timers').doc(id.toString()).update({
                    favorite: newFavoriteState
                });
            } catch (err) {
                showToast(`Error: ${err.message}`, 'error');
            }
        } else {
            timer.favorite = newFavoriteState;
            saveToLocalStorage();
            renderTimers();
        }
    }

    /**
     * Updates the countdown display.
     */
    function updateCountdownDisplay() {
        const minutes = Math.floor(countdownTotalSeconds / 60);
        const seconds = countdownTotalSeconds % 60;
        countdownDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Starts the countdown timer.
     */
    function startCountdown() {
        if (!isCountdownPaused) {
            const minutes = parseInt(countdownMinutesInput.value) || 0;
            const seconds = parseInt(countdownSecondsInput.value) || 0;
            countdownTotalSeconds = (minutes * 60) + seconds;
        }

        if (countdownTotalSeconds <= 0) {
            showToast("Please set a time first.", "error");
            return;
        }

        initAudio();
        isCountdownPaused = false;
        countdownStartBtn.classList.add('hidden');
        countdownPauseBtn.classList.remove('hidden');
        countdownInputsDiv.classList.add('hidden');

        countdownInterval = setInterval(() => {
            countdownTotalSeconds--;
            updateCountdownDisplay();

            if (countdownTotalSeconds <= 0) {
                clearInterval(countdownInterval);
                beep();
                resetCountdown();
                showToast("Time's up!", "success");
            }
        }, 1000);
    }

    /**
     * Pauses the countdown timer.
     */
    function pauseCountdown() {
        isCountdownPaused = true;
        clearInterval(countdownInterval);
        countdownStartBtn.classList.remove('hidden');
        countdownPauseBtn.classList.add('hidden');
    }

    /**
     * Resets the countdown timer.
     */
    function resetCountdown() {
        clearInterval(countdownInterval);
        isCountdownPaused = false;
        countdownTotalSeconds = 0;
        updateCountdownDisplay();
        countdownMinutesInput.value = '';
        countdownSecondsInput.value = '';
        countdownStartBtn.classList.remove('hidden');
        countdownPauseBtn.classList.add('hidden');
        countdownInputsDiv.classList.remove('hidden');
    }

    /**
     * Loads a preset time into the countdown and starts it.
     * @param {string|number} minutes - The minutes for the timer.
     * @param {string|number} seconds - The seconds for the timer.
     */
    function loadAndStartCountdown(minutes, seconds) {
        resetCountdown();
        countdownMinutesInput.value = minutes;
        countdownSecondsInput.value = seconds;
        startCountdown();
        document.getElementById('countdown-timer-section').scrollIntoView({
            behavior: 'smooth'
        });
    }

    /**
     * Saves the current timers array to local storage.
     */
    function saveToLocalStorage() {
        if (currentUser) return; // Don't save to local if logged in
        localStorage.setItem('airFryerTimers', JSON.stringify(timers));
    }

    /**
     * Loads timers from local storage or populates with sample data.
     */
    function loadFromLocalStorage() {
        const savedTimers = localStorage.getItem('airFryerTimers');
        if (savedTimers) {
            timers = JSON.parse(savedTimers);
        } else {
            timers = getSampleTimers(); // Load sample for new users
        }
        renderTimers();
    }

    /**
     * Loads timers from Firestore for the current user.
     */
    function loadFromFirestore() {
        if (!currentUser || !db) return;
        const collectionRef = db.collection('users').doc(currentUser.uid).collection('timers');

        // Listen for real-time updates
        unsubscribe = collectionRef.onSnapshot(snapshot => {
            timers = snapshot.docs.map(doc => doc.data());
            renderTimers();
        }, error => {
            console.error("Error fetching timers:", error);
            showToast("Could not load timers from the cloud.", "error");
        });
    }

    /**
     * Migrates data from local storage to Firestore upon first sign-in.
     */
    async function migrateLocalToFirestore() {
        const localData = localStorage.getItem('airFryerTimers');
        if (!localData || !currentUser || !db) return;

        const collectionRef = db.collection('users').doc(currentUser.uid).collection('timers');
        const snapshot = await collectionRef.limit(1).get();

        // Only migrate if the user has no data in Firestore
        if (snapshot.empty) {
            console.log("Cloud is empty, migrating local data...");
            const localTimers = JSON.parse(localData);
            const batch = db.batch();
            localTimers.forEach(timer => {
                const docRef = collectionRef.doc(timer.id.toString());
                batch.set(docRef, timer);
            });
            await batch.commit();
            localStorage.removeItem('airFryerTimers'); // Clean up local data
            showToast('Your local data has been moved to your account!', 'success');
        }
    }

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {string} type - 'success' or 'error'.
     */
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = `toast shadow-lg flex items-center text-white px-4 py-3 rounded-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    /**
     * Returns an array of sample timers for new users.
     * @returns {Array<object>}
     */
    function getSampleTimers() {
        return [{
            id: 1,
            name: "Chicken Breast (6 oz)",
            category: "chicken",
            foodState: "fresh",
            temperature: 190,
            tempUnit: "C",
            minutes: 15,
            seconds: 0,
            notes: "Flip halfway through.",
            favorite: false
        }, {
            id: 2,
            name: "Ribeye Steak (1 inch)",
            category: "beef",
            foodState: "fresh",
            temperature: 200,
            tempUnit: "C",
            minutes: 12,
            seconds: 0,
            notes: "For medium rare.",
            favorite: true
        }, {
            id: 6,
            name: "Brussels Sprouts",
            category: "vegetables",
            foodState: "fresh",
            temperature: 190,
            tempUnit: "C",
            minutes: 10,
            seconds: 0,
            notes: "Toss with olive oil.",
            favorite: true
        }, {
            id: 10,
            name: "Frozen Mozzarella Sticks",
            category: "frozen",
            foodState: "frozen",
            temperature: 190,
            tempUnit: "C",
            minutes: 6,
            seconds: 0,
            notes: "No need to thaw.",
            favorite: false
        }, ];
    }
});

