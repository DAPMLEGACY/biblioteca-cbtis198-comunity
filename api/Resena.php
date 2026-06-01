<?php
/**
 * ═══════════════════════════════════════════════════
 *  CBTis 198 — Proxy para generación de reseñas con IA
 *  Archivo: api/Resena.php
 *
 *  Este archivo OCULTA la API Key de Anthropic del frontend.
 *  Nunca expongas la API Key directamente en JavaScript.
 *
 *  Requisitos del servidor:
 *    · PHP 7.4+
 *    · Extensión cURL habilitada
 *    · Variable de entorno ANTHROPIC_API_KEY configurada
 *      (o escríbela directamente en $apiKey si el servidor es privado)
 * ═══════════════════════════════════════════════════
 */

// ── Seguridad: solo aceptar solicitudes POST ──
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

// ── Cabeceras CORS (ajusta el dominio en producción) ──
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');          // Cambia * por tu dominio en producción
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// ── Leer y validar el cuerpo JSON ──
$body = json_decode(file_get_contents('php://input'), true);

$title  = trim($body['title']  ?? '');
$author = trim($body['author'] ?? '');
$genre  = trim($body['genre']  ?? 'General');

if (!$title || !$author) {
    http_response_code(400);
    echo json_encode(['error' => 'Se requieren título y autor.']);
    exit;
}

// ── API Key de Anthropic ──
// OPCIÓN 1 (recomendada): Variable de entorno en el servidor
//   En cPanel/Hostinger: .htaccess → SetEnv ANTHROPIC_API_KEY "sk-ant-..."
$apiKey = getenv('ANTHROPIC_API_KEY');

// OPCIÓN 2 (solo si el servidor es completamente privado):
// $apiKey = 'sk-ant-api03-TU_CLAVE_AQUI';

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'API Key no configurada en el servidor.']);
    exit;
}

// ── Construir el prompt ──
$prompt = "Escribe una reseña breve (máximo 120 palabras) en español para el siguiente libro:\n"
        . "Título: $title\n"
        . "Autor: $author\n"
        . "Género: $genre\n\n"
        . "La reseña debe ser atractiva, informativa y adecuada para estudiantes de preparatoria. "
        . "No uses comillas al inicio ni al final. Escribe solo la reseña, sin título ni encabezado.";

// ── Llamada a la API de Anthropic ──
$payload = json_encode([
    'model'      => 'claude-haiku-4-5',   // Modelo rápido y económico
    'max_tokens' => 300,
    'messages'   => [
        ['role' => 'user', 'content' => $prompt]
    ]
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ],
    CURLOPT_TIMEOUT        => 30,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// ── Manejo de errores de red ──
if ($curlErr) {
    http_response_code(502);
    echo json_encode(['error' => 'Error de conexión con la IA: ' . $curlErr]);
    exit;
}

// ── Parsear la respuesta ──
$data = json_decode($response, true);

if ($httpCode !== 200 || empty($data['content'][0]['text'])) {
    $detalle = $data['error']['message'] ?? 'Respuesta inesperada de la IA.';
    http_response_code(502);
    echo json_encode(['error' => $detalle]);
    exit;
}

$resena = trim($data['content'][0]['text']);

echo json_encode(['resena' => $resena]);
