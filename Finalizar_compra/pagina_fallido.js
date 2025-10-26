
        const updateCartCount = () => {
            const cartButton = document.querySelector('.cart-button');
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
            cartButton.textContent = `🛒 Carrito (${totalItems})`;
        };
        document.addEventListener('DOMContentLoaded', updateCartCount);
