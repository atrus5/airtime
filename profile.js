console.log("Executing profile.js version 1.0");

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
    
    let app, auth, storage;
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        storage = firebase.storage();
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
        } else {
            // If no user is logged in, redirect to the home page.
            window.location.href = 'index.html';
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

