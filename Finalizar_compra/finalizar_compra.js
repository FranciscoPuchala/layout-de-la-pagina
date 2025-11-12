// Selecciona los elementos del DOM que vamos a usar
const totalElement = document.getElementById('total-price');
const mpOption = document.getElementById('mp-option');
const transferOption = document.getElementById('transfer-option');
const cartButton = document.querySelector('.cart-button');
const confirmPurchaseButton = document.getElementById('pay-mp-button'); 

// ** IMPORTANTE: CLAVE PÚBLICA DE MERCADO PAGO **
// Mantenemos la clave por si usas otros componentes, pero no es estrictamente necesaria para la redirección.
const MP_PUBLIC_KEY = "APP_USR-6dd13bed-0f80-4ddf-b7b6-2382f59895ac";

// Función de utilidad para mostrar mensajes (Usando console.log/error en lugar de alert)
const showMessage = (message, isError = false) => {
    if (isError) {
        console.error("ERROR ALERTA USUARIO:", message);
    } else {
        console.log("INFO ALERTA USUARIO:", message);
    }
    // Implementa un modal o mensaje en el DOM si no quieres usar alert()
};


// 2. Otras funciones de utilidad
const updateCheckoutTotal = () => {
    const checkoutTotal = localStorage.getItem('checkoutTotal');
    const subtotalSummary = document.getElementById('subtotal-price');
    
    if (checkoutTotal) {
        if (totalElement) totalElement.textContent = `$${checkoutTotal}`;
        if (subtotalSummary) subtotalSummary.textContent = `$${checkoutTotal}`;
    } else {
        if (totalElement) totalElement.textContent = '$0.00';
        if (subtotalSummary) subtotalSummary.textContent = '$0.00';
    }
};

const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
    if(cartButton) {
        cartButton.textContent = `🛒 Carrito (${totalItems})`;
    }
};

const handlePaymentSelection = () => {
    if (mpOption) {
        mpOption.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
            mpOption.classList.add('selected');
        });
    }

    if (transferOption) {
        transferOption.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
            transferOption.classList.add('selected');
        });
    }
};


// 5. Función para manejar la confirmación de la compra (ACTUALIZADA PARA REDIRECCIÓN)
const handlePaymentConfirmation = () => {
    if (!confirmPurchaseButton) {
        console.error("Error: Falta el botón de pago.");
        return;
    }
    
    confirmPurchaseButton.addEventListener('click', async () => {
        // Deshabilitar el botón y mostrar estado
        confirmPurchaseButton.textContent = 'Generando Pago...';
        confirmPurchaseButton.disabled = true;

        try {
            
            // PASO CLAVE 1: OBTENER LOS DATOS DEL CARRITO
            const fullCart = JSON.parse(localStorage.getItem('cart')) || []; 
            if (fullCart.length === 0) {
                showMessage('El carrito está vacío. Agrega productos antes de pagar.', true);
                throw new Error("Carrito vacío."); 
            }

            // Mapeo seguro de ID y cantidad
            const itemsForServer = fullCart.map(item => ({
                id: String(item.id), 
                quantity: Number(item.quantity),
            }));
            
            const requestBody = { cart: itemsForServer };
            
            // Llama al servidor (http://localhost:4000) para crear la preferencia de pago
            const response = await fetch('https://layoutprueba.com/create_preference.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fallo la creación de la preferencia en el servidor.');
            }

            const { init_point } = data; // 🟢 Obtenemos la URL de redirección

            if (init_point) {
                 // 🟢 PASO CLAVE 2: Redirección
                 showMessage('Redirigiendo a Mercado Pago...', false);
                 // Redirige al usuario a la página de pago de Mercado Pago
                 window.location.href = init_point; 
                 
            } else {
                throw new Error("El servidor no devolvió el enlace de pago (init_point).");
            }


        } catch (error) { 
            console.error('Error durante la confirmación de compra:', error.message);
            // Mostrar error al usuario
            showMessage('Hubo un error al procesar el pago: ' + error.message, true); 
            // Restaurar el botón
            confirmPurchaseButton.textContent = 'Error. Reintentar Compra';
            confirmPurchaseButton.disabled = false;
        }
    });
};

// Ejecución al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateCheckoutTotal();
    updateCartCount();
    handlePaymentSelection();
    handlePaymentConfirmation();
});
