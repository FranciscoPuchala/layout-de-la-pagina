
        const updateCartCount = () => {
            const cartButton = document.querySelector('.cart-button');
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
            cartButton.textContent = `🛒 Carrito (${totalItems})`;
            // Vaciar el carrito después de un pago exitoso
            localStorage.removeItem('cart');
            localStorage.removeItem('checkoutTotal');
        };
        document.addEventListener('DOMContentLoaded', updateCartCount);
    