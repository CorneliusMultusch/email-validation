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
        const data = await response.json();

        // Deine Validierungslogik (isValidOverall, message etc.)
        const isValidOverall = data.is_valid_format && data.is_valid_format.value &&
                             data.is_disposable_email && !data.is_disposable_email.value &&
                             data.quality_score && parseFloat(data.quality_score) >= 0.70;

        let message = 'Prüfung abgeschlossen.'; // Platzhalter - füge deine Logik ein

        // Check if it's a business email
        const isBusinessEmail = data.is_commercial_email ? data.is_commercial_email.value : null;

        return {
            statusCode: 200,
            headers: headers, // Wichtig: CORS-Header zur Antwort hinzufügen
            body: JSON.stringify({
                isValid: isValidOverall,
                message: message,
                autocorrect: data.autocorrect || '',
                qualityScore: data.quality_score || 'N/A',
                isDisposable: data.is_disposable_email ? data.is_disposable_email.value : null,
                isValidFormat: data.is_valid_format ? data.is_valid_format.value : null,
                isBusinessEmail: isBusinessEmail, // Include business email information
            }),
        };
    } catch (error) {
        console.error('Fehler bei der API-Abfrage oder Datenverarbeitung:', error);
        return {
            statusCode: 500,
            headers: headers, // CORS-Header auch bei Fehlern mitsenden
            body: JSON.stringify({ error: 'Validierung fehlgeschlagen. Bitte versuchen Sie es später erneut.' }),
        };
    }
};