// ==UserScript==
// @name         HardverApro User Blocker (Extended Editing)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Hide advertisements from blocked users on HardverApro, manage them in a table with notes and block date. Now supports adding, editing, and deleting from the management UI.
// @author       Duke
// @match        https://hardverapro.hu/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ===== Data Handling =====
    function getBlockedUsers() {
        const stored = GM_getValue('blockedUsersData', '[]');
        try {
            return JSON.parse(stored);
        } catch (e) {
            return [];
        }
    }

    function saveBlockedUsers(users) {
        GM_setValue('blockedUsersData', JSON.stringify(users));
    }

    function addBlockedUser(username, note) {
        const users = getBlockedUsers();
        if (users.some(u => u.username === username)) {
            alert(`User "${username}" already exists!`);
            return false;
        }
        users.push({
            username: username,
            note: note || "",
            date: new Date().toISOString()
        });
        saveBlockedUsers(users);
        return true;
    }

    function removeBlockedUser(username) {
        let users = getBlockedUsers();
        users = users.filter(u => u.username !== username);
        saveBlockedUsers(users);
    }

    function updateBlockedUser(oldUsername, newUsername, newNote) {
        const users = getBlockedUsers();
        const userIndex = users.findIndex(u => u.username === oldUsername);
        if (userIndex === -1) {
            alert(`User "${oldUsername}" not found.`);
            return false;
        }

        // If username changed, check for duplicates
        if (oldUsername !== newUsername) {
            if (users.some(u => u.username === newUsername)) {
                alert(`User "${newUsername}" already exists!`);
                return false;
            }
        }

        users[userIndex].username = newUsername;
        users[userIndex].note = newNote;
        saveBlockedUsers(users);
        return true;
    }

    // ===== Hiding Blocked Ads =====
    function hideBlockedAds() {
        const blockedUsers = getBlockedUsers().map(u => u.username);
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

    // ===== Context Menu (Right-Click) Blocking =====
    function addContextMenu() {
        document.addEventListener('contextmenu', function(e) {
            const userLink = e.target.closest('a[href*="/tag/"]');
            if (userLink) {
                e.preventDefault();
                const username = userLink.textContent.trim();
                const blockedUsers = getBlockedUsers();
                const isBlocked = blockedUsers.some(u => u.username === username);

                if (isBlocked) {
                    if (confirm(`Unblock user ${username}?`)) {
                        removeBlockedUser(username);
                        hideBlockedAds();
                    }
                } else {
                    if (confirm(`Block user ${username}?`)) {
                        const note = prompt("Add a note for this user (optional):", "");
                        addBlockedUser(username, note);
                        hideBlockedAds();
                    }
                }
            }
        });
    }

    // ===== Management UI =====
    function createManagementUI() {
        // Remove if exists
        let existing = document.getElementById('blockedUsersModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = "blockedUsersModal";
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.backgroundColor = "rgba(0,0,0,0.7)";
        modal.style.zIndex = "999999";
        modal.style.display = "flex";
        modal.style.justifyContent = "center";
        modal.style.alignItems = "center";

        const container = document.createElement('div');
        container.style.backgroundColor = "#fff";
        container.style.padding = "20px";
        container.style.borderRadius = "5px";
        container.style.maxWidth = "600px";
        container.style.width = "100%";
        container.style.boxSizing = "border-box";

        const title = document.createElement('h2');
        title.textContent = "Blocked Users";
        container.appendChild(title);

        // --- Here's the scrollable wrapper for the table ---
        const tableContainer = document.createElement('div');
        // Adjust these values if you want more or less visible rows
        tableContainer.style.maxHeight = "300px";
        tableContainer.style.overflowY = "auto";
        tableContainer.style.marginBottom = "10px";

        const table = document.createElement('table');
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        ["Username", "Note", "Blocked Date", "Actions"].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.borderBottom = "1px solid #ccc";
            th.style.padding = "8px";
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const blockedUsers = getBlockedUsers();

        // Existing users
        blockedUsers.forEach(user => {
            const row = document.createElement('tr');

            // Username cell (editable)
            const userCell = document.createElement('td');
            userCell.style.padding = "8px";
            userCell.style.borderBottom = "1px solid #ccc";
            const userInput = document.createElement('input');
            userInput.type = "text";
            userInput.value = user.username;
            userInput.style.width = "100%";
            userInput.dataset.oldUsername = user.username; // store old username
            userCell.appendChild(userInput);
            row.appendChild(userCell);

            // Note cell (editable)
            const noteCell = document.createElement('td');
            noteCell.style.borderBottom = "1px solid #ccc";
            noteCell.style.padding = "8px";
            const noteInput = document.createElement('input');
            noteInput.type = "text";
            noteInput.value = user.note || "";
            noteInput.style.width = "100%";
            noteCell.appendChild(noteInput);
            row.appendChild(noteCell);

            // Date cell (read-only)
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(user.date).toLocaleString();
            dateCell.style.borderBottom = "1px solid #ccc";
            dateCell.style.padding = "8px";
            row.appendChild(dateCell);

            // Actions cell
            const actionCell = document.createElement('td');
            actionCell.style.borderBottom = "1px solid #ccc";
            actionCell.style.padding = "8px";

            const saveBtn = document.createElement('button');
            saveBtn.textContent = "Save";
            saveBtn.style.marginRight = "5px";
            saveBtn.addEventListener('click', function() {
                const newUsername = userInput.value.trim();
                const newNote = noteInput.value.trim();
                const oldUsername = userInput.dataset.oldUsername;

                if (!newUsername) {
                    alert("Username cannot be empty.");
                    return;
                }

                if (updateBlockedUser(oldUsername, newUsername, newNote)) {
                    // Update the stored oldUsername
                    userInput.dataset.oldUsername = newUsername;
                    alert("User updated successfully.");
                    hideBlockedAds();
                }
            });
            actionCell.appendChild(saveBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener('click', function() {
                if (confirm(`Delete user ${user.username}?`)) {
                    removeBlockedUser(user.username);
                    hideBlockedAds();
                    createManagementUI(); // Refresh UI
                }
            });
            actionCell.appendChild(deleteBtn);

            row.appendChild(actionCell);
            tbody.appendChild(row);
        });

        // Add new user row
        const addRow = document.createElement('tr');

        // Username input
        const newUserCell = document.createElement('td');
        newUserCell.style.padding = "8px";
        newUserCell.style.borderBottom = "1px solid #ccc";
        const newUserInput = document.createElement('input');
        newUserInput.type = "text";
        newUserInput.placeholder = "New username";
        newUserInput.style.width = "100%";
        newUserCell.appendChild(newUserInput);
        addRow.appendChild(newUserCell);

        // Note input
        const newNoteCell = document.createElement('td');
        newNoteCell.style.padding = "8px";
        newNoteCell.style.borderBottom = "1px solid #ccc";
        const newNoteInput = document.createElement('input');
        newNoteInput.type = "text";
        newNoteInput.placeholder = "New note";
        newNoteInput.style.width = "100%";
        newNoteCell.appendChild(newNoteInput);
        addRow.appendChild(newNoteCell);

        // Date cell (will be filled automatically on add)
        const newDateCell = document.createElement('td');
        newDateCell.style.padding = "8px";
        newDateCell.style.borderBottom = "1px solid #ccc";
        newDateCell.textContent = "Will set on add";
        addRow.appendChild(newDateCell);

        // Actions cell (Add button)
        const newActionCell = document.createElement('td');
        newActionCell.style.padding = "8px";
        newActionCell.style.borderBottom = "1px solid #ccc";
        const addBtn = document.createElement('button');
        addBtn.textContent = "Add";
        addBtn.addEventListener('click', function() {
            const username = newUserInput.value.trim();
            const note = newNoteInput.value.trim();

            if (!username) {
                alert("Username cannot be empty.");
                return;
            }

            if (addBlockedUser(username, note)) {
                hideBlockedAds();
                createManagementUI(); // Refresh UI after adding
            }
        });
        newActionCell.appendChild(addBtn);
        addRow.appendChild(newActionCell);

        tbody.appendChild(addRow);

        table.appendChild(tbody);
        // Instead of appending the table directly,
        // append it to the scrollable container:
        tableContainer.appendChild(table);
        container.appendChild(tableContainer);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = "Close";
        closeBtn.style.marginTop = "10px";
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
        container.appendChild(closeBtn);

        modal.appendChild(container);
        document.body.appendChild(modal);
    }

    GM_registerMenuCommand('Manage Blocked Users', function() {
        createManagementUI();
    });

    // ===== Initialization =====
    hideBlockedAds();
    addContextMenu();

    // Dynamically loaded content handling
    const observer = new MutationObserver(hideBlockedAds);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
