console.log("Executing cook-mode.js version 1.0");

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
        document.getElementById('loading-view').textContent = 'Error connecting to the database.';
    }

    // --- DOM REFERENCES ---
    const loadingView = document.getElementById('loading-view');
    const cookModeView = document.getElementById('cook-mode-view');
    const recipeTitleEl = document.getElementById('recipe-title');
    const instructionTextEl = document.getElementById('instruction-text');
    const stepCounterEl = document.getElementById('step-counter');
    const prevStepBtn = document.getElementById('prev-step');
    const nextStepBtn = document.getElementById('next-step');
    const exitCookModeBtn = document.getElementById('exit-cook-mode');

    // --- STATE ---
    let currentRecipe = null;
    let currentStep = -1; // -1 represents the welcome message
    let wakeLock = null;

    // --- FUNCTIONS ---

    // Function to acquire a screen wake lock
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Screen Wake Lock is active.');
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
            }
        }
    };

    // Function to release the screen wake lock
    const releaseWakeLock = async () => {
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
            console.log('Screen Wake Lock released.');
        }
    };

    async function getRecipeData(recipeId) {
        // Check public recipes first
        let doc = await db.collection('public_recipes').doc(recipeId).get();
        if (doc.exists) return doc.data();

        // Then check community recipes
        doc = await db.collection('community_recipes').doc(recipeId).get();
        if (doc.exists) return doc.data();

        // Finally, check user's private recipes if logged in
        if (auth.currentUser) {
            doc = await db.collection('users').doc(auth.currentUser.uid).collection('recipes').doc(recipeId).get();
            if (doc.exists) return doc.data();
        }
        
        return null;
    }

    function updateStepUI() {
        const totalSteps = currentRecipe.instructions.length;
        
        if (currentStep === -1) {
            instructionTextEl.textContent = "Welcome to Cook Mode! Tap next to begin.";
            stepCounterEl.textContent = `Step 0 / ${totalSteps}`;
        } else {
            instructionTextEl.textContent = currentRecipe.instructions[currentStep];
            stepCounterEl.textContent = `Step ${currentStep + 1} / ${totalSteps}`;
        }

        prevStepBtn.disabled = currentStep <= -1;
        nextStepBtn.textContent = currentStep >= totalSteps - 1 ? 'Finish' : 'Next';
    }

    function handleNextStep() {
        if (currentStep < currentRecipe.instructions.length - 1) {
            currentStep++;
            updateStepUI();
        } else {
            // Finish button was clicked
            window.close();
        }
    }

    function handlePrevStep() {
        if (currentStep > -1) {
            currentStep--;
            updateStepUI();
        }
    }

    // --- INITIALIZATION ---
    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('recipe');

        if (!recipeId) {
            loadingView.textContent = 'No recipe specified.';
            return;
        }

        currentRecipe = await getRecipeData(recipeId);

        if (currentRecipe) {
            recipeTitleEl.textContent = currentRecipe.name;
            loadingView.classList.add('hidden');
            cookModeView.classList.remove('hidden');
            cookModeView.classList.add('flex');
            updateStepUI();
            await requestWakeLock();
        } else {
            loadingView.textContent = 'Recipe not found.';
        }
    }

    // --- EVENT LISTENERS ---
    nextStepBtn.addEventListener('click', handleNextStep);
    prevStepBtn.addEventListener('click', handlePrevStep);
    exitCookModeBtn.addEventListener('click', () => {
        window.close();
    });

    // Release wake lock when the page is closed or becomes hidden
    window.addEventListener('beforeunload', releaseWakeLock);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            releaseWakeLock();
        } else if (document.visibilityState === 'visible') {
            requestWakeLock();
        }
    });

    init();
});
