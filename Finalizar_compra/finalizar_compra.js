// Selecciona los elementos del DOM que vamos a usar
const totalElement = document.getElementById('total-price');
const mpOption = document.getElementById('mp-option');
const transferOption = document.getElementById('transfer-option');
const cartButton = document.querySelector('.cart-button');
// El botón de confirmación genérico ya no se usa para el Brick, pero lo mantenemos
// para la opción de transferencia (si la desarrollas).
const confirmPurchaseButton = document.getElementById('pay-mp-button'); 

// ** IMPORTANTE: CLAVE PÚBLICA DE MERCADO PAGO **
// Aquí va tu Clave Pública (Public Key)
const MP_PUBLIC_KEY = "TEST-1c4d6d64-db6d-44ac-b486-13f6195fad11"; // 🛑 ¡Pon tu clave pública!

// 1. Inicialización del SDK de Mercado Pago
const mp = new MercadoPago(MP_PUBLIC_KEY);

// Función de utilidad para mostrar mensajes (Usando console.log/error por ahora)
const showMessage = (message, isError = false) => {
    if (isError) {
        console.error("ERROR: ", message);
    } else {
        console.log("INFO: ", message);
    }
    // Usaremos un simple alert temporalmente para debugging, pero idealmente sería un modal.
    alert(message); 
};


// 2. Función para actualizar el total del resumen de compra
const updateCheckoutTotal = () => {
    const checkoutTotal = localStorage.getItem('checkoutTotal');
    const subtotalSummary = document.getElementById('subtotal-price');
    
    if (checkoutTotal) {
        totalElement.textContent = `$${checkoutTotal}`;
        if (subtotalSummary) {
             // El subtotal debe ser igual al total si no hay impuestos ni descuentos
            subtotalSummary.textContent = `$${checkoutTotal}`;
        }
    } else {
        totalElement.textContent = '$0.00';
        if (subtotalSummary) {
            subtotalSummary.textContent = '$0.00';
        }
        showMessage("No hay productos en el carrito para pagar. Redirigiendo...", true);
        setTimeout(() => {
            window.location.href = '../Carrito/pagina_carrito.html';
        }, 3000);
    }
};

// 3. Función para actualizar el contador del carrito
const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, product) => sum + (product.quantity || 0), 0);
    cartButton.textContent = `🛒 Carrito (${totalItems})`;
};


// 4. Lógica de manejo de selección de método de pago (AQUÍ SE INICIALIZA EL BRICK)
const handlePaymentSelection = () => {
    const paymentMethodsContainer = document.querySelector('.payment-options');

    paymentMethodsContainer.addEventListener('change', (event) => {
        if (event.target.name === 'payment-method') {
            const selectedValue = event.target.value;

            // Ocultar todos los contenedores de pago al cambiar
            document.getElementById('mp-payment-brick-container').style.display = 'none';
            document.getElementById('transfer-details').style.display = 'none';
            confirmPurchaseButton.style.display = 'none';

            if (selectedValue === 'mercadopago') {
                document.getElementById('mp-payment-brick-container').style.display = 'block';
                // 🛑 Llama a la función para cargar el Brick de MP
                initializeMercadoPagoBrick(); 
            } else if (selectedValue === 'transfer') {
                document.getElementById('transfer-details').style.display = 'block';
                // Para el caso de transferencia, mostramos el botón genérico si lo necesitas para confirmar la orden
                confirmPurchaseButton.style.display = 'block'; 
                confirmPurchaseButton.textContent = 'Confirmar Transferencia';
            }
        }
    });
};


// 5. Función para manejar la inicialización del Payment Brick
const initializeMercadoPagoBrick = () => {
    
    // Si el Brick ya existe, no lo volvemos a crear (solo si estamos en un cambio de selección)
    const existingBrick = document.getElementById('mp-payment-brick-container').querySelector('.mercadopago-bricks-payment-method');
    if (existingBrick) {
        console.log("El Brick de Mercado Pago ya está cargado.");
        return; 
    }

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        showMessage('El carrito está vacío. No se puede iniciar el pago.', true);
        return;
    }

    // 1. Llamar al servidor para obtener el ID de Preferencia
    fetch('http://localhost:4000/create_preference', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart: cart }),
    })
    .then(response => {
        if (!response.ok) {
            // Manejar errores HTTP (e.g., 400, 500)
            return response.json().then(errorData => {
                throw new Error(errorData.error || `Error HTTP: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        const preferenceId = data.id;

        // 2. Renderizar el Brick
        if (preferenceId) {
            
            const settings = {
                initialization: {
                    preferenceId: preferenceId,
                    // Se agrega el redirectMode para forzar la redirección en entornos sandbox/iframe
                    redirectMode: "self", 
                },
                customization: {
                    visual: {
                        button: {
                            type: 'default', // 'animated' o 'default'
                            // Agrega tu estilo si quieres personalizar
                        },
                        colors: {
                            // Cambia si quieres que combine con el estilo de iPlace
                            action: '#009ee3', 
                        },
                    },
                    // Ocultamos el campo del email si lo consideramos redundante
                    // hidePaymentButton: true,
                },
                callbacks: {
                    onReady: () => {
                        console.log("Payment Brick listo para interactuar.");
                    },
                    onSubmit: (param) => {
                        // El Brick maneja la lógica de pago internamente.
                        console.log("Datos de pago enviados por el Brick:", param);
                    },
                    onError: (error) => {
                        console.error("Error en el Payment Brick: ", error);
                        showMessage("Error al cargar el método de pago de Mercado Pago. Inténtalo de nuevo.", true);
                    },
                }
            };

            // Aseguramos que el contenedor esté vacío antes de renderizar
            const container = document.getElementById('mp-payment-brick-container');
            container.innerHTML = ''; 

            const bricks = mp.bricks();
            
            // Renderiza el Payment Brick
            bricks.create('payment', 'mp-payment-brick-container', settings);

        } else {
            throw new Error("No se recibió ID de preferencia.");
        }
    })
    .catch(error => {
        console.error('Error al obtener la preferencia de pago:', error);
        showMessage('Error al preparar el pago: ' + error.message, true);
    });

};


// 🛑 Esta función ya no es necesaria, el Brick maneja la confirmación de la ruta 1
// La mantengo como stub en caso de que quieras usarla para la ruta 2 (Order - Pago directo)
const handlePaymentConfirmation = () => {
    // Si usas el Payment Brick, esta función no se usa para la Ruta 1.
    // Solo se usaría si estuvieras implementando la Ruta 2 (Order - Pago directo con tokens).
    
    // Desactivamos el listener del botón de confirmación ya que el Brick tiene su propio botón.
    /* confirmPurchaseButton.addEventListener('click', async () => {
        // ... Lógica para la ruta 2 (Order) ...
    });
    */
};


// Ejecución al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateCheckoutTotal();
    updateCartCount();
    // 🛑 Modificación: Solo configuramos el listener para la selección de método
    handlePaymentSelection(); 
    // Mantenemos esta, aunque su contenido esté vacío ahora
    handlePaymentConfirmation(); 

    // Inicializar la selección por defecto (Mercado Pago) si es necesario
    const defaultSelection = document.querySelector('input[name="payment-method"]:checked');
    if (defaultSelection && defaultSelection.value === 'mercadopago') {
        initializeMercadoPagoBrick();
    }
});
