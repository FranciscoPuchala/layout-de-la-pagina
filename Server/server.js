// server/server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
// Importamos el SDK de Mercado Pago. En la versión v2.x.x,
// este objeto contiene el constructor 'MercadoPagoConfig'.
const mercadopago = require('mercadopago');

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

// 🚨 CORRECCIÓN CRÍTICA: Cambiado el puerto a 5501 según lo acordado.
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
    // No salimos de la aplicación, pero la funcionalidad de MP fallará
}

const mpClient = new mercadopago.MercadoPagoConfig({ 
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
    cart.forEach(cartItem => {
        const dbProduct = PRODUCTS_DB.find(p => p.id === cartItem.id);
        const quantity = cartItem.quantity;

        if (dbProduct && quantity > 0) {
            const unitPrice = dbProduct.price; // Usar el precio del backend
            totalAmount += unitPrice * quantity;
            
            preferenceItems.push({
                title: dbProduct.name,
                unit_price: unitPrice,
                quantity: quantity,
            });
        }
    });
    
    if (totalAmount <= 0) {
        return res.status(400).json({ error: "The cart is empty or products are invalid." });
    }

    // --- REAL CALL TO MERCADO PAGO API ---
    let preference = {
        items: preferenceItems,
        back_urls: {
            // ✅ CORRECCIÓN: URLs de retorno ahora apuntan al Live Server en 127.0.0.1:5501
            "success": "http://127.0.0.1:5501/Finalizar_compra/pago-exitoso.html",
            "failure": "http://127.0.0.1:5501/Finalizar_compra/pago-fallido.html",
            "pending": "http://127.0.0.1:5501/Finalizar_compra/pago-pendiente.html"
        },
        auto_return: "approved", 
    };

    // 🛑 USAMOS LA INSTANCIA DEL CLIENTE MP para llamar al método create
    mpClient.preferences.create(preference)
        .then(function (response) {
            // El ID de la preferencia es lo que necesitamos para renderizar el botón en el frontend
            res.json({ id: response.body.id });
        })
        .catch(function (error) {
            console.error("Mercado Pago Error:", error);
            res.status(500).json({ error: "Error al crear la preferencia de pago en Mercado Pago." });
        });
});


// 4. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Express corriendo en http://localhost:${PORT}`);
    if (tokenLoaded) {
        console.log("✅ Mercado Pago Client configurado correctamente.");
    }
});
