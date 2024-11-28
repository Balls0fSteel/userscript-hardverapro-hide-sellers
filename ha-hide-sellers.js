// ==UserScript==
// @name         HardverApro User Blocker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hide advertisements from blocked users on HardverApro
// @author       You
// @match        https://hardverapro.hu/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // Store blocked users in GM storage
    function getBlockedUsers() {
        const blocked = GM_getValue('blockedUsers', '');
        return blocked ? blocked.split(',') : [];
    }

    function saveBlockedUsers(users) {
        GM_setValue('blockedUsers', users.join(','));
    }

    // Hide ads from blocked users
    function hideBlockedAds() {
        const blockedUsers = getBlockedUsers();
        const ads = document.querySelectorAll('.media');

        ads.forEach(ad => {
            const userLink = ad.querySelector('a[href*="/tag/"]');
            if (userLink) {
                const username = userLink.textContent.trim();
                if (blockedUsers.includes(username)) {
                    ad.style.display = 'none';
                }
            }
        });
    }

    // Add block user option to context menu
    function addContextMenu() {
        document.addEventListener('contextmenu', function(e) {
            const userLink = e.target.closest('a[href*="/tag/"]');
            if (userLink) {
                e.preventDefault();
                const username = userLink.textContent.trim();
                const blockedUsers = getBlockedUsers();

                if (blockedUsers.includes(username)) {
                    if (confirm(`Unblock user ${username}?`)) {
                        const newBlockedUsers = blockedUsers.filter(u => u !== username);
                        saveBlockedUsers(newBlockedUsers);
                        hideBlockedAds();
                    }
                } else {
                    if (confirm(`Block user ${username}?`)) {
                        blockedUsers.push(username);
                        saveBlockedUsers(blockedUsers);
                        hideBlockedAds();
                    }
                }
            }
        });
    }

    // Add settings menu command
    GM_registerMenuCommand('Manage Blocked Users', function() {
        const blockedUsers = getBlockedUsers();
        const input = prompt('Enter blocked usernames (comma-separated):', blockedUsers.join(','));
        if (input !== null) {
            const newUsers = input.split(',').map(u => u.trim()).filter(u => u);
            saveBlockedUsers(newUsers);
            hideBlockedAds();
        }
    });

    // Initialize
    hideBlockedAds();
    addContextMenu();

    // Handle dynamically loaded content
    const observer = new MutationObserver(hideBlockedAds);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
