// Toggle user status function with SweetAlert and timed popup
function toggleUserStatus(userId, isCurrentlyBlocked, userName) {
    const action = isCurrentlyBlocked ? 'unblock' : 'block';
    const actionText = isCurrentlyBlocked ? 'Unblock' : 'Block';
    const icon = isCurrentlyBlocked ? 'question' : 'warning';
    const confirmButtonColor = isCurrentlyBlocked ? '#28a745' : '#dc3545';
    
    Swal.fire({
        title: `${actionText} User?`,
        html: `Are you sure you want to <strong>${action}</strong><br><em>${userName}</em>?`,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: confirmButtonColor,
        cancelButtonColor: '#6c757d',
        confirmButtonText: `Yes, ${actionText}!`,
        cancelButtonText: 'Cancel',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            // Show loading state
            const button = event.target;
            button.classList.add('loading');
            button.disabled = true;
            
            fetch(`/admin/users/toggle-status/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show specific message based on action
                    if (data.isBlocked) {
                        // User was blocked - show timed popup
                        Swal.fire({
                            title: 'User Blocked!',
                            html: `<strong>${userName}</strong> has been blocked.<br><small>This user will not be able to access their account until unblocked.</small>`,
                            icon: 'warning',
                            timer: 5000,
                            timerProgressBar: true,
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            confirmButtonColor: '#dc3545',
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'swal-blocked-popup',
                                title: 'swal-blocked-title'
                            }
                        });
                    } else {
                        // User was unblocked - show success message
                        Swal.fire({
                            title: 'User Unblocked!',
                            html: `<strong>${userName}</strong> has been unblocked.<br><small>This user can now access their account normally.</small>`,
                            icon: 'success',
                            timer: 3000,
                            timerProgressBar: true,
                            showConfirmButton: false,
                            customClass: {
                                popup: 'swal-unblocked-popup'
                            }
                        });
                    }
                    
                    // Update UI without page reload
                    setTimeout(() => {
                        window.location.reload();
                    }, data.isBlocked ? 5000 : 3000);
                } else {
                    // Error SweetAlert
                    Swal.fire({
                        title: 'Error!',
                        text: data.message,
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Network Error!',
                    text: 'Something went wrong. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            })
            .finally(() => {
                // Remove loading state
                button.classList.remove('loading');
                button.disabled = false;
            });
        }
    });
}

// Debounced Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const statusSelect = document.querySelector('select[name="status"]');
    const searchForm = document.querySelector('.filter-form');
    
    let searchTimeout;
    const DEBOUNCE_DELAY = 500; // 500ms delay
    
    // Debounce function
    function debounce(func, delay) {
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(searchTimeout);
                func(...args);
            };
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(later, delay);
        };
    }
    
    // Function to perform search
    function performSearch() {
        const searchValue = searchInput.value.trim();
        const statusValue = statusSelect.value;
        
        // Build URL with current search parameters
        const url = new URL('/admin/users', window.location.origin);
        
        if (searchValue) {
            url.searchParams.set('search', searchValue);
        }
        
        if (statusValue && statusValue !== 'all') {
            url.searchParams.set('status', statusValue);
        }
        
        // Reset to page 1 when searching
        url.searchParams.set('page', '1');
        
        // Navigate to the new URL
        window.location.href = url.toString();
    }
    
    // Create debounced search function
    const debouncedSearch = debounce(performSearch, DEBOUNCE_DELAY);
    
    // Add event listeners
    if (searchInput) {
        // Handle input with debouncing
        searchInput.addEventListener('input', function() {
            // Visual feedback during typing
            this.classList.add('searching');
            
            // Clear previous timeout and set new one
            debouncedSearch();
            
            // Remove visual feedback after delay
            setTimeout(() => {
                this.classList.remove('searching');
            }, DEBOUNCE_DELAY + 100);
        });
        
        // Handle Enter key press for immediate search
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimeout);
                performSearch();
            }
        });
    }
    
    // Handle status filter change (immediate search)
    if (statusSelect) {
        statusSelect.addEventListener('change', function() {
            performSearch();
        });
    }
    
    // Prevent form submission (we handle it with JavaScript)
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            clearTimeout(searchTimeout);
            performSearch();
        });
    }
});