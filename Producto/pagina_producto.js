// Selecciona los elementos del DOM necesarios.
const productDetailSection = document.getElementById('product-details-container');
const cartButton = document.querySelector('.cart-button');
const productImageElement = document.getElementById('product-image'); // Elemento de imagen

// Función para mostrar una notificación temporal al usuario.
const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'notification-message';
    document.body.appendChild(notification);

    // Hace que la notificación desaparezca después de 2 segundos.
    setTimeout(() => {
        notification.classList.add('fade-out');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, 2000);
};

// Función para actualizar el contador del carrito en el encabezado.
const updateCartCount = () => {
    // Obtiene el carrito de localStorage, si no existe, usa un array vacío.
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    // Calcula el total de artículos en el carrito sumando las cantidades de cada producto.
    const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
    // Actualiza el texto del botón del carrito con el nuevo total.
    cartButton.textContent = `🛒 Carrito (${totalItems})`;
};

// Función para rellenar los detalles del producto en la página.
const renderProductDetails = (selectedProduct) => {
    document.getElementById('product-name').textContent = selectedProduct.name;
    document.getElementById('product-price').textContent = `$${selectedProduct.price.toFixed(2)}`;
    document.getElementById('product-description').textContent = selectedProduct.description;

    // LÓGICA DE LA IMAGEN: Carga la imagen del producto seleccionado
    if (productImageElement && selectedProduct.image) {
        productImageElement.src = selectedProduct.image;
        productImageElement.alt = `Imagen de ${selectedProduct.name}`;
    }

    // Rellena las características
    const featuresList = document.getElementById('product-features');
    featuresList.innerHTML = ''; // Limpia las características existentes
    selectedProduct.features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        featuresList.appendChild(li);
    });

    // Añade el evento para el botón "Añadir al carrito"
    const addToCartButton = document.querySelector('.add-to-cart-button');
    if (addToCartButton) {
        addToCartButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Lógica para añadir al carrito
            let cart = JSON.parse(localStorage.getItem('cart')) || [];

            const existingProductIndex = cart.findIndex(item => item.id === selectedProduct.id);

            if (existingProductIndex !== -1) {
                cart[existingProductIndex].quantity += 1;
            } else {
                cart.push({
                    id: selectedProduct.id,
                    name: selectedProduct.name,
                    price: selectedProduct.price,
                    image: selectedProduct.image,
                    quantity: 1
                });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            showNotification(`${selectedProduct.name} ha sido añadido al carrito.`);
        });
    }
};

// Inicializa la página al cargar el DOM.
document.addEventListener('DOMContentLoaded', () => {
    // Selecciona el elemento de imagen para asegurarse de que exista antes de intentar usarlo.
    const productImageElement = document.getElementById('product-image');

    // Muestra una imagen de fallback si la imagen no se carga (útil para depurar)
    if (productImageElement) {
        productImageElement.onerror = function() {
            console.error("Error al cargar la imagen. Revisar la ruta en localStorage.");
            // Opcionalmente puedes poner un placeholder si falla la carga:
            // this.src = 'https://via.placeholder.com/400x400/FF0000/FFFFFF?text=Error+Carga+Imagen';
            this.style.display = 'none'; // Ocultar si falla completamente
        };
    }

    updateCartCount();

    // Obtiene el producto seleccionado de localStorage (guardado desde la página de inicio).
    const selectedProduct = JSON.parse(localStorage.getItem('selectedProduct'));

    if (selectedProduct) {
        renderProductDetails(selectedProduct);
    } else {
        // Si no se encontró un producto, muestra un mensaje de error.
        productDetailSection.innerHTML = `<p>Producto no encontrado. Por favor, vuelve a la <a href="../Inicio/pagina_inicio.html">página de inicio</a>.</p>`;
    }
});