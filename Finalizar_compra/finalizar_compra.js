// Selecciona los elementos del DOM que vamos a usar
const totalElement = document.getElementById('total-price');
const mpOption = document.getElementById('mp-option');
const transferOption = document.getElementById('transfer-option');
const cartButton = document.querySelector('.cart-button');
const confirmPurchaseButton = document.getElementById('pay-mp-button'); // ID correcto del botón

// ** IMPORTANTE: CLAVE PÚBLICA DE MERCADO PAGO **
// Aquí va tu Clave Pública (Public Key)
const MP_PUBLIC_KEY = "TU_CLAVE_PUBLICA_AQUI"; // 🛑 ¡Pon tu clave pública!

// 1. Inicialización del SDK de Mercado Pago
const mp = new MercadoPago(MP_PUBLIC_KEY);

// Función de utilidad para mostrar mensajes
const showMessage = (message, isError = false) => {
    if (isError) {
        console.error("ERROR: ", message);
    } else {
        console.log("INFO: ", message);
    }
    alert(message); // Temporal para debugging
};


// 2. Función para actualizar el total del resumen de compra
const updateCheckoutTotal = () => {
    const checkoutTotal = localStorage.getItem('checkoutTotal');
    const subtotalSummary = document.getElementById('subtotal-price');
    
    if (checkoutTotal) {
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
    if(cartButton) {
        cartButton.textContent = `🛒 Carrito (${totalItems})`;
    }
};

// 4. Lógica de selección de métodos de pago (sin cambios funcionales)
const handlePaymentSelection = () => {
    // ... (Tu lógica original estaba bien, la dejo aquí por completitud) ...
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


// 5. Función para manejar la confirmación de la compra (¡ACTUALIZADA!)
const handlePaymentConfirmation = () => {
    // Asegurarse de que el botón existe antes de añadir el listener
    if (!confirmPurchaseButton) {
        console.error("Error: No se encontró el botón #pay-mp-button");
        return;
    }
    
    confirmPurchaseButton.addEventListener('click', async () => {
        // Deshabilitar el botón
        confirmPurchaseButton.textContent = 'Procesando...';
        confirmPurchaseButton.disabled = true;

        try {
            
            // 🛑 PASO CLAVE 1: OBTENER LOS DATOS DEL CARRITO DE localStorage
            const fullCart = JSON.parse(localStorage.getItem('cart')) || []; 
            if (fullCart.length === 0) {
                showMessage('El carrito está vacío. Agrega productos antes de pagar.', true);
                confirmPurchaseButton.textContent = 'Pagar con Mercado Pago';
                confirmPurchaseButton.disabled = false;
                return;
            }

            // ===================================================================
            //          ⚡ CAMBIO DE SEGURIDAD ⚡
            // ===================================================================
            // Ya NO enviamos el precio. Solo ID y cantidad.
            // El servidor se encargará de verificar el precio.
            const itemsForServer = fullCart.map(item => ({
                id: item.id,
                quantity: item.quantity,
            }));
            
            // El servidor ahora espera { cart: [{id, quantity}, ...] }
            const requestBody = { cart: itemsForServer };
            // ===================================================================

            
            // Llama al servidor para crear la preferencia de pago
            const response = await fetch('http://localhost:4000/create_preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody), // 🛑 AHORA ENVIAMOS LOS DATOS SEGUROS
            });

            const data = await response.json();

            if (!response.ok) {
                // Si el servidor detectó un producto inválido, mostrará el error
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
                    onError: (error) => {
                        console.error("Error al inicializar el Payment Brick: ", error);
                        showMessage("Error al cargar el método de pago de Mercado Pago.", true);
                        confirmPurchaseButton.style.display = 'block'; 
                        confirmPurchaseButton.textContent = 'Reintentar Pago';
                        confirmPurchaseButton.disabled = false;
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