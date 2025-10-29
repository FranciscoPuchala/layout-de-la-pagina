// Cargar variables de entorno (tu clave secreta)
require('dotenv').config();

// 1. Importar los "ingredientes"
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// 2. Inicializar el servidor
const app = express();
const port = 4000;

// 3. Configurar el cliente de Mercado Pago
const client = new MercadoPagoConfig({
  // Asegúrate de que el token de PRUEBA esté en tu .env con el nombre MP_ACCESS_TOKEN
  accessToken: process.env.MP_ACCESS_TOKEN, 
});
const preference = new Preference(client);

// ===================================================================
//          ⚡ TU "BASE DE DATOS" DE PRECIOS SEGURA ⚡
// ===================================================================
// Precios de referencia de los productos (en UYU - Pesos Uruguayos)
const masterPriceList = {
    // ID: { nombre, precio (en UYU) }
    '1': { name: 'iPhone 16 Pro Max', price: 1299.00 },
    '2': { name: 'iPad Pro', price: 30000.00 }, 
    '3': { name: 'Apple Watch Series 10', price: 19000.00 },
    '4': { name: 'Funda de Silicona', price: 1500.00 },
    '5': { name: 'Cargador MagSafe', price: 1200.00 },
    '6': { name: 'MacBook Air 15\'\'', price: 50000.00 },
    '7': { name: 'AirPods Pro', price: 9500.00 },
    '8': { name: 'iPhone SE', price: 16500.00 }
};
// ===================================================================

// 4. Configurar el servidor (CORS y JSON)
app.use(cors());
app.use(express.json());

// 5. ¡LA RUTA CLAVE! 
app.post('/create_preference', async (req, res) => {
  try {
    const clientCart = req.body.cart;

    // --- Verificación de Seguridad ---
    const itemsForMP = [];
    let serverCalculatedTotal = 0;

    for (const item of clientCart) {
      const masterProduct = masterPriceList[item.id];

      if (!masterProduct) {
        console.error(`Intento de pago con ID de producto inválido: ${item.id}`);
        return res.status(400).json({ error: `Producto inválido detectado: ${item.id}` });
      }

      // Construimos el item para Mercado Pago usando NUESTROS datos y la moneda UYU
      itemsForMP.push({
        title: masterProduct.name,         
        unit_price: masterProduct.price,   
        quantity: item.quantity,           
        currency_id: 'UYU',                // Peso Uruguayo
      });

      serverCalculatedTotal += masterProduct.price * item.quantity;
    }
    // --- Fin de la Verificación ---

    console.log(`Total calculado por el servidor: UYU $${serverCalculatedTotal}`);
    console.log("Creando preferencia de pago con datos de Payer...");

    // 6. Creamos la preferencia de pago con los datos validados
    const result = await preference.create({
      body: {
        items: itemsForMP,
        
        // Datos del comprador (Payer)
        payer: {
          name: 'Test',
          surname: 'User',
          email: 'test_user_@gmail.com',
          phone: {
            area_code: '099',
            number: '1234567',
          },
          address: {
            zip_code: '11000',
            street_name: 'Av. Test',
            street_number: 123,
          },
        },
        
        // 🟢 URLs CORREGIDAS (sin espacios iniciales y con rutas específicas)
        back_urls: { 
          success: "https://nonconstraining-denisha-diluvial.ngrok-free.dev/Finalizar_compra/pagina_exitosa.html", 
          failure: "https://nonconstraining-denisha-diluvial.ngrok-free.dev/Carrito/pagina_carrito.html", 
          pending: "https://nonconstraining-denisha-diluvial.ngrok-free.dev/index.html", 
        },
        auto_return: 'approved', 
      },
    });

    // 7. Respondemos al frontend con el ID de la preferencia
    console.log('Preferencia creada:', result.id);
    res.json({ id: result.id });

  } catch (error) {
    // Muestra el error de Mercado Pago en la terminal
    console.error('Error al crear la preferencia:', error.message);
    // Envía el error al frontend para que muestre la alerta
    res.status(500).json({ error: `Hubo un error al procesar el pago: ${error.message}` });
  }
});

// 8. Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor de iPlace (SEGURO) escuchando en http://localhost:${port}`);
});