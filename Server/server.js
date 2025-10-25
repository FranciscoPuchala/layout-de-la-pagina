// server/server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
// Importamos el SDK de Mercado Pago. En la versión v2.x.x,
// este objeto contiene el constructor 'MercadoPagoConfig'.
const mercadopago = require('mercadopago');

const app = express();
const PORT = 3000;

// ============================================================================
// 1. ENVIRONMENT VARIABLE LOADING (Forced Loading and Fallback)
// ============================================================================

// Intentamos usar dotenv con ruta absoluta (manera estándar y robusta)
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 
let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;


// Configuration of middlewares
app.use(express.json()); 
app.use(cors({ origin: 'http://127.0.0.1:5500' })); 

// 2. Mercado Pago Access Token Configuration
const tokenLoaded = !!accessToken;

// *** CRITICAL DEBUG LINE ***
console.log("--- DEBUG DOTENV ---");
console.log("Valor de MERCADO_PAGO_ACCESS_TOKEN (Visto por el servidor):", tokenLoaded ? "Token loaded (Length: " + accessToken.length + ")" : "!!! ERROR: Token NOT LOADED or EMPTY !!!");
console.log("Server File Path (__dirname):", __dirname); 
console.log("--------------------");
// **********************************

// Declaramos la variable del cliente de Mercado Pago
let mpClient; 

if (!tokenLoaded) {
    console.error("ERROR: MERCADO_PAGO_ACCESS_TOKEN not found. Please check your .env file and its content!");
} else {
    // 🛑 SOLUCIÓN para SDK v2.x.x: Crear una instancia de cliente.
    
    // Desestructuramos el constructor de la librería importada
    const { MercadoPagoConfig } = mercadopago;
    
    // Creamos la nueva instancia del cliente de Mercado Pago
    mpClient = new MercadoPagoConfig({ 
        accessToken: accessToken, 
    });

    console.log("Mercado Pago configured correctly using new client instance.");
}

// **--- SIMULACIÓN DE BASE DE DATOS (BD) ---**
const productsDB = [
    { id: 1, name: "Producto 1", price: 10.50 },
    { id: 2, name: "Producto 2", price: 5.75 },
    { id: 3, name: "Producto 3", price: 20.00 },
];
// **----------------------------------------**


// 3. Health Check
app.get('/', (req, res) => {
    res.send('Mercado Pago Server is running!');
});


// 4. Endpoint para crear la preferencia de pago
app.post('/create_preference', (req, res) => {
    const cart = req.body.cart || [];
    
    // ⚠️ Validación crucial: Si el cliente MP no se inicializó, devolvemos error 503
    if (!tokenLoaded || !mpClient) {
        return res.status(503).json({ error: "The server could not initialize the Mercado Pago token. Check server logs." });
    }

    let preferenceItems = [];
    let totalAmount = 0;

    // Lógica para validar y calcular el total de los items
    cart.forEach(product => {
        const dbProduct = productsDB.find(p => p.id === product.id);
        if (dbProduct) {
            const quantity = product.quantity > 0 ? product.quantity : 1;
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
        return res.status(400).json({ error: "The cart is empty or products are invalid." });
    }

    // --- REAL CALL TO MERCADO PAGO API ---
    let preference = {
        items: preferenceItems,
        back_urls: {
            // Asegúrate de que estas URLs de retorno también son de tu Live Server (127.0.0.1:5500)
            "success": "http://127.0.0.1:5500/Finalizar_compra/pago-exitoso.html",
            "failure": "http://127.0.0.1:5500/Finalizar_compra/pago-fallido.html",
            "pending": "http://127.0.0.1:5500/Finalizar_compra/pago-pendiente.html"
        },
        auto_return: "approved", 
    };

    // 🛑 USAMOS LA INSTANCIA DEL CLIENTE MP para llamar al método create
    mpClient.preferences.create(preference)
        .then(function (response) {
            res.json({ id: response.body.id });
        })
        .catch(function (error) {
            console.error("Error creating MP preference:", error);
            res.status(500).json({ error: "Error creating Mercado Pago preference." });
        });
});


// 5. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the backend at http://localhost:${PORT}`);
});
