// Selecciona los elementos del DOM que vamos a usar
const cartContainer = document.getElementById('cart-container');
const subtotalElement = document.getElementById('subtotal-price');
const totalElement = document.getElementById('total-price');
const cartButton = document.querySelector('.cart-button');

// Función para mostrar una notificación temporal al usuario.
const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'notification-message';
    document.body.appendChild(notification);

    // Oculta la notificación después de 2 segundos.
    setTimeout(() => {
        notification.classList.add('fade-out');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, 2000);
};

// Función para actualizar el contador del carrito en el encabezado.
const updateCartCount = () => {
    // Obtiene el carrito de localStorage; si no existe, usa un array vacío.
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    // Calcula el total de artículos sumando las cantidades de cada producto.
    const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
    // Actualiza el texto del botón del carrito con el nuevo total.
    cartButton.textContent = `🛒 Carrito (${totalItems})`;
};

// Función para renderizar los productos del carrito y actualizar el resumen
const renderCartItems = () => {
    cartContainer.innerHTML = '';
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    let subtotal = 0;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
    } else {
        cart.forEach(product => {
            // Calcular el subtotal del carrito
            subtotal += product.price * product.quantity;

            const cartItemDiv = document.createElement('div');
            cartItemDiv.classList.add('cart-item');
            cartItemDiv.setAttribute('data-id', product.id);
            
            // Crea el HTML para cada artículo del carrito
            cartItemDiv.innerHTML = `
                <div class="item-info">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="item-details">
                        <span class="item-name">${product.name}</span>
                        <span class="item-price">$${product.price ? product.price.toFixed(2) : '0.00'}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <input type="number" class="item-quantity" value="${product.quantity}" min="1">
                    <button class="remove-item">Eliminar</button>
                </div>
            `;
            cartContainer.appendChild(cartItemDiv);
        });
    }

    // **NUEVA LÓGICA:** El Total es igual al Subtotal (sin impuestos)
    const total = subtotal; 
    
    // Guarda el Subtotal/Total unificado en localStorage
    localStorage.setItem('checkoutTotal', total.toFixed(2));


    // Actualiza los elementos del resumen del carrito en el DOM
    subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    totalElement.textContent = `$${total.toFixed(2)}`;


    // Asigna los eventos a los botones de eliminar después de renderizar los elementos
    const removeButtons = document.querySelectorAll('.remove-item');
    removeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productCard = button.closest('.cart-item');
            const productId = productCard.getAttribute('data-id');
            
            // Filtra el carrito para eliminar el producto seleccionado
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            cart = cart.filter(item => item.id !== productId);
            
            // Guarda el carrito modificado
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Vuelve a renderizar la lista del carrito y actualiza el contador del carrito en la interfaz
            renderCartItems();
            updateCartCount();
        });
    });

    // Asigna el evento de cambio a los campos de cantidad
    const quantityInputs = document.querySelectorAll('.item-quantity');
    quantityInputs.forEach(input => {
        input.addEventListener('change', (event) => {
            const productCard = event.target.closest('.cart-item');
            const productId = productCard.getAttribute('data-id');
            const newQuantity = parseInt(event.target.value, 10);

            if (newQuantity > 0) {
                let cart = JSON.parse(localStorage.getItem('cart')) || [];
                const productIndex = cart.findIndex(item => item.id === productId);

                if (productIndex > -1) {
                    // Actualiza la cantidad y guarda el carrito
                    cart[productIndex].quantity = newQuantity;
                    localStorage.setItem('cart', JSON.stringify(cart));
                    // Vuelve a renderizar la lista del carrito y actualiza el contador
                    renderCartItems();
                    updateCartCount();
                }
            } else {
                // Si la cantidad es 0, elimina el producto
                const removeButton = productCard.querySelector('.remove-item');
                removeButton.click();
            }
        });
    });
};

// Se ejecuta al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Renderiza los productos al cargar la página
    renderCartItems();
    // Actualiza el contador del carrito
    updateCartCount();
});

document.querySelector('.checkout-button').addEventListener('click', function() {
    window.location.href = '../Finalizar_compra/Finalizar_compra.html';
});