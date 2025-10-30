// Selecciona los elementos del DOM que vamos a usar
const totalElement = document.getElementById('total-price');
const mpOption = document.getElementById('mp-option');
const transferOption = document.getElementById('transfer-option');
const cartButton = document.querySelector('.cart-button');
const confirmPurchaseButton = document.getElementById('pay-mp-button'); // ID correcto del botón

// ** IMPORTANTE: CLAVE PÚBLICA DE MERCADO PAGO **
// Aquí va tu Clave Pública (Public Key)
const MP_PUBLIC_KEY = "TEST-1c4d6d64-db6d-44ac-b486-13f6195fad11"; // ¡Pon tu clave pública real si la tienes!

// 1. Inicialización del SDK de Mercado Pago
const mp = new MercadoPago(MP_PUBLIC_KEY);

// Función de utilidad para mostrar mensajes (usando console en lugar de alert)
const showMessage = (message, isError = false) => {
    if (isError) {
        console.error("ERROR: ", message);
    } else {
        console.log("INFO: ", message);
    }
};


// 2. Función para actualizar el total del resumen de compra
const updateCheckoutTotal = () => {
    const checkoutTotal = localStorage.getItem('checkoutTotal');
    const subtotalSummary = document.getElementById('subtotal-price');
    
    if (checkoutTotal) {
        // Asegura que el precio se muestre con dos decimales para el resumen visual
        const formattedTotal = parseFloat(checkoutTotal).toFixed(2);
        totalElement.textContent = `$${formattedTotal}`;
        if (subtotalSummary) {
            subtotalSummary.textContent = `$${formattedTotal}`;
        }
    } else {
        totalElement.textContent = `$0.00`;
        if (subtotalSummary) {
            subtotalSummary.textContent = `$0.00`;
        }
        showMessage('No se encontró el total de la compra. Redirigiendo al carrito.', true);
        // Opcional: Redirigir si no hay total
        // window.location.href = '../Carrito/pagina_carrito.html';
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

// 4. Función para manejar la selección de método de pago
const handlePaymentSelection = () => {
    const paymentOptions = document.querySelectorAll('.payment-method');
    const mpContainer = document.getElementById('mp-container');
    const payMpButton = document.getElementById('pay-mp-button');
    const paymentButtonContainer = document.getElementById('payment-button-container');

    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remover la clase 'selected' de todos y añadirla al seleccionado
            paymentOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            // Mostrar el botón o el contenedor del Brick solo si es Mercado Pago
            if (option.id === 'mp-option') {
                mpContainer.style.display = 'block';
                payMpButton.style.display = 'block';
                // Ocultar el contenedor del Brick al inicio
                paymentButtonContainer.style.display = 'none'; 
            } else {
                mpContainer.style.display = 'none';
                payMpButton.style.display = 'none';
                paymentButtonContainer.style.display = 'none';
                showMessage("Seleccionaste Transferencia, este método no está implementado para la demo.", false);
            }
        });
    });

    // Seleccionar Mercado Pago por defecto al cargar la página
    if (mpOption) {
        mpOption.click();
    }
};


// 5. Función para manejar la confirmación de la compra con Mercado Pago
const handlePaymentConfirmation = () => {
    confirmPurchaseButton.addEventListener('click', async () => {
        
        confirmPurchaseButton.textContent = 'Procesando...';
        confirmPurchaseButton.disabled = true;

        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const checkoutTotal = localStorage.getItem('checkoutTotal');

        if (cart.length === 0 || !checkoutTotal) {
            showMessage('El carrito está vacío o el total no está disponible.', true);
            confirmPurchaseButton.textContent = 'Volver al Carrito';
            confirmPurchaseButton.disabled = false;
            return;
        }

        // 5.1. Transformar el carrito para el backend (solo nombre y precio unitario)
        const itemsToProcess = cart.map(item => ({
            id: item.id,
            title: item.name,
            unit_price: item.price,
            quantity: item.quantity,
        }));
        
        // 5.2. Crear el objeto de la preferencia para enviar al backend
        const preferenceData = {
            items: itemsToProcess,
            total: checkoutTotal // El total se usa para validación en el servidor si se implementa
        };

        let preferenceId = null;

        try {
            // 🛑 5.3. LLAMADA AL BACKEND: COMENTADA PARA EVITAR EL ERROR 
            //       'Error en la solicitud al servidor' ya que el servidor no está corriendo.
            //       Se utiliza una respuesta estática para que el Brick funcione.
            
            // const response = await fetch('http://localhost:4000/create_preference', { 
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify(preferenceData)
            // });

            // if (!response.ok) {
            //     throw new Error(`Error en la solicitud al servidor: ${response.status}`);
            // }

            // const data = await response.json();
            // preferenceId = data.id;

            // ✅ SIMULACIÓN DE RESPUESTA DEL SERVIDOR (Necesitas un ID de preferencia válido de prueba)
            // Usa un ID de preferencia de prueba válido de Mercado Pago.
            // ESTO REEMPLAZA LA LLAMADA AL FETCH MIENTRAS NO CORRAS EL SERVER.JS
            preferenceId = "123456789-preference-test-id"; 
            
            if (!preferenceId) {
                throw new Error("No se pudo obtener un ID de preferencia (servidor no activo o error).");
            }
            // FIN DE LA SIMULACIÓN

            // 5.4. Obtener el monto total correcto (resuelve el error anterior)
            const totalAmount = parseFloat(checkoutTotal);

            // 5.5. Inicializar el Payment Brick de Mercado Pago
            const mpContainer = document.getElementById('payment-button-container');

            if (mpContainer) {
                 // Ocultar el botón de compra
                 confirmPurchaseButton.style.display = 'none'; 
                 // Mostrar el contenedor del Brick
                 mpContainer.style.display = 'block';

                mp.bricks().create("payment", "payment-button-container", {
                    initialization: {
                        amount: totalAmount, // ✅ CORRECCIÓN 1: Se pasa el monto total
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
                    
                    // ✅ CORRECCIÓN 2: Callback onReady OBLIGATORIO
                    onReady: () => {
                        console.log('Payment Brick está LISTO y cargado.');
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
            // Mostrar un mensaje más específico sobre la necesidad del servidor
            let displayMessage = error.message;
            if (error.message.includes('fetch') || error.message.includes('servidor')) {
                displayMessage = 'ERROR: El servidor local (http://localhost:4000) no está activo. No se pudo crear la preferencia de pago.';
            }
            confirmPurchaseButton.textContent = 'Error. Reintentar Compra';
            confirmPurchaseButton.disabled = false;
            showMessage(displayMessage, true);
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
