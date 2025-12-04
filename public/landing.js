//claude helped with this set up!
let currentScreen = 1;

function nextScreen(screenNumber) {
    // Hide current screen
    document.getElementById(`screen${currentScreen}`).classList.remove('active');
    
    // Show next screen
    document.getElementById(`screen${screenNumber}`).classList.add('active');
    
    // Update current screen
    currentScreen = screenNumber;
}

function enterExperience() {
    // Get the user's name
    const userName = document.getElementById('userName').value.trim();
    
    // Optional: Store name in localStorage to use in experience.html
    if (userName) {
        localStorage.setItem('userName', userName);
    }
    
    // Navigate to experience page
    window.location.href = 'experience.html';
}

// Allow Enter key to submit name
document.getElementById('userName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        enterExperience();
    }
});