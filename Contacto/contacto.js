        // --- Lógica del Chat ---
        const startChatBtn = document.getElementById('start-chat-btn');
        const closeChatBtn = document.getElementById('close-chat-btn');
        const chatWidget = document.getElementById('chat-widget');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
         const cartButton = document.querySelector('.cart-button');
    // Función para renderizar los productos del carrito y actualizar el resumen

        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageText = chatInput.value.trim();
            if (messageText) {
                addMessage(messageText, 'user');
                chatInput.value = '';
                simulateSupportResponse();
            }
        });
        updateCartCount();