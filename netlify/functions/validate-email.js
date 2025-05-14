exports.handler = async function (event, context) {
    const { email } = event.queryStringParameters;
    const API_KEY = process.env.ABSTRACT_API_KEY; // Load securely from environment variables

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'E-Mail-Adresse fehlt.' }),
        };
    }

    if (!API_KEY) {
        console.error('Abstract API Key nicht konfiguriert!');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Serverkonfigurationsfehler.' }),
        };
    }

    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${API_KEY}&email=${encodeURIComponent(email)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Decide which information is relevant for your frontend
        const isValidOverall =
            data.is_valid_format.value &&
            !data.is_disposable_email.value &&
            parseFloat(data.quality_score) >= 0.7;

        let message = '';
        if (!data.is_valid_format.value) {
            message = 'Ungültiges E-Mail-Format.';
        } else if (data.is_disposable_email.value) {
            message = 'Wegwerf-E-Mail-Adressen sind nicht erlaubt.';
        } else if (parseFloat(data.quality_score) < 0.7) {
            message = 'Die Qualität der E-Mail-Adresse ist nicht ausreichend.';
        } else if (data.autocorrect && data.autocorrect !== '') {
            message = `Meinten Sie ${data.autocorrect}?`;
        } else if (isValidOverall) {
            message = 'E-Mail-Adresse ist gültig.';
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                isValid: isValidOverall,
                message: message,
                autocorrect: data.autocorrect || '',
                qualityScore: data.quality_score,
                isDisposable: data.is_disposable_email.value,
                isValidFormat: data.is_valid_format.value,
            }),
        };
    } catch (error) {
        console.error('Fehler bei der API-Abfrage:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Validierung fehlgeschlagen. Bitte versuchen Sie es später erneut.' }),
        };
    }
};