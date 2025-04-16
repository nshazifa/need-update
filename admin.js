import { db, auth } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const content = document.getElementById("content");

// FETCH MENU ITEMS FROM FIRESTORE
async function fetchMenu() {
    const menuTable = document.getElementById("menuTableBody");
    if (!menuTable) return; // Prevent errors if the table doesn't exist yet

    menuTable.innerHTML = ""; // Clear table before loading new data

    const menuDocRef = doc(db, "Menu", "menuItems");
    const subcollections = ["burger-items", "pizza-items", "momos-items", "desert-items", "drinks-items"];

    for (const subcollection of subcollections) {
        const querySnapshot = await getDocs(collection(menuDocRef, subcollection));
        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            addItemToTable(docSnap.id, item, subcollection);
        });
    }
}

// ADD ITEM TO TABLE
function addItemToTable(id, item, category) {
    const menuTable = document.getElementById("menuTableBody");
    if (!menuTable) return;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td><img src="${item.image}" width="50"></td>
        <td>${item.name}</td>
        <td>₹${item.price}</td>
        <td>${category}</td>
        <td>
            <button class="edit-btn" data-id="${id}" data-category="${category}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}">Edit</button>
            <button class="delete-btn" data-id="${id}" data-category="${category}">Delete</button>
        </td>
    `;
    menuTable.appendChild(row);
}

// ADD NEW ITEM
async function addItem(e) {
    e.preventDefault();

    const name = document.getElementById("itemName").value;
    const price = document.getElementById("itemPrice").value;
    const image = document.getElementById("itemImage").value;
    const category = document.getElementById("itemCategory").value;

    const newItemRef = doc(collection(doc(db, "Menu", "menuItems"), category));
    await setDoc(newItemRef, { name, price: Number(price), image });

    fetchMenu(); // Refresh table
    e.target.reset();
}

// DELETE ITEM WITH CONFIRMATION
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-btn")) {
        const id = e.target.dataset.id;
        const category = e.target.dataset.category;

        const confirmDelete = confirm("Are you sure you want to delete this item?");
        if (!confirmDelete) return;

        await deleteDoc(doc(db, `Menu/menuItems/${category}/${id}`));
        fetchMenu(); // Refresh table
    }
});

// EDIT ITEM FUNCTIONALITY
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("edit-btn")) {
        const id = e.target.dataset.id;
        const category = e.target.dataset.category;
        const oldName = e.target.dataset.name;
        const oldPrice = e.target.dataset.price;
        const oldImage = e.target.dataset.image;

        const newName = prompt("Enter new name:", oldName);
        const newPrice = prompt("Enter new price:", oldPrice);
        const newImage = prompt("Enter new image URL:", oldImage);

        if (!newName || !newPrice || !newImage) return;

        const itemRef = doc(db, `Menu/menuItems/${category}/${id}`);
        await updateDoc(itemRef, { name: newName, price: Number(newPrice), image: newImage });

        fetchMenu(); // Refresh table
    }
});

// FUNCTIONS FOR LOADING DIFFERENT PAGES
function loadMenu() {
    content.innerHTML = `
        <h2>Modify Menu</h2>
        <p>View, edit, and delete Menu items</p>
        <table class="table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="menuTableBody"></tbody>
        </table>
    `;
    fetchMenu();
}

function loadModifyMenu() {
    content.innerHTML = `
        <h2>Add to Menu</h2>
        <form id="addItemForm">
            <input type="text" id="itemName" placeholder="Item Name" required>
            <input type="number" id="itemPrice" placeholder="Price" required>
            <input type="text" id="itemImage" placeholder="Image URL" required>
            <select id="itemCategory">
                <option value="burger-items">Burger</option>
                <option value="pizza-items">Pizza</option>
                <option value="momos-items">Momos</option>
                <option value="desert-items">Desert</option>
                <option value="drinks-items">Drinks</option>
            </select>
            <button type="submit">Add Item</button>
        </form>
    `;
    document.getElementById("addItemForm").addEventListener("submit", addItem);
}

// MANAGE USERS AND ORDERS
async function manageUsers() {
    const container = document.getElementById("ordersContainer");
    container.innerHTML = "<h2>Loading users and orders...</h2>";

    const usersRef = collection(db, "Users");
    const usersSnapshot = await getDocs(usersRef);

    let tableHTML = `<h2>Manage Users & Orders</h2>`;

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const ordersRef = collection(db, `Users/${userId}/Orders`);
        const ordersSnapshot = await getDocs(ordersRef);

        if (ordersSnapshot.empty) continue;

        tableHTML += `
            <div style="border-top: 2px solid black; padding-top: 10px; margin-top: 30px;">
                <p><strong>User:</strong> ${userData.username || "N/A"}</p>
                <p><strong>Email:</strong> ${userData.email || "N/A"} | <strong>Phone:</strong> ${userData.phone || "N/A"}</p>
        `;

        for (const orderDoc of ordersSnapshot.docs) {
            const orderId = orderDoc.id;
            const orderData = orderDoc.data();

            const deliveryRef = doc(db, `Users/${userId}/Orders/${orderId}/DeliveryInfo/Details`);
            const deliverySnap = await getDoc(deliveryRef);
            const deliveryData = deliverySnap.exists() ? deliverySnap.data() : {};

            const orderItemsRef = collection(db, `Users/${userId}/Orders/${orderId}/OrderItems`);
            const orderItemsSnap = await getDocs(orderItemsRef);

            tableHTML += `
                <p><strong>Address:</strong> ${deliveryData.address || "N/A"} | <strong>Payment Method:</strong> ${deliveryData.paymentMethod || "N/A"}</p>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Product Name</th>
                            <th>Qty</th>
                            <th>Price (₹)</th>
                            <th>Total (₹)</th>
                            <th>Date and Time</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            orderItemsSnap.forEach((itemDoc) => {
                const item = itemDoc.data();
                const total = (item.price || 0) * (item.quantity || 0);
                tableHTML += `
                    <tr>
                        <td>${orderId}</td>
                        <td>${item.name || "Item"}</td>
                        <td>${item.quantity || 0}</td>
                        <td>${item.price || 0}</td>
                        <td>${total}</td>
                        <td>${orderData.timestamp ? new Date(orderData.timestamp.seconds * 1000).toLocaleString() : "N/A"}</td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table><br>`;
        }

        tableHTML += `<hr style="border-top: 3px double #000; margin-top: 30px;"></div>`;
    }

    container.innerHTML = tableHTML;
}

// Make the function globally accessible
window.manageUsers = manageUsers;
window.loadMenu = loadMenu;
window.loadModifyMenu = loadModifyMenu;

// Styling for Tables
const styles = `
    .table {
        width: 100%;
        border-collapse: collapse;
    }
    .table th, .table td {
        padding: 12px;
        border: 1px solid #ddd;
        text-align: center;
    }
    .table th {
        background-color: #343a40;
        color: white;
    }
    .table tbody tr:nth-child(even) {
        background-color: #f2f2f2;
    }
    .table tbody tr:hover {
        background-color: #ddd;
    }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// Logout function
window.logout = function () {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        console.error("Error signing out:", error);
    });
};

// Go to Customer Panel
window.goToCustomerPanel = function () {
    window.location.href = "product.html";
};
