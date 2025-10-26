// server/server.js
const path = require('path');
const express = require('express');
const cors = require('cors');

// Importamos el SDK de Mercado Pago.
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = 4000; // El puerto de este servidor Node.js/Express

// ============================================================================
// 1. ENVIRONMENT VARIABLE LOADING (Forced Loading and Fallback)
// ============================================================================

// Intentamos usar dotenv con ruta absoluta (manera estándar y robusta)
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 
let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// Base de datos de productos simulada
// NOTA: Los IDs deben coincidir con los usados en el frontend (pagina_inicio.js, carrito.js)
const PRODUCTS_DB = [
    { id: '1', name: 'iPhone 16 Pro Max', price: 1299 },
    { id: '2', name: 'iPad Pro', price: 899 },
    { id: '3', name: 'Apple Watch Ultra 2', price: 799 },
    { id: '4', name: 'Funda de Silicona', price: 49 },
    { id: '5', name: 'Cargador MagSafe', price: 39 },
];

// Configuration of middlewares
app.use(express.json()); 

// Permite solicitudes solo desde tu Live Server en el puerto 5501.
app.use(cors({ origin: 'http://127.0.0.1:5501' })); 

// 2. Mercado Pago Access Token Configuration
const tokenLoaded = !!accessToken;

// *** CRITICAL DEBUG LINE ***
console.log("--- DEBUG DOTENV ---");
console.log("Valor de MERCADO_PAGO_ACCESS_TOKEN (Visto por el servidor):", tokenLoaded ? "Token loaded (Length: " + accessToken.length + ")" : "!!! ERROR: Token NOT LOADED or EMPTY !!!");
console.log("Server File Path (__dirname):", __dirname); 
console.log("--------------------");
// **************************

// Verificamos el token de acceso antes de inicializar el cliente MP
if (!tokenLoaded) {
    console.error("⛔ FATAL ERROR: MERCADO_PAGO_ACCESS_TOKEN is missing or not loaded. Check your .env file.");
    // Usamos un token de fallback si el env falla, aunque la operación de pago probablemente fallará
    accessToken = 'TOKEN_DE_FALLBACK_SI_ENV_FALLA';
}

// ✅ Cliente configurado correctamente para la versión v2.x.x
const mpClient = new MercadoPagoConfig({ 
    accessToken: accessToken,
    options: { timeout: 5000 } // Añadimos un timeout para robustez
});


// ============================================================================
// 3. RUTAS
// ============================================================================

// Endpoint principal para pruebas de estado
app.get('/', (req, res) => {
    res.send(`Servidor de backend de iPlace está corriendo. Puerto: ${PORT}. Token MP cargado: ${tokenLoaded}`);
});

// Endpoint para crear la preferencia de pago
app.post('/create_preference', async (req, res) => {
    const cart = req.body.cart; // El carrito enviado desde el frontend

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "Cart data is missing or empty." });
    }

    let preferenceItems = [];
    let totalAmount = 0;

    // Procesar el carrito y validar contra la "base de datos"
    for (const cartItem of cart) { // Usamos 'for...of' para poder usar 'return' en caso de error
        const dbProduct = PRODUCTS_DB.find(p => p.id === cartItem.id);
        const quantity = cartItem.quantity;

        // 🛑 Validamos la existencia del producto
        if (!dbProduct) {
            console.error(`❌ Producto con ID ${cartItem.id} no encontrado en PRODUCTS_DB. Deteniendo solicitud.`);
            return res.status(400).json({ error: `Producto con ID ${cartItem.id} no encontrado. Error de sincronización.` });
        }
        
        // 🛑 CORRECCIÓN CLAVE: Forzar el precio a un número decimal con dos decimales (formato de API)
        const unitPriceFloat = parseFloat(dbProduct.price).toFixed(2);
        const unitPrice = parseFloat(unitPriceFloat); // Convertir de vuelta a number para cálculos locales
        
        if (isNaN(unitPrice) || unitPrice <= 0) {
            console.error(`❌ Precio inválido para el producto con ID ${cartItem.id}. Precio: ${unitPrice}`);
            return res.status(400).json({ error: `El precio para el producto ${dbProduct.name} es inválido.` });
        }

        if (quantity > 0) {
            totalAmount += unitPrice * quantity;
            
            preferenceItems.push({
                title: dbProduct.name,
                // Usamos el precio en formato float/string para la API de Mercado Pago
                unit_price: unitPrice, 
                quantity: quantity,
            });
        }
    }
    
    if (totalAmount <= 0) {
        return res.status(400).json({ error: "El carrito está vacío o la suma de los productos es cero." });
    }

    // --- REAL CALL TO MERCADO PAGO API ---
    let preference = {
        items: preferenceItems,
        back_urls: {
            "success": "http://127.0.0.1:5501/Finalizar_compra/pago-exitoso.html",
            "failure": "http://127.0.0.1:5501/Finalizar_compra/pago-fallido.html",
            "pending": "http://127.0.0.1:5501/Finalizar_compra/pago-pendiente.html"
        },
        auto_return: "approved", 
    };

    // ✅ Usamos la clase Preference, pasándole el cliente MP
    const preferenceService = new Preference(mpClient);

    // ✅ Llamamos al método create, requiriendo que los datos estén dentro de 'body'
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
                     errorMessage = `Error de MP: ${error.message}`;
                 }
            }

            res.status(500).json({ error: errorMessage });
        });
});


// 4. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Express corriendo en http://localhost:${PORT}`);
    if (tokenLoaded) {
        console.log("✅ Mercado Pago Client configurado correctamente.");
    }
});
