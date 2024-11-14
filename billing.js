let db;
const request = indexedDB.open('greenhouseDB', 1);

// Setting up the IndexedDB schema
request.onupgradeneeded = function(event) {
    db = event.target.result;

    // Create object store for the cart
    const cartStore = db.createObjectStore('cart', { keyPath: 'id' });
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

    // Create object store for users
    if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'username' });
        userStore.createIndex('password', 'password', { unique: false });
        userStore.createIndex('isLoggedIn', 'isLoggedIn', { unique: false });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    checkUserLogin(); // Check login status on page load
    displayCartProducts();
    updateLoginLink();

};

request.onerror = function(event) {
    console.error('Database error:', event.target.error);
};

// Function to check if user is logged in
function checkUserLogin() {
    const transaction = db.transaction(['users'], 'readonly');
    const userStore = transaction.objectStore('users');
    const request = userStore.getAll();

    request.onsuccess = function(event) {
        const users = event.target.result;
        let loggedInUser = null;
        
        users.forEach(user => {
            if (user.isLoggedIn) {
                loggedInUser = user;
            }
        });

        if (loggedInUser) {
            userIsLoggedIn(loggedInUser.username);
        } else {
            userIsNotLoggedIn();
        }
    };

    request.onerror = function(event) {
        console.error('Error checking login status:', event.target.error);
    };
}

// Logic when user is logged in
function userIsLoggedIn(username) {
    console.log(`User ${username} is logged in`);
    document.getElementById('order-button').addEventListener('click', function() {
        document.getElementById('popup').style.display = 'block'; // Show order details popup
    });
}

// Logic when no user is logged in
function userIsNotLoggedIn() {
    console.log('No user is logged in');
    document.getElementById('order-button').addEventListener('click', function() {
        document.getElementById('login-popup').style.display = 'block'; // Show login popup
    });
}

// Display cart products
function displayCartProducts() {
    const transaction = db.transaction(['cart'], 'readonly');
    const objectStore = transaction.objectStore('cart');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const products = event.target.result;
        const cartProductsDiv = document.getElementById('cart-products');
        cartProductsDiv.innerHTML = '';

        let total = 0;
       
        products.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.className = 'cart-product';
            productDiv.innerHTML = `
                <img src="${product.img}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>Price: ₹${product.price}</p>
                <div class="quantity-controls">
                    <button onclick="changeQuantity(${product.id}, -1)">-</button>
                    <span id="quantity-${product.id}">${product.quantity || 1}</span>
                    <button onclick="changeQuantity(${product.id}, 1)">+</button>
                </div>
                <button onclick="removeItem(${product.id})">Remove</button>
            `;
            cartProductsDiv.appendChild(productDiv);
            total += product.price * (product.quantity || 1); // Calculate total price
        });

        // Display total amount
        document.getElementById('total-amount').textContent = `Total Amount: ₹${total.toFixed(2)}`;
    };
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

// Function to collect all product names in cart and return them as a string
function getAllProductNames(callback) {
    const transaction = db.transaction(['cart'], 'readonly');
    const objectStore = transaction.objectStore('cart');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const products = event.target.result;
        let productNames = [];

        products.forEach(product => {
            productNames.push(product.name); // Collect all product names
        });

        // Join product names into a single string and pass to callback
        const productNamesString = productNames.join(', ');
        callback(productNamesString);
    };
}


// Change quantity of items in the cart
function changeQuantity(id, change) {
    const transaction = db.transaction(['cart'], 'readwrite');
    const objectStore = transaction.objectStore('cart');
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const product = event.target.result;

        if (product) {
            product.quantity = (product.quantity || 1) + change;

            // Remove item if quantity is 0
            if (product.quantity <= 0) {
                removeItem(id);
            } else {
                objectStore.put(product);
                displayCartProducts(); // Refresh the displayed products
            }
        }
    };
}

// Remove item from the cart
function removeItem(id) {
    const transaction = db.transaction(['cart'], 'readwrite');
    const objectStore = transaction.objectStore('cart');
    const request = objectStore.delete(id);

    request.onsuccess = function() {
        displayCartProducts(); // Refresh the displayed products
    };
}

// Save order details to a separate store for admin analytics
function saveOrderDetails(orderDetails, products) {
    const transaction = db.transaction(['orders'], 'readwrite');
    const objectStore = transaction.objectStore('orders');
    const request = objectStore.add({
        ...orderDetails,
        products: products // Add the product details to the order
    });

    request.onsuccess = function() {
        console.log('Order details saved successfully!');
    };

    request.onerror = function(event) {
        console.error('Error saving order details:', event.target.error);
    };
}

// Clear the cart after placing an order
function clearCart() {
    const transaction = db.transaction(['cart'], 'readwrite');
    const objectStore = transaction.objectStore('cart');
    objectStore.clear();
    displayCartProducts(); // Refresh the displayed products
}

// Confirm order details
document.getElementById('confirm-button').addEventListener('click', function() {
    const name = document.getElementById('name').value;
    const address = document.getElementById('address').value;
    const contact = document.getElementById('contact').value;
    getAllProductNames(function(productNamesString) {
    const orderDetails = {
        orderDate: new Date().toISOString(),
        customerName: name,
        customerAddress: address,
        customerContact: contact,
        productli: productNamesString
    };

    saveOrderDetails(orderDetails);
    document.getElementById('thank-you-name').textContent = name; // Show customer's name in thank you message
    document.getElementById('popup').style.display = 'none'; // Close the popup
    document.getElementById('thank-you-popup').style.display = 'block'; // Show thank you message
    clearCart(); // Clear the cart after order
});
});
const closeButton = document.getElementById('close-btn');
const popup = document.getElementById('popup');

// Close the popup when the close button is clicked
closeButton.addEventListener('click', function() {
    popup.style.display = 'none';
});

// Function to open the popup (you can call this to show the popup)
function openPopup() {
    popup.style.display = 'flex'; // Show the popup
}
  // Get the close button and the login popup
  const closeLoginPopup = document.getElementById('close-login-popup');
  const loginPopup = document.getElementById('login-popup');

  // Close the login popup when the close button is clicked
  closeLoginPopup.addEventListener('click', function() {
      loginPopup.style.display = 'none';
  });
