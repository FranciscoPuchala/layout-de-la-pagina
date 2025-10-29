// Selecciona los elementos del DOM que vamos a usar
const totalElement = document.getElementById('total-price');
const mpOption = document.getElementById('mp-option');
const transferOption = document.getElementById('transfer-option');
const cartButton = document.querySelector('.cart-button');
const confirmPurchaseButton = document.getElementById('pay-mp-button'); // ID correcto del botón

// ** IMPORTANTE: CLAVE PÚBLICA DE MERCADO PAGO **
// Aquí va tu Clave Pública (Public Key)
const MP_PUBLIC_KEY = "TEST-1c4d6d64-db6d-44ac-b486-13f6195fad11"; // 🛑 ¡Pon tu clave pública!

// 1. Inicialización del SDK de Mercado Pago
const mp = new MercadoPago(MP_PUBLIC_KEY);

// Función de utilidad para mostrar mensajes
const showMessage = (message, isError = false) => {
    if (isError) {
        console.error("ERROR: ", message);
    } else {
        console.log("INFO: ", message);
    }
    // Nota: alert() bloquea la ejecución y puede ser molesto, pero es útil para debugging.
    alert(message);
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


// 5. Función para manejar la confirmación de la compra (¡CON AMBAS CORRECCIONES!)
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
            
            // PASO 1: OBTENER LOS DATOS DEL CARRITO
            const fullCart = JSON.parse(localStorage.getItem('cart')) || []; 
            if (fullCart.length === 0) {
                showMessage('El carrito está vacío. Agrega productos antes de pagar.', true);
                confirmPurchaseButton.textContent = 'Pagar con Mercado Pago';
                confirmPurchaseButton.disabled = false;
                return;
            }

            // (Esto ya estaba bien: enviar solo IDs y cantidad al servidor)
            const itemsForServer = fullCart.map(item => ({
                id: item.id,
                quantity: item.quantity,
            }));
            
            const requestBody = { cart: itemsForServer };

            
            // PASO 2: Llamar al servidor para crear la preferencia
            const response = await fetch('http://localhost:4000/create_preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fallo la creación de la preferencia en el servidor.');
            }

            const preferenceId = data.id;

            // =============================================================
            //                INICIO DE LAS CORRECCIONES
            // =============================================================
            
            // ✅ CORRECCIÓN 1: Leer el monto total desde localStorage
            // Nos aseguramos de que sea un NÚMERO (float).
            const totalAmount = parseFloat(localStorage.getItem('checkoutTotal'));

            // Verificación por si el monto es inválido
            if (isNaN(totalAmount) || totalAmount <= 0) {
                showMessage('Error: El monto total es inválido. Intenta recargar la página.', true);
                confirmPurchaseButton.textContent = 'Error. Reintentar';
                confirmPurchaseButton.disabled = false;
                return;
            }

            // 6. Inicializar el Payment Brick de Mercado Pago
            const mpContainer = document.getElementById('payment-button-container');

            if (mpContainer) {
                 // Ocultar el botón de compra
                 confirmPurchaseButton.style.display = 'none'; 
                 // Mostrar el contenedor del Brick
                 mpContainer.style.display = 'block';

                mp.bricks().create("payment", "payment-button-container", {
                    initialization: {
                        // ✅ CORRECCIÓN 2: Añadir la propiedad 'amount'
                        amount: totalAmount, 
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
                    
                    // ✅ CORRECCIÓN 3: Añadir el callback 'onReady'
                    onReady: () => {
                        /*
                          Callback para cuando el Brick está 100% cargado y listo.
                        */
                        console.log('Payment Brick está LISTO y cargado.');
                    },

                    // (Este callback 'onError' ya lo tenías y estaba correcto)
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
            // =============================================================
            //                  FIN DE LAS CORRECCIONES
            // =============================================================

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
