// Selecciona el botón del carrito
const cartButton = document.querySelector('.cart-button');

// Función para mostrar una notificación temporal al usuario.
const showNotification = (message) => {
    // Crea el elemento de notificación
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'notification-message'; // Clase definida en productos_style.css
    document.body.appendChild(notification);

    // Oculta la notificación después de 2 segundos.
    setTimeout(() => {
        // Usa una clase para la animación de desvanecimiento
        notification.classList.add('fade-out');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, 2000);
};

// Función para actualizar el contador del carrito en el encabezado.
const updateCartCount = () => {
    // Obtiene el carrito de localStorage; si no existe, usa un array vacío.
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    // Calcula el total de artículos sumando las cantidades de cada producto.
    const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
    // Actualiza el texto del botón del carrito con el nuevo total.
    cartButton.textContent = `🛒 Carrito (${totalItems})`;
};

// Lógica para el filtro de categorías
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Función para manejar el filtro al hacer clic en un botón
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;

            // Oculta todas las secciones de productos
            document.querySelectorAll('.product-category').forEach(section => {
                section.style.display = 'none';
            });
            
            // Remueve la clase 'active' de todos los botones de filtro
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Agrega la clase 'active' al botón seleccionado
            button.classList.add('active');

            if (category === 'all') {
                // Muestra todas las secciones de productos
                document.querySelectorAll('.product-category').forEach(section => {
                    section.style.display = 'block';
                });
            } else {
                // Muestra solo la sección de la categoría seleccionada
                const selectedSection = document.querySelector(`.product-category[data-category=\"${category}\"]`);
                if (selectedSection) {
                    selectedSection.style.display = 'block';
                }
            }
        });
    });

    // Lógica para redirigir a la página de producto
    const viewProductBtns = document.querySelectorAll('.view-product-btn');
    viewProductBtns.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Previene el comportamiento predeterminado del enlace
            const productCard = button.closest('.product-card');

            // Asegúrate de que la tarjeta de producto exista
            if (!productCard) {
                console.error("No se encontró la tarjeta de producto.");
                showNotification("Error: No se puede ver el producto. Inténtalo de nuevo.");
                return;
            }

            // Recopila los datos del producto
            const productId = productCard.getAttribute('data-id');
            const productName = productCard.querySelector('h3').textContent;
            const productPriceText = productCard.querySelector('.price').textContent;
            // Aseguramos que se pueda parsear el precio correctamente limpiando el símbolo
            const productPrice = parseFloat(productPriceText.replace('$', '').replace('.', '').replace(',', '.'));
            
            // --- INICIO: SOLUCIÓN DEL ERROR AL OBTENER LA RUTA DE LA IMAGEN ---
            let productImage = '';
            const imgElement = productCard.querySelector('img');

            if (imgElement) {
                // Caso 1: Si existe el tag <img> (productos como iPad Pro, accesorios, etc.)
                productImage = imgElement.src;
            } else {
                // Caso 2: Si la imagen está definida con un DIV y fondo CSS (productos como iPhone)
                if (productId === 'iphone16promax') {
                    // Ruta hardcodeada según la configuración en productos_style.css para .first-image
                    productImage = '../img/iphone-16-pro-max-1_6EFF873F24804524AAB5AAD8389E9913.jpg';
                } else if (productId === 'iphonese') {
                    // Ruta hardcodeada según la configuración en productos_style.css para .second-image
                    productImage = '../img/descarga.avif';
                }else if (productId === 'ipadpro') {
                    // Ruta hardcodeada según la configuración en productos_style.css para .second-image
                    productImage = '../img/D_NQ_NP_758447-MLA46975173385_082021-O.webp';
                }else if (productId === 'macbookair15') {
                    // Ruta hardcodeada según la configuración en productos_style.css para .second-image
                    productImage = '../img/D_NQ_NP_977736-MLA83571171203_042025-O.webp';
                }else if (productId === 'applewatchseries10') {
                    // Ruta hardcodeada según la configuración en productos_style.css para .second-image
                    productImage = '../img/D_Q_NP_2X_882490-MLU77852262960_072024-P.webp';
                }else if (productId === 'airpodspro') {
                    // Ruta hardcodeada según la configuración en productos_style.css para .second-image
                    productImage = '../img/apple-airpods-pro-segunda-generacion.jpg';
                }else if (productId === 'cargador_magsafe') {
                    // Ruta hardcodeada según la configuración en productos_style.css para .second-image
                    productImage = '../img/D_NQ_NP_692212-MLU70775490991_072023-O.webp';
                }
                // Fallback en caso de no encontrar ninguna imagen
                if (!productImage) {
                    productImage = 'https://placehold.co/300x300/CCCCCC/333333?text=Sin+Imagen';
                }
            }
            // --- FIN: SOLUCIÓN DEL ERROR AL OBTENER LA RUTA DE LA IMAGEN ---


            // Añade una descripción y características de ejemplo para la página del producto
            let productDescription;
            let productFeatures;
            
            // Se corrige el ID del iPhone 16 Pro Max para que coincida con el data-id del HTML
            if (productId === "iphone16promax") { 
                productDescription = "El iPhone más potente y sofisticado hasta la fecha. Con una pantalla más grande, cámaras de nivel profesional y un rendimiento inigualable.";
                productFeatures = ["Cámara principal de 50 MP", "Pantalla OLED de 6.7\" con ProMotion", "Batería de larga duración", "Cuerpo de titanio"];
            } else if (productId === "iphonese") {
                productDescription = "El iPhone SE combina el chip A15 Bionic, 5G, gran autonomía y un diseño robusto en un solo dispositivo.";
                productFeatures = ["Chip A15 Bionic", "Conectividad 5G ultrarrápida", "Gran autonomía de batería", "Botón de inicio con Touch ID"];
            } else if (productId === "ipadpro") {
                productDescription = "El iPad Pro es el lienzo y el cuaderno más versátiles del mundo.";
                productFeatures = ["Chip M4 ultrarrápido", "Pantalla Liquid Retina XDR", "Sistema de cámara avanzado"];
            } else if (productId === "macbookair15") {
                productDescription = "El MacBook Air 15'' es increíblemente fino, potente y perfecto para cualquier tarea.";
                productFeatures = ["Chip M3", "Pantalla Liquid Retina de 15.3 pulgadas", "Batería de hasta 18 horas"];
            } else if (productId === "applewatchseries10") {
                productDescription = "El Apple Watch Series 10 te ayuda a mantenerte activo, sano y conectado.";
                productFeatures = ["Pantalla más grande", "Nuevas funciones de salud", "Detección de accidentes"];
            } else if (productId === "airpodspro") {
                productDescription = "Los AirPods Pro ofrecen cancelación de ruido, sonido envolvente y un ajuste cómodo.";
                productFeatures = ["Cancelación activa de ruido", "Modo de sonido ambiente adaptable", "Audio espacial personalizado"];
            } else if (productId === "cargador_magsafe") {
                productDescription = "El Cargador MagSafe simplifica la carga inalámbrica.";
                productFeatures = ["Carga rápida inalámbrica", "Imanes perfectamente alineados", "Diseño compacto"];
            } else {
                productDescription = "Descripción no disponible.";
                productFeatures = [];
            }
            
            const selectedProduct = {
                id: productId,
                name: productName,
                price: productPrice,
                image: productImage, // Ahora contiene una ruta válida o un placeholder
                description: productDescription,
                features: productFeatures
            };

            // Guarda el producto seleccionado en localStorage antes de redirigir.
            localStorage.setItem('selectedProduct', JSON.stringify(selectedProduct));

            // Redirige al usuario a la página del producto.
            window.location.href = `../Producto/pagina_producto.html`;
        });
    });
});

// Llama a la función de actualización del carrito.
updateCartCount();
