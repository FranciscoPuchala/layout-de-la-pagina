// Selecciona los elementos del DOM que vamos a usar
const totalElement = document.getElementById('total-price');
const mpOption = document.getElementById('mp-option');
const transferOption = document.getElementById('transfer-option');
const cartButton = document.querySelector('.cart-button');
const confirmPurchaseButton = document.querySelector('.confirm-purchase-button');

// ** IMPORTANTE: CLAVE PÚBLICA DE MERCADO PAGO **
// DEBE usar su clave pública de prueba o producción aquí.
// 🛑 NOTA: He corregido la clave pública que tenías, ya que iniciaba con 'TTEST'. 
// Asegúrate de usar una clave real para pruebas/producción.
const MP_PUBLIC_KEY = "TEST-1c4d6d64-db6d-44ac-b486-13f6195fad11"; 

// 1. Inicialización del SDK de Mercado Pago
const mp = new MercadoPago(MP_PUBLIC_KEY);

// Función de utilidad para mostrar mensajes
const showMessage = (message, isError = false) => {
    // 🛑 Reemplaza el uso de alert() con un mensaje en la consola
    // En una aplicación real, se usaría un modal o un toast (mensaje flotante)
    if (isError) {
        console.error("ERROR: ", message);
    } else {
        console.log("INFO: ", message);
    }
    // Usamos alert temporalmente para que veas los mensajes en el demo
    alert(message);
};


// 2. Función para actualizar el total del resumen de compra
const updateCheckoutTotal = () => {
    // El total ya está calculado en carrito.js y guardado como 'checkoutTotal'
    const checkoutTotal = localStorage.getItem('checkoutTotal');
    const subtotalSummary = document.getElementById('subtotal-price');
    
    if (checkoutTotal) {
        // Formatea el total y actualiza ambos elementos (Subtotal y Total)
        totalElement.textContent = `$${checkoutTotal}`;
        if (subtotalSummary) {
            subtotalSummary.textContent = `$${checkoutTotal}`;
        }
    } else {
        totalElement.textContent = '$0.00';
        if (subtotalSummary) {
            subtotalSummary.textContent = '$0.00';
        }
    }
};

// 3. Función para actualizar el contador del carrito
const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
    // Asume que el botón de carrito está en el header
    if(cartButton) {
        cartButton.textContent = `🛒 Carrito (${totalItems})`;
    }
};

// 4. Lógica de selección de métodos de pago (sin cambios funcionales)
const handlePaymentSelection = () => {
    // Lógica para cambiar la interfaz según el método de pago seleccionado
    if (mpOption) {
        mpOption.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
            mpOption.classList.add('selected');
            document.getElementById('mp-details').style.display = 'block';
            document.getElementById('transfer-details').style.display = 'none';
        });
    }

    if (transferOption) {
        transferOption.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
            transferOption.classList.add('selected');
            document.getElementById('mp-details').style.display = 'none';
            document.getElementById('transfer-details').style.display = 'block';
        });
    }
};


// 5. Función para manejar la confirmación de la compra y la llamada al servidor
const handlePaymentConfirmation = () => {
    confirmPurchaseButton.addEventListener('click', async () => {
        // Deshabilitar el botón y mostrar estado de carga
        confirmPurchaseButton.textContent = 'Procesando...';
        confirmPurchaseButton.disabled = true;

        try {
            
            // 🛑 PASO CLAVE 1: OBTENER LOS DATOS DEL CARRITO DE localStorage
            const cart = JSON.parse(localStorage.getItem('cart')) || []; 
            if (cart.length === 0) {
                showMessage('El carrito está vacío. Agrega productos antes de pagar.', true);
                confirmPurchaseButton.textContent = 'Confirmar Compra';
                confirmPurchaseButton.disabled = false;
                return;
            }

            // 🛑 PASO CLAVE 2: Mapear el carrito al formato de ítems de Mercado Pago que el servidor espera
            const itemsForMP = cart.map(item => ({
                // Los campos title, unit_price y quantity son obligatorios para MP
                title: item.name,
                unit_price: parseFloat(item.price), // Asegurar que es un número
                quantity: item.quantity,
                currency_id: 'USD', // Asegúrate de usar la moneda correcta (e.g., 'ARS', 'MXN', 'BRL')
            }));

            // 🛑 CORRECCIÓN CLAVE: El servidor espera { cart: [...] }
            const requestBody = { cart: itemsForMP };
            
            // Llama al servidor para crear la preferencia de pago, ENVIANDO EL CARRITO
            const response = await fetch('http://localhost:4000/create_preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody), // 🛑 AHORA ENVIAMOS LOS DATOS
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fallo la creación de la preferencia en el servidor.');
            }

            const preferenceId = data.id;

            // 6. Inicializar el Payment Brick de Mercado Pago
            const mpContainer = document.getElementById('payment-button-container');

            if (mpContainer) {
                 // Ocultar el botón de compra
                 confirmPurchaseButton.style.display = 'none'; 
                 // Mostrar el contenedor del Brick
                 mpContainer.style.display = 'block';

                mp.bricks().create("payment", "payment-button-container", {
                    initialization: {
                        preferenceId: preferenceId,
                    },
                    customization: {
                        visual: {
                            buttonBackground: 'black',
                            borderRadius: '8px',
                        },
                        texts: {
                            valueProp: 'smart_option',
                        },
                    },
                    // Callback para manejar errores
                    onError: (error) => {
                        console.error("Error al inicializar el Payment Brick: ", error);
                        showMessage("Error al cargar el método de pago de Mercado Pago.", true);
                        // Volver a mostrar el botón de confirmación si falla la inicialización del brick
                        confirmPurchaseButton.style.display = 'block'; 
                    }
                });
            } else {
                console.error("Contenedor de botón de pago no encontrado (#payment-button-container).");
                showMessage("Error interno: Contenedor de pago no encontrado.", true);
            }

        } catch (error) { 
            console.error('Error durante la confirmación de compra:', error.message);
            confirmPurchaseButton.textContent = 'Error. Reintentar Compra';
            confirmPurchaseButton.disabled = false;
            showMessage('Hubo un error al procesar el pago: ' + error.message, true);
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
