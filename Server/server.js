// server/server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago/lib/mercadopago');

const app = express();
const PORT = 3000;

// ============================================================================
// 1. ENVIRONMENT VARIABLE LOADING (Forced Loading and Fallback)
// ============================================================================

// Try to use dotenv with absolute path first (standard, robust way)
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 
let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// *** FALLBACK LOGIC: If dotenv failed, try to read the file manually ***
if (!accessToken && process.env.NODE_ENV !== 'production') {
    console.warn("WARN: dotenv failed to load the token. Attempting manual file read...");
    try {
        const fs = require('fs');
        const envPath = path.resolve(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // Simple manual parsing
        const match = envContent.match(/^MERCADO_PAGO_ACCESS_TOKEN=(.*)$/m);
        if (match && match[1]) {
            accessToken = match[1].trim();
            console.log("SUCCESS: Token loaded using manual file reading fallback.");
        }
    } catch (e) {
        console.error("CRITICAL ERROR: Manual reading of .env file also failed.", e.message);
    }
}
// ============================================================================


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


if (!tokenLoaded) {
    console.error("ERROR: MERCADO_PAGO_ACCESS_TOKEN not found. Please check your .env file and its content!");
} else {
    // If the token was loaded correctly, configure MP.
    mercadopago.configure({
        access_token: accessToken,
    });
    console.log("Mercado Pago configured correctly.");
}


// **--- SIMULACIÓN DE BASE DE DATOS (BD) ---**
const productsDatabase = [
    // Product examples (Ensure IDs and prices match your frontend)
    { id: "iphone-15", price: 1200.00, name: "iPhone 15 Pro (Simulado)", image: "..." },
    { id: "samsung-s23", price: 950.00, name: "Samsung Galaxy S23 (Simulado)", image: "..." },
    { id: "airpods-pro", price: 250.00, name: "AirPods Pro (Simulado)", image: "..." },
    { id: "smartwatch", price: 150.00, name: "Smartwatch Deportivo (Simulado)", image: "..." },
];


// **--- ROUTE TO CREATE PAYMENT PREFERENCE ---**
// Receives an array of purchased products from the frontend
app.post('/create_preference', (req, res) => {
    
    // If the token was not configured, stop execution
    if (!tokenLoaded) {
        return res.status(503).json({ error: "The server could not initialize the Mercado Pago token." });
    }

    // 1. Validate and build items for Mercado Pago
    const cart = req.body; 
    let preferenceItems = [];
    let totalAmount = 0;

    cart.forEach(cartItem => {
        // Look up the product in your "database" to get the real price and name
        const dbProduct = productsDatabase.find(p => p.id === cartItem.id);
        const quantity = parseInt(cartItem.quantity);

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
        return res.status(400).json({ error: "The cart is empty or products are invalid." });
    }

    // --- REAL CALL TO MERCADO PAGO API ---
    let preference = {
        items: preferenceItems,
        back_urls: {
            // Ensure these return URLs are also from your Live Server (127.0.0.1:5500)
            "success": "http://127.0.0.1:5500/Finalizar_compra/pago-exitoso.html",
            "failure": "http://127.0.0.1:5500/Finalizar_compra/pago-fallido.html",
            "pending": "http://127.0.0.1:5500/Finalizar_compra/pago-pendiente.html"
        },
        auto_return: "approved", 
    };

    mercadopago.preferences.create(preference)
        .then(function (response) {
            res.json({ id: response.body.id });
        })
        .catch(function (error) {
            console.error("Error creating MP preference:", error.message);
            res.status(500).json({ 
                error: "Error creating payment preference.",
                details: error.message 
            });
        });
});

// **--- START SERVER ---**
app.listen(PORT, () => {
    console.log(`Express server listening on http://localhost:${PORT}`);
});
