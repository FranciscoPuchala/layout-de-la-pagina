const totalElement = document.getElementById('total-price');
const mpOption = document.getElementById('mp-option');
const transferOption = document.getElementById('transfer-option');
const cartButton = document.querySelector('.cart-button');
const confirmPurchaseButton = document.querySelector('.confirm-purchase-button');

// ** IMPORTANTE: CLAVE PÚBLICA DE MERCADO PAGO **
// DEBE usar su clave pública de prueba o producción aquí.
const MP_PUBLIC_KEY = "TEST-1c4d6d64-db6d-44ac-b486-13f6195fad11"; 

// 1. Inicialización del SDK de Mercado Pago
const mp = new MercadoPago(MP_PUBLIC_KEY);

// 2. Función para actualizar el total del resumen de compra
const updateCheckoutTotal = () => {
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

// 3. Función para actualizar el contador del carrito en el encabezado.
const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
    cartButton.textContent = `🛒 Carrito (${totalItems})`;
};

// 4. Lógica de selección de método de pago
const handlePaymentSelection = () => {
    mpOption.addEventListener('click', () => {
        mpOption.classList.add('selected');
        transferOption.classList.remove('selected');
        // Mostrar el botón de confirmación si se elige MP
        if (confirmPurchaseButton) {
            confirmPurchaseButton.style.display = 'block';
        }
        // Ocultar el botón de pago MP si ya está renderizado
        const paymentContainer = document.getElementById('payment-button-container');
        if (paymentContainer) {
             paymentContainer.innerHTML = '';
        }
    });

    transferOption.addEventListener('click', () => {
        transferOption.classList.add('selected');
        mpOption.classList.remove('selected');
        // Ocultar el botón de confirmación si se elige Transferencia
        if (confirmPurchaseButton) {
            confirmPurchaseButton.style.display = 'none'; // Aquí se podría mostrar info de la transferencia
        }
        const paymentContainer = document.getElementById('payment-button-container');
        if (paymentContainer) {
             paymentContainer.innerHTML = '';
        }
    });

    // Inicializar con Mercado Pago seleccionado por defecto (si existe el elemento)
    if (mpOption) {
        mpOption.click();
    }
};

// 5. Lógica principal para generar la preferencia de pago de Mercado Pago
const handlePaymentConfirmation = () => {
    if (!confirmPurchaseButton) {
        console.error("Botón de confirmación de compra no encontrado.");
        return;
    }

    confirmPurchaseButton.addEventListener('click', async () => {
        if (!mpOption.classList.contains('selected')) {
             console.log("Por favor, seleccione Mercado Pago como método de pago para continuar.");
             return;
        }

        // Obtener los productos del carrito
        const cart = JSON.parse(localStorage.getItem('cart')) || [];

        if (cart.length === 0) {
            alert('El carrito está vacío. Añade productos para finalizar la compra.');
            return;
        }

        confirmPurchaseButton.disabled = true;
        confirmPurchaseButton.textContent = 'Procesando...';

        try {
            // 🛑 5.1. Llamada al servidor para crear la preferencia
            const response = await fetch('http://127.0.0.1:4000/create_preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cart }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear la preferencia de pago.');
            }

            const data = await response.json();
            const preferenceId = data.id;

            // 🛑 5.2. Ocultar el botón de confirmación del sitio y renderizar el botón de pago de MP
            confirmPurchaseButton.style.display = 'none'; 
            confirmPurchaseButton.disabled = false; // Lo re-habilitamos por si es necesario

            const paymentContainer = document.getElementById('payment-button-container');

            if (paymentContainer) {
                // 🛑 5.3. Renderizar el botón de pago (Payment Brick)
                const bricksBuilder = mp.bricks();

                bricksBuilder.create("payment", "payment-button-container", {
                    initialization: {
                        preferenceId: preferenceId,
                    },
                    // Personalización del botón (opcional)
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
                        // Volver a mostrar el botón de confirmación si falla la inicialización del brick
                        confirmPurchaseButton.style.display = 'block'; 
                    }
                });
            } else {
                console.error("Contenedor de botón de pago no encontrado (#payment-button-container).");
            }

        } catch (error) {
            console.error('Error durante la confirmación de compra:', error.message);
            confirmPurchaseButton.textContent = 'Error. Reintentar Compra';
            confirmPurchaseButton.disabled = false;
            // Manejo de error de Mercado Pago o servidor (mostrar un mensaje)
            alert('Hubo un error al procesar el pago: ' + error.message);
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
