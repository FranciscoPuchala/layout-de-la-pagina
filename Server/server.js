// server/server.js
const path = require('path');
const express = require('express');
const cors = require('cors');

// Importamos el SDK de Mercado Pago y la clase Preference
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = 4000; // El puerto de este servidor Node.js/Express

// ============================================================================
// 1. CONFIGURACIÓN INICIAL
// ============================================================================

// Middleware para habilitar CORS y parsear JSON
app.use(cors());
app.use(express.json());

// Intentamos usar dotenv con ruta absoluta (manera estándar y robusta)
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 
let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// 🛑 FALLBACK TEMPORAL: Si no se encontró la variable de entorno, usa esta clave de prueba
// DEBE ser reemplazada por tu clave real en el archivo .env
if (!accessToken) {
    console.warn("⚠️ Advertencia: No se encontró MERCADO_PAGO_ACCESS_TOKEN. Usando clave de prueba temporal.");
    accessToken = "TEST-8800539110036665-061005-961d62c76e46950f555ff48e5ed41a7d-249590685"; // Clave de prueba genérica
}

const tokenLoaded = !!accessToken;

// 2. Inicialización del cliente de Mercado Pago
const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
const preferenceService = new Preference(client);

// Base de datos de productos simulada
// NOTA: Los IDs deben coincidir con los usados en el frontend (pagina_inicio.js, carrito.js)
const PRODUCTS_DB = [
    { id: '1', name: 'iPhone 16 Pro Max', price: 1299 },
    { id: '2', name: 'iPad Pro', price: 899 },
    { id: '3', name: 'Apple Watch Ultra 2', price: 799 },
    { id: '4', name: 'Funda de Silicona', price: 49 },
    { id: '5', name: 'Cargador MagSafe', price: 39 },
];


// ============================================================================
// 3. RUTAS API
// ============================================================================

// Ruta para crear la preferencia de pago de Mercado Pago
app.post('/create_preference', (req, res) => {
    // El cliente envía el carrito en la propiedad 'cart'
    const clientCart = req.body.cart; 

    if (!clientCart || clientCart.length === 0) {
        return res.status(400).json({ error: 'Contenido de pago no encontrado.' });
    }

    const itemsForMP = [];
    
    // 🛑 MEJORA DE ROBUSTEZ: Usamos un bucle para una mejor gestión de errores de sincronización
    try {
        for (const clientItem of clientCart) {
            
            const itemId = clientItem.id;
            const itemQuantity = parseInt(clientItem.quantity, 10); // Intentamos parsear la cantidad inmediatamente

            // 1. Validar la estructura del ítem del cliente
            // Debe tener ID y la cantidad debe ser un número entero positivo
            if (!itemId || isNaN(itemQuantity) || itemQuantity <= 0) {
                 // Lanzamos un error más específico para ayudar a depurar el frontend
                 throw new Error(`Item de carrito inválido o incompleto: ID=${itemId || 'Falta ID'}, Cantidad=${clientItem.quantity || 'Inválida'}`);
            }

            // 2. Sincronizar con la base de datos del servidor para obtener el precio y nombre
            const serverProduct = PRODUCTS_DB.find(p => p.id === itemId);

            if (!serverProduct) { 
                // Si un producto no se encuentra en el servidor, detenemos el proceso
                throw new Error(`Producto con ID ${itemId} no encontrado en la base de datos del servidor. Error de sincronización.`);
            }

            // 3. Construir el objeto de ítem para Mercado Pago (MP)
            itemsForMP.push({
                title: serverProduct.name,
                // MP requiere unit_price y quantity
                unit_price: parseFloat(serverProduct.price.toFixed(2)), 
                quantity: itemQuantity, // Usamos la cantidad parseada
                currency_id: 'USD', // Usamos USD dado los precios de los productos
                description: serverProduct.name, // Propiedad obligatoria
            });
        }
    } catch (e) {
        // Capturamos el error de sincronización y respondemos al cliente
        console.error(`❌ Error en sincronización/validación del carrito: ${e.message}`);
        return res.status(400).json({ error: e.message });
    }

    // 4. Crear el objeto de preferencia para el SDK de Mercado Pago
    const preference = {
        items: itemsForMP,
        // Los back_urls son CRÍTICOS para que MP sepa dónde redirigir al finalizar el pago
        back_urls: {
            success: "http://localhost:8080/success", // Cambiar por URLs reales en producción
            failure: "http://localhost:8080/failure",
            pending: "http://localhost:8080/pending"
        },
        // 🛑 Evitamos auto_return: "approved" para que funcione con el Payment Brick
        notification_url: "https://your-server-domain.com/notifications", // URL para recibir notificaciones (opcional)
    };
    
    // 5. Llamada a la API de Mercado Pago
    preferenceService.create({ body: preference })
        .then(function (response) {
            // El ID de la preferencia está directamente en el objeto de respuesta
            res.json({ id: response.id });
        })
        .catch(function (error) {
            // 🛑 LOGGING MEJORADO: Muestra el error de la API completo
            console.error("❌ ERROR COMPLETO DE MERCADO PAGO API:", JSON.stringify(error, null, 2)); 
            
            // Intenta extraer un mensaje de error más útil para el frontend
            let errorMessage = "Error desconocido al crear la preferencia de pago. Revisa la consola del servidor para detalles de MP.";
            if (error && error.message) {
                 // Si el error es de autenticación, el mensaje puede ser más simple
                 if (error.status === 401 || error.status === 403) {
                     errorMessage = "Error de autenticación: El token de Mercado Pago (Access Token) es inválido o no tiene permisos.";
                 } else {
                     // Si es un error de validación de MP, se lo devolvemos al usuario
                     errorMessage = `Error de MP: ${error.message}`;}
            }

            res.status(500).json({ error: errorMessage });
        });
});


// 4. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Express corriendo en http://localhost:${PORT}`);
    if (tokenLoaded) {
        console.log("✅ Mercado Pago Client configurado correctamente.");
    } else {
        console.warn("⚠️ Usando clave de prueba. Configura tu .env para producción.");
    }
});
