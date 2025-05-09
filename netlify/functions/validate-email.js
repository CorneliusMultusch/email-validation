{\rtf1\ansi\ansicpg1252\cocoartf2708
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\froman\fcharset0 Times-Roman;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;}
{\*\expandedcolortbl;;\cssrgb\c0\c0\c0;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\fs24 \cf0 \expnd0\expndtw0\kerning0
\outl0\strokewidth0 \strokec2 // netlify/functions/validate-email.js\
const fetch = require('node-fetch'); // oder import fetch from 'node-fetch'; wenn ES Modules genutzt werden\
\
exports.handler = async function(event, context) \{\
    const \{ email \} = event.queryStringParameters;\
    const API_KEY = process.env.ABSTRACT_API_KEY; // Sicher aus Umgebungsvariablen laden\
\
    if (!email) \{\
        return \{\
            statusCode: 400,\
            body: JSON.stringify(\{ error: 'E-Mail-Adresse fehlt.' \}),\
        \};\
    \}\
\
    if (!API_KEY) \{\
        console.error('Abstract API Key nicht konfiguriert!');\
        return \{\
            statusCode: 500,\
            body: JSON.stringify(\{ error: 'Serverkonfigurationsfehler.' \}),\
        \};\
    \}\
\
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=<span class="math-inline">\\\{API\\_KEY\\\}&email\\=</span>\{encodeURIComponent(email)\}`;\
\
    try \{\
        const response = await fetch(url);\
        const data = await response.json();\
\
        // Hier entscheidest du, welche Infos f\'fcr dein Frontend relevant sind\
        // und wie du die "G\'fcltigkeit" definierst.\
        // Beispiel: Nur g\'fcltiges Format, nicht disposable und ein guter Quality Score.\
        // AbstractAPI Quality Score: 0.00 - 1.00 (h\'f6her ist besser)\
        // Wir betrachten hier alles >= 0.7 als "gut genug"\
        const isValidOverall = data.is_valid_format.value &&\
                             !data.is_disposable_email.value &&\
                             parseFloat(data.quality_score) >= 0.70;\
\
        let message = '';\
        if (!data.is_valid_format.value) \{\
            message = 'Ung\'fcltiges E-Mail-Format.';\
        \} else if (data.is_disposable_email.value) \{\
            message = 'Wegwerf-E-Mail-Adressen sind nicht erlaubt.';\
        \} else if (parseFloat(data.quality_score) < 0.70) \{\
            message = 'Die Qualit\'e4t der E-Mail-Adresse ist nicht ausreichend.';\
        \} else if (data.autocorrect && data.autocorrect !== "") \{\
             message = `Meinten Sie $\{data.autocorrect\}?`;\
             // isValidOverall k\'f6nnte hier false bleiben, wenn Autokorrektur stark abweicht,\
             // oder man setzt es auf true und l\'e4sst den Nutzer entscheiden.\
        \} else if (isValidOverall) \{\
            message = 'E-Mail-Adresse ist g\'fcltig.';\
        \}\
\
\
        return \{\
            statusCode: 200,\
            body: JSON.stringify(\{\
                isValid: isValidOverall,\
                message: message,\
                autocorrect: data.autocorrect || '',\
                qualityScore: data.quality_score,\
                isDisposable: data.is_disposable_email.value,\
                isValidFormat: data.is_valid_format.value\
                // Du kannst weitere n\'fctzliche Felder von AbstractAPI hier durchreichen\
            \}),\
        \};\
    \} catch (error) \{\
        console.error('Fehler bei der API-Abfrage:', error);\
        return \{\
            statusCode: 500,\
            body: JSON.stringify(\{ error: 'Validierung fehlgeschlagen. Bitte versuchen Sie es sp\'e4ter erneut.' \}),\
        \};\
    \}\
\};}