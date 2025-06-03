// Admin Login Script

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const adminKey = document.getElementById('adminKey').value;
    const errorDiv = document.getElementById('error');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // Clear any previous errors
    errorDiv.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key: adminKey }),
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            // Redirect to admin dashboard
            window.location.href = '/admin';
        } else {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Invalid admin key';
        }
    } catch (err) {
        errorDiv.textContent = 'Network error. Please try again.';
        console.error('Login error:', err);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
});