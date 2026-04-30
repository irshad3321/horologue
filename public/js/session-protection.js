// Session Protection Script
// Prevents back button access after logout and handles session validation

(function() {
    'use strict';

    // Configuration
    const config = {
        sessionCheckInterval: 30 * 1000, // 30 seconds (more frequent for blocked user detection)
        userSessionEndpoint: '/api/session-check',
        adminSessionEndpoint: '/admin/api/session-check',
        userLoginUrl: '/login',
        adminLoginUrl: '/admin/login'
    };

    // Detect if this is an admin page
    const isAdminPage = window.location.pathname.startsWith('/admin');
    
    // Session validation function
    function checkSession() {
        const endpoint = isAdminPage ? config.adminSessionEndpoint : config.userSessionEndpoint;
        const loginUrl = isAdminPage ? config.adminLoginUrl : config.userLoginUrl;

        fetch(endpoint, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-cache'
        }).then(response => {
            if (!response.ok || response.status === 401) {
                // Parse response to get reason if available
                response.json().then(data => {
                    if (data.reason === 'account_blocked') {
                        // User account is blocked
                        window.location.replace(config.userLoginUrl + '?error=account_blocked');
                    } else if (data.reason === 'admin_access_revoked') {
                        // Admin access revoked
                        window.location.replace(config.adminLoginUrl + '?error=access_revoked');
                    } else {
                        // General session expired
                        window.location.replace(loginUrl);
                    }
                }).catch(() => {
                    // Fallback if JSON parsing fails
                    window.location.replace(loginUrl);
                });
            }
        }).catch(() => {
            // Network error, redirect to login for safety
            window.location.replace(loginUrl);
        });
    }

    // Aggressive back button prevention
    function preventBackButton() {
        // Method 1: History manipulation
        if (window.history && window.history.pushState) {
            // Push multiple states to make back button ineffective
            for (let i = 0; i < 10; i++) {
                window.history.pushState('forward', null, window.location.pathname);
            }
            
            // Handle popstate events aggressively
            window.addEventListener('popstate', function(event) {
                // Immediately push forward again
                window.history.pushState('forward', null, window.location.pathname);
                // Also check session when user tries to go back
                setTimeout(checkSession, 100);
            });
        }

        // Method 2: Disable browser navigation keys
        document.addEventListener('keydown', function(event) {
            // Disable Alt+Left (back), Alt+Right (forward)
            if (event.altKey && (event.keyCode === 37 || event.keyCode === 39)) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
            
            // Disable Backspace navigation (when not in input fields)
            if (event.keyCode === 8 && 
                !['INPUT', 'TEXTAREA'].includes(event.target.tagName) && 
                !event.target.isContentEditable) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        });

        // Method 3: Mouse button handling
        document.addEventListener('mousedown', function(event) {
            // Disable mouse back/forward buttons
            if (event.button === 3 || event.button === 4) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        });
    }

    // Handle page cache and visibility
    function handlePageCache() {
        // Clear cache on page show (handles browser back/forward cache)
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                // Page was loaded from cache, reload to ensure fresh session check
                window.location.reload(true);
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                // Page became visible, check session
                setTimeout(checkSession, 500);
            }
        });

        // Handle window focus
        window.addEventListener('focus', function() {
            // Window gained focus, check session
            setTimeout(checkSession, 500);
        });

        // Prevent page caching
        window.addEventListener('beforeunload', function() {
            // Clear any cached data
            if (window.performance && window.performance.navigation.type === 2) {
                // Page accessed via back/forward button
                window.location.reload(true);
            }
        });

        // Force no-cache headers via meta tags
        const metaNoCache = document.createElement('meta');
        metaNoCache.httpEquiv = 'Cache-Control';
        metaNoCache.content = 'no-cache, no-store, must-revalidate';
        document.head.appendChild(metaNoCache);

        const metaPragma = document.createElement('meta');
        metaPragma.httpEquiv = 'Pragma';
        metaPragma.content = 'no-cache';
        document.head.appendChild(metaPragma);

        const metaExpires = document.createElement('meta');
        metaExpires.httpEquiv = 'Expires';
        metaExpires.content = '0';
        document.head.appendChild(metaExpires);
    }

    // Initialize protection
    function initializeProtection() {
        // Start session checking more frequently
        setInterval(checkSession, config.sessionCheckInterval);
        
        // Prevent back button aggressively
        preventBackButton();
        
        // Handle page cache
        handlePageCache();
        
        // Initial session check after a short delay
        setTimeout(checkSession, 1000);
        
        // Additional session check on page load
        setTimeout(checkSession, 3000);
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeProtection);
    } else {
        initializeProtection();
    }

    // Expose global function for manual initialization if needed
    window.sessionProtection = {
        init: initializeProtection,
        checkSession: checkSession,
        config: config
    };

})();