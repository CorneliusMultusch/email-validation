// netlify/functions/validate-email.js
// Stelle sicher, dass du natives fetch verwendest oder node-fetch korrekt importiert/benötigt wird,
// basierend auf unseren vorherigen Diskussionen. Hier gehe ich von nativem fetch aus.

exports.handler = async function(event, context) {
    const origin = event.headers.origin; // Herkunft der Anfrage
    const allowedOrigins = [
        'https://www.kopfundmuetze.de', // Deine Hauptdomain
        'https://kopfundmuetze.de',     // Ohne www, falls auch genutzt
        // Füge hier weitere Domains hinzu, falls nötig (z.B. staging.kopfundmuetze.de)
        // Für lokale Tests in Webflow (z.B. webflow.io Subdomain):
        // 'https://DEIN-WEBFLOW-PROJEKT.webflow.io'
    ];

    let accessControlAllowOriginHeader = 'null'; // Standardmäßig blockieren, wenn nicht in der Liste
    if (allowedOrigins.includes(origin)) {
        accessControlAllowOriginHeader = origin;
    }

    // Standard-Header für CORS
    const headers = {
        'Access-Control-Allow-Origin': accessControlAllowOriginHeader,
        'Access-Control-Allow-Methods': 'GET, OPTIONS', // Erlaube GET und OPTIONS (wichtig für Preflight-Requests)
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // OPTIONS-Request (Preflight-Request) abfangen und mit CORS-Headern antworten
    // Browser senden dies vor der eigentlichen Anfrage, um CORS-Policy zu prüfen
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: headers,
            body: '',
        };
    }

    // --- Ab hier deine bisherige Logik für die E-Mail-Validierung ---
    const { email } = event.queryStringParameters;
    const API_KEY = process.env.ABSTRACT_API_KEY;

    if (!email) {
        return {
            statusCode: 400,
            headers: headers, // CORS-Header auch bei Fehlern mitsenden
            body: JSON.stringify({ error: 'E-Mail-Adresse fehlt.' }),
        };
    }

    if (!API_KEY) {
        console.error('Abstract API Key nicht konfiguriert!');
        return {
            statusCode: 500,
            headers: headers, // CORS-Header auch bei Fehlern mitsenden
            body: JSON.stringify({ error: 'Serverkonfigurationsfehler.' }),
        };
    }

    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${API_KEY}&email=${encodeURIComponent(email)}`;

   try {
    const response = await fetch(url);
    const data = await response.json(); // Antwort von Abstract API

    // Primäre Validitätsprüfung (Beispiel)
    const isValidOverall = data.is_valid_format && data.is_valid_format.value &&
                         data.is_disposable_email && !data.is_disposable_email.value &&
                         data.quality_score && parseFloat(data.quality_score) >= 0.70;

    // Hole die relevanten Werte von Abstract API
    const isFreeEmailValue = data.is_free_email ? data.is_free_email.value : null;
    // ACHTUNG: Abstract API nennt dieses Feld oft 'is_role_based_email'
    const isRoleEmailValue = data.is_role_based_email ? data.is_role_based_email.value : null;


    return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
            isValidOverall: isValidOverall, // Kannst du senden, wenn du willst, oder Client entscheidet
            isValidFormat: data.is_valid_format ? data.is_valid_format.value : null,
            isDisposable: data.is_disposable_email ? data.is_disposable_email.value : null,
            qualityScore: data.quality_score || 'N/A',
            autocorrect: data.autocorrect || '',
            isFreeEmail: isFreeEmailValue,     // NEU bzw. WIEDER DA
            isRoleEmail: isRoleEmailValue      // NEU bzw. WIEDER DA (achte auf korrekten Feldnamen von Abstract)
            // isBusinessEmail wird nicht mehr gesendet
        }),
    };
} catch (error) {
    console.error('Fehler bei der API-Abfrage oder Datenverarbeitung:', error);
    return {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ error: 'Validierung fehlgeschlagen. Bitte versuchen Sie es später erneut.' }),
    };
}
};