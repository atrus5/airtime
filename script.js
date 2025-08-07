console.log("Executing script.js version 3.0 - Flip Feature");

document.addEventListener('DOMContentLoaded', function() {
    // --- THEME MANAGEMENT ---
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (themeIconDark) themeIconDark.classList.add('hidden');
            if (themeIconLight) themeIconLight.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            if (themeIconDark) themeIconDark.classList.remove('hidden');
            if (themeIconLight) themeIconLight.classList.add('hidden');
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
    
    let app, auth, db, googleProvider;
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        googleProvider = new firebase.auth.GoogleAuthProvider();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }

    // --- DOM ELEMENT REFERENCES ---
    const authModal = document.getElementById('auth-modal');
    const openAuthModalBtn = document.getElementById('open-auth-modal-btn');
    const signinView = document.getElementById('signin-view');
    const signupView = document.getElementById('signup-view');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const showSigninBtn = document.getElementById('show-signin-btn');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const googleSigninBtnModal = document.getElementById('google-signin-btn-modal');
    const userDisplayName = document.getElementById('user-display-name');
    const addTimerModal = document.getElementById('add-timer-modal');
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
    const homeBtn = document.getElementById('home-btn');
    const favoritesBtn = document.getElementById('favorites-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
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

    // --- APPLICATION STATE ---
    let timers = [];
    let isCelsius = true;
    let currentCategory = 'all';
    let showingFavorites = false;
    let currentUser = null;
    let unsubscribe;
    let countdownInterval;
    let flipTimeout; // <-- State for the flip timer
    let countdownTotalSeconds = 0;
    let isCountdownPaused = false;
    let audioCtx;

    // --- FUNCTION DEFINITIONS ---
    function initAudio() { if (!audioCtx) { audioCtx = new(window.AudioContext || window.webkitAudioContext)(); } }
    function beep(times = 5, duration = 400, delay = 150) { if (!audioCtx) return; let time = audioCtx.currentTime; for (let i = 0; i < times; i++) { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.type = 'sine'; o.frequency.setValueAtTime(880, time); g.gain.setValueAtTime(0.8, time); g.gain.exponentialRampToValueAtTime(0.0001, time + duration / 1000); o.start(time); o.stop(time + duration / 1000); time += (duration + delay) / 1000; } }
    function flipBeep() { beep(2, 200, 100); } // <-- Shorter, distinct beep for flipping
    document.body.addEventListener('click', initAudio, { once: true });

    if (auth) {
        auth.onAuthStateChanged(async user => {
            if (user) {
                currentUser = user;
                openAuthModalBtn.classList.add('hidden');
                userInfoDiv.classList.remove('hidden');
                userInfoDiv.classList.add('flex');
                if(user.photoURL) {
                    userPhoto.src = user.photoURL;
                    userPhoto.classList.remove('hidden');
                    userDisplayName.classList.add('hidden');
                } else {
                    userPhoto.classList.add('hidden');
                    userDisplayName.textContent = user.displayName;
                    userDisplayName.classList.remove('hidden');
                }
                if (unsubscribe) unsubscribe();
                await migrateLocalToFirestore();
                loadFromFirestore();
                showToast(`Welcome, ${user.displayName || 'friend'}!`, 'success');
            } else {
                currentUser = null;
                openAuthModalBtn.classList.remove('hidden');
                userInfoDiv.classList.add('hidden');
                userInfoDiv.classList.remove('flex');
                if (unsubscribe) unsubscribe();
                timers = [];
                loadFromLocalStorage();
                renderTimers();
            }
        });
        
        googleSigninBtnModal.addEventListener('click', () => { auth.signInWithPopup(googleProvider).then(() => authModal.classList.add('hidden')).catch(err => { console.error("Sign in error", err); showToast(`Error: ${err.message}`, 'error'); }); });
        signoutBtn.addEventListener('click', () => { auth.signOut(); showToast("You've been signed out.", 'success'); });

        signinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;
            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    authModal.classList.add('hidden');
                })
                .catch(err => {
                    showToast(err.message, 'error');
                });
        });

        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return userCredential.user.updateProfile({
                        displayName: name
                    }).then(() => {
                         authModal.classList.add('hidden');
                    });
                })
                .catch(err => {
                    showToast(err.message, 'error');
                });
        });

    } else {
        document.getElementById('auth-container').style.display = 'none';
        loadFromLocalStorage();
        renderTimers();
    }
    
    openAuthModalBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
    showSignupBtn.addEventListener('click', () => { signinView.classList.add('hidden'); signupView.classList.remove('hidden'); document.getElementById('auth-modal-title').textContent = 'Sign Up'; });
    showSigninBtn.addEventListener('click', () => { signupView.classList.add('hidden'); signinView.classList.remove('hidden'); document.getElementById('auth-modal-title').textContent = 'Sign In'; });

    closeModalBtns.forEach(btn => { btn.addEventListener('click', () => { addTimerModal.classList.add('hidden'); authModal.classList.add('hidden'); }); });
    addTimerBtn.addEventListener('click', () => { timerForm.reset(); timerIdInput.value = ''; document.querySelector('#add-timer-modal h2').textContent = "Add New Timer"; imagePreview.src = ''; imagePreview.classList.add('hidden'); addTimerModal.classList.remove('hidden'); });
    timerForm.addEventListener('submit', handleSaveTimer);
    tempSlider.addEventListener('input', updateTempValue);
    tempUnitToggle.addEventListener('change', toggleTempUnit);
    searchInput.addEventListener('input', filterTimers);
    sortSelect.addEventListener('change', filterTimers);
    categoryBtns.forEach(btn => { btn.addEventListener('click', () => { currentCategory = btn.dataset.category; showingFavorites = false; filterTimers(); categoryBtns.forEach(b => b.classList.remove('ring-2', 'ring-indigo-500')); btn.classList.add('ring-2', 'ring-indigo-500'); homeBtn.classList.add('text-indigo-600', 'dark:text-indigo-400'); homeBtn.classList.remove('text-gray-500', 'dark:text-slate-400'); favoritesBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400'); favoritesBtn.classList.add('text-gray-500', 'dark:text-slate-400'); timerContainer.scrollIntoView({ behavior: 'smooth' }); }); });
    
    if(homeBtn) {
        homeBtn.addEventListener('click', () => { 
            // This is a link now, so JS interaction for view switching isn't needed,
            // but we keep the style handling for when the page loads.
        });
    }

    if(favoritesBtn) {
        favoritesBtn.addEventListener('click', () => { 
            showingFavorites = true; 
            filterTimers(); 
            categoryBtns.forEach(b => b.classList.remove('ring-2', 'ring-indigo-500')); 
            favoritesBtn.classList.add('text-indigo-600', 'dark:text-indigo-400'); 
            favoritesBtn.classList.remove('text-gray-500', 'dark:text-slate-400'); 
            homeBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400'); 
            homeBtn.classList.add('text-gray-500', 'dark:text-slate-400'); 
        });
    }

    foodImageInput.addEventListener('change', () => { const file = foodImageInput.files[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { imagePreview.src = e.target.result; imagePreview.classList.remove('hidden'); }; reader.readAsDataURL(file); } else { imagePreview.src = ''; imagePreview.classList.add('hidden'); } });
    countdownStartBtn.addEventListener('click', () => startCountdown(null));
    countdownPauseBtn.addEventListener('click', pauseCountdown);
    countdownResetBtn.addEventListener('click', resetCountdown);

    async function handleSaveTimer(e) { e.preventDefault(); const id = timerIdInput.value || Date.now().toString(); const isEditing = !!timerIdInput.value; const toBase64 = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); let imageUrl = ''; const imageFile = foodImageInput.files[0]; if (imageFile) { imageUrl = await toBase64(imageFile); } else if (isEditing) { const existingTimer = timers.find(t => t.id === id); imageUrl = existingTimer?.imageUrl || ''; } 
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
            favorite: isEditing ? (timers.find(t => t.id === id)?.favorite || false) : false,
            flip: document.getElementById('flip-reminder').checked // <-- Save flip preference
        }; 
        if (currentUser && db) { try { await db.collection('users').doc(currentUser.uid).collection('timers').doc(id).set(timerData); showToast(`Timer ${isEditing ? 'updated' : 'added'}!`); } catch (err) { showToast(`Error: ${err.message}`, 'error'); } } else { if (isEditing) { const index = timers.findIndex(t => t.id.toString() === id); if (index !== -1) timers[index] = timerData; } else { timers.unshift(timerData); } saveToLocalStorage(); renderTimers(); showToast(`Timer ${isEditing ? 'updated' : 'added'}!`); } addTimerModal.classList.add('hidden'); timerForm.reset(); }
    
    function updateTempValue() { const temp = tempSlider.value; tempValue.textContent = `${temp}°${isCelsius ? 'C' : 'F'}`; }
    function toggleTempUnit() { isCelsius = !tempUnitToggle.checked; const currentTemp = parseInt(tempSlider.value); let newTemp; if (isCelsius) { newTemp = Math.round((currentTemp - 32) * 5 / 9); tempSlider.min = "160"; tempSlider.max = "230"; tempSlider.value = Math.max(160, Math.min(230, newTemp)); } else { newTemp = Math.round(currentTemp * 9 / 5 + 32); tempSlider.min = "320"; tempSlider.max = "450"; tempSlider.value = Math.max(320, Math.min(450, newTemp)); } updateTempValue(); }
    function filterTimers() { let filteredTimers = [...timers]; const searchTerm = searchInput.value.toLowerCase(); if (showingFavorites) { filteredTimers = filteredTimers.filter(timer => timer.favorite); } else if (currentCategory !== 'all') { filteredTimers = filteredTimers.filter(timer => timer.category === currentCategory); } if (searchTerm) { filteredTimers = filteredTimers.filter(timer => timer.name.toLowerCase().includes(searchTerm)); } const sortBy = sortSelect.value; switch (sortBy) { case 'latest': filteredTimers.sort((a, b) => b.id - a.id); break; case 'alpha-asc': filteredTimers.sort((a, b) => a.name.localeCompare(b.name)); break; case 'alpha-desc': filteredTimers.sort((a, b) => b.name.localeCompare(a.name)); break; case 'time-asc': filteredTimers.sort((a, b) => (a.minutes * 60 + (a.seconds || 0)) - (b.minutes * 60 + (b.seconds || 0))); break; case 'time-desc': filteredTimers.sort((a, b) => (b.minutes * 60 + (b.seconds || 0)) - (a.minutes * 60 + (a.seconds || 0))); break; } renderFilteredTimers(filteredTimers); }
    function renderFilteredTimers(filteredTimers) { if (filteredTimers.length === 0) { timerContainer.innerHTML = `<div class="text-center py-8 text-gray-500 dark:text-slate-400" id="no-timers-message"><p>${showingFavorites ? 'No favorites found.' : 'No matching timers found.'}</p></div>`; return; } timerContainer.innerHTML = ''; filteredTimers.forEach(timer => { const timeString = timer.seconds > 0 ? `${timer.minutes}m ${timer.seconds}s` : `${timer.minutes} min`; let categoryColor; switch (timer.category) { case 'beef': categoryColor = 'red'; break; case 'chicken': categoryColor = 'orange'; break; case 'fish': categoryColor = 'blue'; break; case 'pork': categoryColor = 'pink'; break; case 'vegetables': categoryColor = 'green'; break; case 'frozen': categoryColor = 'yellow'; break; default: categoryColor = 'gray'; } 
        const flipIcon = timer.flip ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.543 11.457a1 1 0 00-1.414-1.414L12 12.172V4a1 1 0 10-2 0v8.172l-2.129-2.129a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /><path d="M4.457 8.543a1 1 0 001.414 1.414L8 7.828V16a1 1 0 102 0V7.828l2.129 2.129a1 1 0 001.414-1.414l-4-4a1 1 0 00-1.414 0l-4 4z" /></svg>` : '';
        const card = document.createElement('div'); card.className = 'card bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-slate-600'; card.innerHTML = `${timer.imageUrl ? `<img src="${timer.imageUrl}" alt="${timer.name}" class="w-full h-40 object-cover">` : ''}<div class="p-4"><div class="flex justify-between items-start"><div><h3 class="font-bold text-lg text-gray-800 dark:text-slate-100">${timer.name}</h3><div class="flex items-center mt-1 space-x-2"><span class="px-2 py-1 bg-${categoryColor}-100 text-${categoryColor}-800 dark:bg-${categoryColor}-900/50 dark:text-${categoryColor}-300 text-xs rounded-full">${timer.category.charAt(0).toUpperCase() + timer.category.slice(1)}</span><span class="px-2 py-1 bg-${timer.foodState === 'frozen' ? 'blue' : 'green'}-100 text-${timer.foodState === 'frozen' ? 'blue' : 'green'}-800 dark:bg-${timer.foodState === 'frozen' ? 'blue' : 'green'}-900/50 dark:text-${timer.foodState === 'frozen' ? 'blue' : 'green'}-300 text-xs rounded-full">${timer.foodState.charAt(0).toUpperCase() + timer.foodState.slice(1)}</span></div></div><div class="flex flex-col items-end"><div class="text-indigo-600 dark:text-indigo-400 font-bold">${timer.temperature}°${timer.tempUnit}</div><div class="flex items-center text-gray-500 dark:text-slate-400 text-sm">${timeString} ${flipIcon}</div></div></div>${timer.notes ? `<p class="text-gray-600 dark:text-slate-300 text-sm mt-2 border-t border-gray-100 dark:border-slate-600 pt-2">${timer.notes}</p>` : ''}<div class="flex justify-end items-center mt-3"><button class="text-indigo-500 dark:text-indigo-400 mr-2 start-main-timer" title="Start this timer" data-id="${timer.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg></button><button class="text-gray-500 dark:text-slate-400 mr-2 favorite-timer" data-id="${timer.id}" title="Favorite"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${timer.favorite ? 'text-yellow-400 fill-current' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></button><button class="text-gray-500 dark:text-slate-400 mr-2 edit-timer" data-id="${timer.id}" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button class="text-red-500 dark:text-red-400 delete-timer" data-id="${timer.id}" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></div>`; timerContainer.appendChild(card); card.querySelector('.delete-timer').addEventListener('click', () => deleteTimer(timer.id)); card.querySelector('.edit-timer').addEventListener('click', () => editTimer(timer)); card.querySelector('.favorite-timer').addEventListener('click', () => toggleFavorite(timer.id)); card.querySelector('.start-main-timer').addEventListener('click', (e) => { const timerId = e.currentTarget.dataset.id; const timerToStart = timers.find(t => t.id === timerId); if (timerToStart) loadAndStartCountdown(timerToStart); }); }); }
    function renderTimers() { if (!timers || timers.length === 0) { timerContainer.innerHTML = ''; timerContainer.appendChild(noTimers); noTimers.classList.remove('hidden'); return; } noTimers.classList.add('hidden'); filterTimers(); }
    async function deleteTimer(id) { if (confirm("Are you sure?")) { if (currentUser && db) { try { await db.collection('users').doc(currentUser.uid).collection('timers').doc(id.toString()).delete(); showToast("Timer deleted!"); } catch (err) { showToast(`Error: ${err.message}`, 'error'); } } else { timers = timers.filter(timer => timer.id.toString() !== id.toString()); saveToLocalStorage(); renderTimers(); showToast("Timer deleted!"); } } }
    function editTimer(timerToEdit) { document.querySelector('#add-timer-modal h2').textContent = "Edit Timer"; timerIdInput.value = timerToEdit.id; document.getElementById('food-name').value = timerToEdit.name; document.getElementById('food-category').value = timerToEdit.category; document.querySelector(`input[name="food-state"][value="${timerToEdit.foodState}"]`).checked = true; tempSlider.value = timerToEdit.temperature; tempUnitToggle.checked = timerToEdit.tempUnit === 'F'; isCelsius = timerToEdit.tempUnit === 'C'; updateTempValue(); document.getElementById('time-minutes').value = timerToEdit.minutes; document.getElementById('time-seconds').value = timerToEdit.seconds || ''; document.getElementById('food-notes').value = timerToEdit.notes || ''; document.getElementById('flip-reminder').checked = timerToEdit.flip || false; if (timerToEdit.imageUrl) { imagePreview.src = timerToEdit.imageUrl; imagePreview.classList.remove('hidden'); } else { imagePreview.src = ''; imagePreview.classList.add('hidden'); } addTimerModal.classList.remove('hidden'); }
    async function toggleFavorite(id) { const timer = timers.find(t => t.id.toString() === id.toString()); if (!timer) return; const newFavoriteState = !timer.favorite; if (currentUser && db) { try { await db.collection('users').doc(currentUser.uid).collection('timers').doc(id.toString()).update({ favorite: newFavoriteState }); } catch (err) { showToast(`Error: ${err.message}`, 'error'); } } else { timer.favorite = newFavoriteState; saveToLocalStorage(); renderTimers(); } }
    function updateCountdownDisplay() { const minutes = Math.floor(countdownTotalSeconds / 60); const seconds = countdownTotalSeconds % 60; countdownDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }
    function startCountdown(timer = null) { 
        if (!isCountdownPaused) { 
            const minutes = parseInt(countdownMinutesInput.value) || 0; 
            const seconds = parseInt(countdownSecondsInput.value) || 0; 
            countdownTotalSeconds = (minutes * 60) + seconds; 
        } 
        if (countdownTotalSeconds <= 0) { showToast("Set a time first.", "error"); return; } 
        initAudio(); 
        isCountdownPaused = false; 
        countdownStartBtn.classList.add('hidden'); 
        countdownPauseBtn.classList.remove('hidden'); 
        countdownInputsDiv.classList.add('hidden'); 
        
        // Set flip reminder if applicable
        if (timer && timer.flip && countdownTotalSeconds > 1) {
            const flipTime = Math.floor(countdownTotalSeconds / 2);
            flipTimeout = setTimeout(() => {
                showToast("Time to Flip!", "success");
                flipBeep();
            }, flipTime * 1000);
        }

        countdownInterval = setInterval(() => { 
            countdownTotalSeconds--; 
            updateCountdownDisplay(); 
            if (countdownTotalSeconds <= 0) { 
                clearInterval(countdownInterval); 
                clearTimeout(flipTimeout); // Clear flip timeout as well
                beep(); 
                resetCountdown(); 
                showToast("Time's up!", "success"); 
            } 
        }, 1000); 
    }
    function pauseCountdown() { isCountdownPaused = true; clearInterval(countdownInterval); clearTimeout(flipTimeout); countdownStartBtn.classList.remove('hidden'); countdownPauseBtn.classList.add('hidden'); }
    function resetCountdown() { clearInterval(countdownInterval); clearTimeout(flipTimeout); isCountdownPaused = false; countdownTotalSeconds = 0; updateCountdownDisplay(); countdownMinutesInput.value = ''; countdownSecondsInput.value = ''; countdownStartBtn.classList.remove('hidden'); countdownPauseBtn.classList.add('hidden'); countdownInputsDiv.classList.remove('hidden'); }
    function loadAndStartCountdown(timer) { resetCountdown(); countdownMinutesInput.value = timer.minutes; countdownSecondsInput.value = timer.seconds; startCountdown(timer); document.getElementById('countdown-timer-section').scrollIntoView({ behavior: 'smooth' }); }
    function saveToLocalStorage() { if (currentUser) return; localStorage.setItem('airFryerTimers', JSON.stringify(timers)); }
    function loadFromLocalStorage() { const savedTimers = localStorage.getItem('airFryerTimers'); if (savedTimers) { timers = JSON.parse(savedTimers); } else { timers = getSampleTimers(); } renderTimers(); }
    function loadFromFirestore() { if (!currentUser || !db) return; const collectionRef = db.collection('users').doc(currentUser.uid).collection('timers'); unsubscribe = collectionRef.onSnapshot(snapshot => { timers = snapshot.docs.map(doc => doc.data()); renderTimers(); }, error => { console.error("Error fetching timers:", error); showToast("Could not load timers.", "error"); }); }
    async function migrateLocalToFirestore() { const localData = localStorage.getItem('airFryerTimers'); if (!localData || !currentUser || !db) return; const collectionRef = db.collection('users').doc(currentUser.uid).collection('timers'); const snapshot = await collectionRef.limit(1).get(); if (snapshot.empty) { const localTimers = JSON.parse(localData); const batch = db.batch(); localTimers.forEach(timer => { const docRef = collectionRef.doc(timer.id.toString()); batch.set(docRef, timer); }); await batch.commit(); localStorage.removeItem('airFryerTimers'); showToast('Local data moved to account!', 'success'); } }
    function showToast(message, type = 'success') { toastMessage.textContent = message; toast.className = `toast shadow-lg flex items-center text-white px-4 py-3 rounded-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); }
    function getSampleTimers() { return [{ id: 1, name: "Chicken Breast (6 oz)", category: "chicken", foodState: "fresh", temperature: 190, tempUnit: "C", minutes: 15, seconds: 0, notes: "Flip halfway through.", favorite: false, flip: true }, { id: 2, name: "Ribeye Steak (1 inch)", category: "beef", foodState: "fresh", temperature: 200, tempUnit: "C", minutes: 12, seconds: 0, notes: "For medium rare.", favorite: true, flip: false }, { id: 6, name: "Brussels Sprouts", category: "vegetables", foodState: "fresh", temperature: 190, tempUnit: "C", minutes: 10, seconds: 0, notes: "Toss with olive oil.", favorite: true, flip: true }, { id: 10, name: "Frozen Mozzarella Sticks", category: "frozen", foodState: "frozen", temperature: 190, tempUnit: "C", minutes: 6, seconds: 0, notes: "No need to thaw.", favorite: false, flip: false }, ]; }
});

