//claude helped with this set up!

let currentScreen = 1;
let selectedCursorColor = '#64FFC8'; // Default color


function nextScreen(screenNumber) {
    // Hide current screen
    document.getElementById(`screen${currentScreen}`).classList.remove('active');
    
    // Show next screen
    document.getElementById(`screen${screenNumber}`).classList.add('active');
    
    // Update current screen
    currentScreen = screenNumber;
}


// color picker: Update preview when color changes
document.addEventListener('DOMContentLoaded', () => {
    const colorPicker = document.getElementById('cursorColorPicker');
    const colorPreview = document.getElementById('colorPreview');
    
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            selectedCursorColor = e.target.value;
            if (colorPreview) {
                colorPreview.style.color = selectedCursorColor;
            }
            console.log('Selected cursor color:', selectedCursorColor);
        });
    }
});

function enterExperience() {
    // Get the user's name
    const userName = document.getElementById('userName').value.trim();
    
    // Store name in a variable to use in the experience
    if (userName) {
        localStorage.setItem('userName', userName);
    }
    
    // Get the selected color from the picker
    const colorPicker = document.getElementById('cursorColorPicker');
    if (colorPicker) {
        selectedCursorColor = colorPicker.value;
    }
    
    // Store cursor color
    localStorage.setItem('cursorColor', selectedCursorColor);
    console.log('Saving color:', selectedCursorColor);



    // Hide all landing screens
    for (let i = 1; i <= 4; i++) {
        const screen = document.getElementById(`screen${i}`);
        if (screen) {
            screen.style.display = 'none';
        }
    }
    
    // Show experience container
    document.getElementById('experience-container').style.display = 'block';
    
    // Start the broadcaster or viewer
    if (typeof startBroadcaster === 'function') {
        startBroadcaster();
    } else if (typeof startViewer === 'function') {
        startViewer();
    }
}

// Allow Enter key to submit name
document.addEventListener('DOMContentLoaded', function() {
    const userNameInput = document.getElementById('userName');
    if (userNameInput) {
        userNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                enterExperience();
            }
        });
    }
});




