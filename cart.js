 // Example cart data
let cartItems = [
  {
    id: 1,
    name: "Product Name 1",
    price: 29.99,
    quantity: 1,
    image: "product1.jpg"
  },
  {
    id: 2,
    name: "Product Name 2",
    price: 39.99,
    quantity: 2,
    image: "product2.jpg"
  }
];

// Function to render cart items
function renderCart() {
  const cartContainer = document.querySelector('.cart-items');
  cartContainer.innerHTML = ''; // Clear the existing items

  let total = 0;
  
  cartItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('cart-item');
    itemDiv.setAttribute('data-id', item.id);

    itemDiv.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <h3>${item.name}</h3>
        <p class="price">$${item.price.toFixed(2)}</p>
        <div class="quantity">
          <label for="quantity-${item.id}">Quantity:</label>
          <input type="number" id="quantity-${item.id}" name="quantity" min="1" value="${item.quantity}">
        </div>
        <button class="remove-btn" onclick="removeItem(${item.id})">Remove</button>
      </div>
    `;
    
    cartContainer.appendChild(itemDiv);
    total += item.price * item.quantity;
  });

  // Update total price
  document.querySelector('.cart-summary p').innerHTML = `<strong>Total: </strong>$${total.toFixed(2)}`;
}

// Function to remove an item from the cart
function removeItem(itemId) {
  cartItems = cartItems.filter(item => item.id !== itemId);
  renderCart();
}

// Event listeners for quantity changes
document.addEventListener('input', function(e) {
  if (e.target.type === 'number') {
    const itemId = parseInt(e.target.id.split('-')[1]);
    const newQuantity = parseInt(e.target.value);

    const item = cartItems.find(item => item.id === itemId);
    if (item) {
      item.quantity = newQuantity;
      renderCart();
    }
  }
});

// Initial render
renderCart();
