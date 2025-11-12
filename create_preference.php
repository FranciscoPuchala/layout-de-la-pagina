<?php
// ==================================================================================
//                            CONFIGURACIÓN INICIAL
// ==================================================================================

// 1. Cargar las librerías instaladas por Composer (¡Obligatorio!)
// Requiere la carpeta 'vendor/' que crearemos en el siguiente paso.
require __DIR__ . '/vendor/autoload.php';

use MercadoPago\Client\Preference\PreferenceClient;
use MercadoPago\MercadoPagoConfig;

// 🛑 CLAVE SECRETA: Tu Access Token de Mercado Pago
// ESTE VALOR DEBE SER TU TOKEN REAL DE PRODUCCIÓN O PRUEBA.
$access_token = 'APP_USR-5837998060821264-102513-1754dd09943cc57aa1eb687aa622e884-1397114700'; 

if (empty($access_token)) {
    http_response_code(500);
    echo json_encode(["error" => "Access Token de Mercado Pago no configurado."]);
    exit;
}

// 2. Inicializar el cliente de Mercado Pago
MercadoPagoConfig::setAccessToken($access_token);
$client = new PreferenceClient();

// ==================================================================================
//                    ⚡ TU "BASE DE DATOS" DE PRECIOS SEGURA ⚡
// ==================================================================================
// Define la moneda que usarás: UYU (Uruguay), ARS (Argentina), USD, BRL, etc.
$DEFAULT_CURRENCY_ID = 'UYU'; // 🛑 CAMBIA ESTO SI USAS OTRA MONEDA

$masterPriceList = [
    // ID: [ 'name' => nombre, 'price' => precio (en UYU) ]
    // (Datos tomados de tu server.js)
    '1' => ['name' => 'iPhone 16 Pro Max', 'price' => 10], 
    '2' => ['name' => 'iPad Pro', 'price' => 10.00], 
    '3' => ['name' => 'Apple Watch Series 10', 'price' => 30000.00], 
    '4' => ['name' => 'Funda de Silicona', 'price' => 1500.00], 
    '5' => ['name' => 'Cargador MagSafe', 'price' => 1200.00], 
    '6' => ['name' => 'MacBook Air 15\'\'', 'price' => 50000.00], 
    '7' => ['name' => 'AirPods Pro', 'price' => 9500.00], 
    '8' => ['name' => 'iPhone SE', 'price' => 16500.00] 
];

// ==================================================================================
//                           LÓGICA DEL ENDPOINT POST
// ==================================================================================

// 3. Configurar para recibir la solicitud JSON
header('Content-Type: application/json');

// Recibir el JSON del cuerpo de la solicitud POST (como lo hacía Express en Node)
$request_body = file_get_contents('php://input');
$data = json_decode($request_body, true);

// Obtener el carrito del cliente
$clientCart = $data['cart'] ?? null;

if (empty($clientCart)) {
    http_response_code(400);
    echo json_encode(["error" => "El carrito está vacío o mal formado."]);
    exit;
}

try {
    $itemsForMP = [];
    $serverCalculatedTotal = 0;

    foreach ($clientCart as $item) {
        $itemId = $item['id'] ?? null;
        $quantity = $item['quantity'] ?? null;
        
        $masterProduct = $masterPriceList[$itemId] ?? null;

        // 🛑 VERIFICACIÓN DE SEGURIDAD
        if (!$masterProduct || !is_numeric($quantity) || $quantity <= 0) {
            error_log("Intento de pago con datos de carrito inválidos: " . $itemId . " / " . $quantity);
            http_response_code(400);
            echo json_encode(["error" => "El carrito contiene productos o cantidades inválidas."]);
            exit;
        }

        // 4. Se asegura la estructura correcta de los ITEMS
        $itemsForMP[] = [
            'id' => (string)$itemId, 
            'title' => $masterProduct['name'],         
            'unit_price' => (float)$masterProduct['price'],
            'quantity' => (int)$quantity,
            'currency_id' => $DEFAULT_CURRENCY_ID,
        ];

        $serverCalculatedTotal += $masterProduct['price'] * $quantity;
    }
    
    // 5. Crear la preferencia de pago
    $preferenceData = [
        'items' => $itemsForMP,
        'payer' => [
            'name' => 'Comprador',
            'surname' => 'Prueba',
            'email' => 'test_user_@gmail.com',
        ],
        // 🚨 Configuración de Redirección (URLs tomadas de tu server.js) 🚨
        'back_urls' => [ 
            'success' => "https://franciscopuchala.github.io/layout-de-la-pagina/success.html", 
            'failure' => "https://franciscopuchala.github.io/layout-de-la-pagina/failure.html", 
            'pending' => "https://franciscopuchala.github.io/layout-de-la-pagina/pending.html", 
        ],
    ];

    // Se usa el cliente del SDK para crear la preferencia
    $result = $client->create($preferenceData);

    // 6. Respondemos al frontend con el ID y la URL de redirección
    http_response_code(200);
    echo json_encode([ 
        'id' => $result->id, 
        'init_point' => $result->init_point // 🟢 CLAVE: URL de Mercado Pago
    ]);

} catch (\Exception $e) {
    // Manejo de errores del SDK
    error_log('🔴 ERROR CRÍTICO al crear la preferencia: ' . $e->getMessage());
    
    $error_message = $e->getMessage();
    if (strpos($error_message, 'Invalid credentials') !== false || strpos($error_message, '401') !== false) {
        http_response_code(500);
        echo json_encode(["error" => "Fallo de autenticación. Verifica tu Access Token.", "details" => $error_message]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Hubo un error interno en el servidor: " . $error_message]);
    }
}

?>
