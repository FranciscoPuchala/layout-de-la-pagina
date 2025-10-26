// Selecciona los elementos del DOM que vamos a usar
const totalElement = document.getElementById('total-price');
const mpOption = document.getElementById('mp-option');
const transferOption = document.getElementById('transfer-option');
const cartButton = document.querySelector('.cart-button');
const confirmPurchaseButton = document.querySelector('.confirm-purchase-button');

// ** IMPORTANTE: CLAVE PÚBLICA DE MERCADO PAGO **
// DEBE usar su clave pública de prueba o producción aquí.
const MP_PUBLIC_KEY = "TTEST-1c4d6d64-db6d-44ac-b486-13f6195fad11"; 

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
    // Obtiene el carrito de localStorage; si no existe, usa un array vacío.
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    // Calcula el total de artículos sumando las cantidades de cada producto.
    const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
    // Actualiza el texto del botón del carrito con el nuevo total.
    cartButton.textContent = `🛒 Carrito (${totalItems})`;
};

// 4. Función para manejar la selección de método de pago (Mercado Pago o Transferencia)
const handlePaymentSelection = () => {
    // Lógica de selección de pago (oculta o muestra el botón de confirmación)
    if (mpOption) {
        mpOption.addEventListener('click', () => {
            mpOption.classList.add('selected');
            if (transferOption) transferOption.classList.remove('selected');
            if (confirmPurchaseButton) confirmPurchaseButton.style.display = 'block';
        });
    }

    if (transferOption) {
        transferOption.addEventListener('click', () => {
            transferOption.classList.add('selected');
            if (mpOption) mpOption.classList.remove('selected');
            if (confirmPurchaseButton) confirmPurchaseButton.style.display = 'block';
        });
    }
};

// 5. Función para manejar la confirmación de la compra (llamada al servidor)
const handlePaymentConfirmation = () => {
    if (!confirmPurchaseButton) return;

    confirmPurchaseButton.addEventListener('click', async () => {
        // Sólo procesamos si se eligió Mercado Pago
        if (!mpOption || !mpOption.classList.contains('selected')) {
             // Podrías mostrar un mensaje pidiendo al usuario que seleccione un método
             console.log("Por favor, selecciona un método de pago.");
             return;
        }

        confirmPurchaseButton.textContent = 'Procesando...';
        confirmPurchaseButton.disabled = true;

        try {
            // 🛑 CORRECCIÓN CLAVE: Obtener los productos del carrito de localStorage
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            if (cart.length === 0) {
                alert('El carrito está vacío. Agrega productos antes de finalizar la compra.');
                confirmPurchaseButton.textContent = 'Confirmar Compra';
                confirmPurchaseButton.disabled = false;
                return;
            }

            // Enviar la lista de productos al servidor para crear la preferencia de pago.
            const response = await fetch('http://localhost:4000/create_preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 🚀 CAMBIO AQUÍ: Enviamos el contenido real del carrito.
                body: JSON.stringify({ items: cart }) 
            });

            if (!response.ok) {
                // Maneja errores de HTTP, incluyendo 500 del servidor
                const errorData = await response.json();
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            const preferenceId = data.id;

            // Oculta el botón de confirmación (porque el Brick de Pago lo reemplazará)
            confirmPurchaseButton.style.display = 'none'; 

            // 6. Inicializar el Payment Brick de Mercado Pago
            const mpContainer = document.getElementById('mp-payment-brick');

            if (mpContainer) {
                const bricksBuilder = mp.bricks();
                
                bricksBuilder.create(
                    'payment', 
                    'mp-payment-brick', 
                    {
                        initialization: {
                            preferenceId: preferenceId,
                            redirectMode: "modal", // Para redirigir dentro de un modal/iframe
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
            // 🛑 Uso de alert para simplicidad, idealmente se debe usar un modal
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
