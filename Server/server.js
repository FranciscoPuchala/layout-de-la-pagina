// server/server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
// Importamos el SDK de Mercado Pago. En la versión v2.x.x,
// este objeto contiene el constructor 'MercadoPagoConfig'.
const mercadopago = require('mercadopago');

const app = express();
const PORT = 4000;

// ============================================================================
// 1. ENVIRONMENT VARIABLE LOADING (Forced Loading and Fallback)
// ============================================================================

// Intentamos usar dotenv con ruta absoluta (manera estándar y robusta)
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 
let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// Configuration of middlewares
app.use(express.json()); 
// Configura CORS para permitir solicitudes desde tu Live Server
// 🛑 IMPORTANTE: Esto DEBE coincidir con la URL y puerto de tu Live Server.
app.use(cors({ origin: 'http://127.0.0.1:5501' })); 

// 2. Mercado Pago Access Token Configuration
const tokenLoaded = !!accessToken;

// *** CRITICAL DEBUG LINE ***
console.log("--- DEBUG DOTENV ---");
console.log("Valor de MERCADO_PAGO_ACCESS_TOKEN (Visto por el servidor):", tokenLoaded ? "Token loaded (Length: " + accessToken.length + ")" : "!!! ERROR: Token NOT LOADED or EMPTY !!!");
console.log("Server File Path (__dirname):", __dirname); 
console.log("--------------------");
// *************************

if (!accessToken) {
    console.error("CRITICAL: MERCADO_PAGO_ACCESS_TOKEN no está configurado. La API de MP fallará.");
    accessToken = "FALLBACK_TOKEN_SHOULD_FAIL"; 
}


// 3. Inicialización del Cliente de Mercado Pago
// 🛑 IMPORTANTE: Usar la versión 2.x.x de mercadopago
const mpClient = new mercadopago.MercadoPagoConfig({ 
    accessToken: accessToken, 
    options: { timeout: 5000 } // Añadimos un timeout
});

// 4. Base de Datos de Productos (Simulada)
const productDatabase = [
    { id: 'iphone16promax', name: 'iPhone 16 Pro Max', price: 1299 },
    { id: 'ipadpro', name: 'iPad Pro', price: 799 },
    { id: 'applewatchultra2', name: 'Apple Watch Ultra 2', price: 499 },
    { id: 'funda_silicona', name: 'Funda de Silicona', price: 49 },
    { id: 'cargador_magsafe', name: 'Cargador MagSafe', price: 39 },
];

// ============================================================================
// 5. RUTA PRINCIPAL DE PREFERENCIA DE PAGO
// ============================================================================

app.post('/create_preference', (req, res) => {
    const { cart } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "El carrito está vacío." });
    }

    let preferenceItems = [];
    let totalAmount = 0;

    cart.forEach(cartItem => {
        const dbProduct = productDatabase.find(p => p.id === cartItem.id);
        const quantity = parseInt(cartItem.quantity, 10);

        if (dbProduct && quantity > 0) {
            const unitPrice = parseFloat(dbProduct.price);
            totalAmount += unitPrice * quantity;
            
            preferenceItems.push({
                title: dbProduct.name,
                unit_price: unitPrice,
                quantity: quantity,
            });
        }
    });
    
    if (totalAmount <= 0) {
        return res.status(400).json({ error: "El carrito está vacío o los productos son inválidos." });
    }

    // --- REAL CALL TO MERCADO PAGO API ---
    let preference = {
        items: preferenceItems,
        back_urls: {
            // Asegúrate de que estas URLs de retorno también son de tu Live Server (127.0.0.1:5501)
            "success": "http://127.0.0.1:5501/Finalizar_compra/pago-exitoso.html",
            "failure": "http://127.0.0.1:5501/Finalizar_compra/pago-fallido.html",
            "pending": "http://127.0.0.1:5501/Finalizar_compra/pago-pendiente.html"
        },
        auto_return: "approved", 
    };

    // 🛑 USAMOS LA INSTANCIA DEL CLIENTE MP para llamar al método create
    mpClient.preferences.create(preference)
        .then(function (response) {
            // Éxito: devolver solo el ID de la preferencia
            res.json({ id: response.body.id });
        })
        .catch(function (error) {
            // 🛑 MANEJO DE ERRORES MEJORADO
            console.error("--- ERROR DE MERCADO PAGO API ---");
            console.error("Error completo:", JSON.stringify(error, null, 2));

            let errorMessage = "Error interno del servidor. Consulta la consola del backend.";
            let statusCode = 500;

            if (error && error.cause && error.cause.length > 0) {
                 // Errores de validación de MP suelen venir en error.cause
                const mpError = error.cause[0];
                errorMessage = `Error MP: ${mpError.code} - ${mpError.description || 'Validación fallida.'}`;
                // Error 400 si la API de MP rechaza la solicitud por datos inválidos
                statusCode = 400; 
            } else if (error && error.message) {
                 // Errores de conexión o SDK
                errorMessage = `Error SDK: ${error.message}`;
                statusCode = 500;
            }

            // Devolver un error JSON al frontend
            res.status(statusCode).json({ error: errorMessage });
        });
});


// 6. INICIO DEL SERVIDOR
app.listen(PORT, () => {
    console.log(`\n✅ Servidor Node.js corriendo en http://localhost:${PORT}`);
    console.log(`¡Asegúrate de que tu frontend está en http://127.0.0.1:5501 para CORS!`);
});
