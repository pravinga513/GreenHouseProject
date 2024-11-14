// IndexedDB setup
let db;
const request = indexedDB.open('greenhouseDB', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;


    // Create object store for users
    const userStore = db.createObjectStore('users', { keyPath: 'username' });
    userStore.createIndex('password', 'password', { unique: false });
    userStore.createIndex('isLoggedIn', 'isLoggedIn', { unique: false });

    // Create object store for the cart
    const cartStore = db.createObjectStore('cart', { keyPath: 'id' });
    cartStore.createIndex('img', 'img', { unique: false });
    cartStore.createIndex('name', 'name', { unique: false });
    cartStore.createIndex('price', 'price', { unique: false });
    cartStore.createIndex('quantity', 'quantity', { unique: false });

    // Create object store for orders
    const ordersStore = db.createObjectStore('orders', { keyPath: 'orderId', autoIncrement: true });
    ordersStore.createIndex('orderDate', 'orderDate', { unique: false });
    ordersStore.createIndex('customerName', 'customerName', { unique: false });
    ordersStore.createIndex('customerAddress', 'customerAddress', { unique: false });
    ordersStore.createIndex('customerContact', 'customerContact', { unique: false });
    ordersStore.createIndex('productli', 'productli', { unique: false });
};


request.onsuccess = function(event) {
    db = event.target.result;
    updateCartCount();
    updateLoginLink();
};

request.onerror = function(event) {
    console.error('Database error:', event.target.error);
};

// Add item to cart
function addToCart(id, img , name, price) {
    
    const transaction = db.transaction(['cart'], 'readwrite');
    const objectStore = transaction.objectStore('cart');
    const item = { id,img , name, price };

    const request = objectStore.add(item);
    request.onsuccess = function() {
        console.log(`${name} added to cart`);
        updateCartCount();
    };
    request.onerror = function(event) {
        console.error('Add to cart error:', event.target.error);
    };
    
}

// Update cart count
function updateCartCount() {
    const transaction = db.transaction(['cart'], 'readonly');
    const objectStore = transaction.objectStore('cart');
    const countRequest = objectStore.count();

    countRequest.onsuccess = function() {
        document.getElementById('cart-count').textContent = countRequest.result;
    };
}

function updateButtonAfterAdd(button) {
    button.textContent = 'Added to Cart';
    button.classList.add('added-to-cart');
    button.disabled = true; // Optionally disable the button after adding
}
function updateLoginLink() {
    const transaction = db.transaction(['users'], 'readonly');
    const objectStore = transaction.objectStore('users');

    // Retrieve all users to check logged-in status
    const usersRequest = objectStore.getAll();
    usersRequest.onsuccess = function(event) {
        const users = event.target.result;

        // Assuming only one user can be logged in at a time
        const loggedInUser = users.find(user => user.isLoggedIn);

        const loginLink = document.getElementById('login-link');
        if (loggedInUser) {
            loginLink.textContent = 'Logout';
            loginLink.onclick = () => logoutUser(loggedInUser.username);
        } else {
            loginLink.textContent = 'Login';
            loginLink.onclick = () => window.location.href = 'login.html';
        }
    };
}

function logoutUser(username) {
    const transaction = db.transaction(['users'], 'readwrite');
    const objectStore = transaction.objectStore('users');
    const request = objectStore.get(username);

    request.onsuccess = function(event) {
        const user = event.target.result;
        if (user) {
            user.isLoggedIn = false; // Set user as logged out
            objectStore.put(user); // Update user data in IndexedDB
            updateLoginLink(); // Update link after logout
        }
    };
}
