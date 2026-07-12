// ==UserScript==
// @name         HardverApro User Blocker (Extended Editing)
// @namespace    http://tampermonkey.net/
// @version      3.1.2
// @description  Hide ads from blocked users on HardverApro and manage them with a UI. Updated for new site markup and adds a floating button.
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
        // Only select ad items: list items with class "media" and a data-uadid attribute.
        const ads = document.querySelectorAll('li.media[data-uadid]');
        ads.forEach(ad => {
            // In the new markup, the username appears inside .uad-user-text a
            const userLink = ad.querySelector('.uad-user-text a');
            if (userLink) {
                const username = userLink.textContent.trim();
                if (blockedUsers.includes(username)) {
                    ad.style.display = 'none';
                }
            }
        });
    }

// ===== Context Menu (Right-Click) Blocking on PRICE =====
function addContextMenu() {
    document.addEventListener('contextmenu', function (e) {
        // Detect a right-click anywhere inside the price box
        const priceEl = e.target.closest('.uad-price');
        if (!priceEl) return;                 // click was not on a price field

        e.preventDefault();                   // suppress the normal menu

        // Find the containing ad card
        const adItem   = priceEl.closest('li.media[data-uadid]');
        if (!adItem) return;

        // From that card get the seller link (still inside .uad-user-text a)
        const userLink = adItem.querySelector('.uad-user-text a');
        if (!userLink) return;

        const username     = userLink.textContent.trim();
        const blockedUsers = getBlockedUsers();
        const isBlocked    = blockedUsers.some(u => u.username === username);

        if (isBlocked) {
            if (confirm(`Unblock user "${username}"?`)) {
                removeBlockedUser(username);
                hideBlockedAds();
            }
        } else {
            if (confirm(`Block user "${username}"?`)) {
                const note = prompt("Add a note for this user (optional):", "");
                addBlockedUser(username, note);
                hideBlockedAds();
            }
        }
    });
}

    // ===== Management UI =====
    function createManagementUI() {
        // Remove any existing modal
        let existing = document.getElementById('blockedUsersModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = "blockedUsersModal";
        Object.assign(modal.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: "999999",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        });

        const container = document.createElement('div');
        Object.assign(container.style, {
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "5px",
            maxWidth: "600px",
            width: "100%",
            boxSizing: "border-box"
        });

        const title = document.createElement('h2');
        title.textContent = "Blocked Users";
        container.appendChild(title);

        // Scrollable table container
        const tableContainer = document.createElement('div');
        Object.assign(tableContainer.style, {
            maxHeight: "300px",
            overflowY: "auto",
            marginBottom: "10px"
        });

        const table = document.createElement('table');
        Object.assign(table.style, {
            width: "100%",
            borderCollapse: "collapse"
        });

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

        // Existing users rows
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
            userInput.dataset.oldUsername = user.username;
            userCell.appendChild(userInput);
            row.appendChild(userCell);

            // Note cell (editable)
            const noteCell = document.createElement('td');
            noteCell.style.padding = "8px";
            noteCell.style.borderBottom = "1px solid #ccc";
            const noteInput = document.createElement('input');
            noteInput.type = "text";
            noteInput.value = user.note || "";
            noteInput.style.width = "100%";
            noteCell.appendChild(noteInput);
            row.appendChild(noteCell);

            // Date cell (read-only)
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(user.date).toLocaleString();
            dateCell.style.padding = "8px";
            dateCell.style.borderBottom = "1px solid #ccc";
            row.appendChild(dateCell);

            // Actions cell
            const actionCell = document.createElement('td');
            actionCell.style.padding = "8px";
            actionCell.style.borderBottom = "1px solid #ccc";

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
                    userInput.dataset.oldUsername = newUsername;
                    alert("User updated successfully.");
                    hideBlockedAds();
                }
            });
            actionCell.appendChild(saveBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener('click', function() {
                if (confirm(`Delete user "${user.username}"?`)) {
                    removeBlockedUser(user.username);
                    hideBlockedAds();
                    createManagementUI(); // refresh UI
                }
            });
            actionCell.appendChild(deleteBtn);

            row.appendChild(actionCell);
            tbody.appendChild(row);
        });

        // New user row
        const addRow = document.createElement('tr');

        // New Username input
        const newUserCell = document.createElement('td');
        newUserCell.style.padding = "8px";
        newUserCell.style.borderBottom = "1px solid #ccc";
        const newUserInput = document.createElement('input');
        newUserInput.type = "text";
        newUserInput.placeholder = "New username";
        newUserInput.style.width = "100%";
        newUserCell.appendChild(newUserInput);
        addRow.appendChild(newUserCell);

        // New Note input
        const newNoteCell = document.createElement('td');
        newNoteCell.style.padding = "8px";
        newNoteCell.style.borderBottom = "1px solid #ccc";
        const newNoteInput = document.createElement('input');
        newNoteInput.type = "text";
        newNoteInput.placeholder = "New note";
        newNoteInput.style.width = "100%";
        newNoteCell.appendChild(newNoteInput);
        addRow.appendChild(newNoteCell);

        // Date cell placeholder
        const newDateCell = document.createElement('td');
        newDateCell.style.padding = "8px";
        newDateCell.style.borderBottom = "1px solid #ccc";
        newDateCell.textContent = "Will set on add";
        addRow.appendChild(newDateCell);

        // Add button cell
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
                createManagementUI(); // refresh UI after adding
            }
        });
        newActionCell.appendChild(addBtn);
        addRow.appendChild(newActionCell);

        tbody.appendChild(addRow);
        table.appendChild(tbody);
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

    // ===== Floating Button UI =====
    function addFloatingButton() {
        // Check if already added
        if (document.getElementById('blockedUsersFloatingBtn')) return;
        const btn = document.createElement('button');
        btn.id = "blockedUsersFloatingBtn";
        btn.textContent = "Manage Blocked Users";
        Object.assign(btn.style, {
            position: "fixed",
            bottom: "10px",
            right: "10px",
            zIndex: "999999",
            padding: "10px 15px",
            backgroundColor: "#236085",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "14px"
        });
        btn.addEventListener('click', createManagementUI);
        document.body.appendChild(btn);
    }

    // ===== Register Menu Command (in case you use Tampermonkey's menu) =====
    GM_registerMenuCommand('Manage Blocked Users', createManagementUI);

    // ===== Initialization =====
    hideBlockedAds();
    addContextMenu();
    addFloatingButton();

    // Observe changes to re-apply hiding if new ads load
    const observer = new MutationObserver(hideBlockedAds);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
