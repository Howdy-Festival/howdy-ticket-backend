// netlify/functions/howdy-ticket.js

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed',
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: 'Invalid JSON',
    };
  }

  const {
    name,
    email,
    tt_reg,
    tt_erm,
    kt_reg,
    kt_erm,
    sub_tt_reg,
    sub_tt_erm,
    sub_kt_reg,
    sub_kt_erm,
    total_sum,
    hinweise,
  } = data;

  const hasHinweise = hinweise && hinweise.trim() !== '';

  const bestellText =
    `Name: ${name}\n` +
    `E-Mail: ${email}\n\n` +
    `Tagesticket regulär: ${tt_reg} Stück, Zwischensumme: ${sub_tt_reg}\n` +
    `Tagesticket ermäßigt: ${tt_erm} Stück, Zwischensumme: ${sub_tt_erm}\n` +
    `Kombiticket regulär: ${kt_reg} Stück, Zwischensumme: ${sub_kt_reg}\n` +
    `Kombiticket ermäßigt: ${kt_erm} Stück, Zwischensumme: ${sub_kt_erm}\n\n` +
    `Gesamtsumme: ${total_sum}\n\n` +
    `Hinweise: ${hinweise || '–'}`;

  const buyerBaseText =
    `Hallo ${name},\n\n` +
    `vielen Dank für deine Ticketbestellung beim HOWDY Family Country Festival.\n\n` +
    `Deine Bestellung:\n` +
    `- Tagesticket regulär: ${tt_reg} Stück, Zwischensumme: ${sub_tt_reg}\n` +
    `- Tagesticket ermäßigt: ${tt_erm} Stück, Zwischensumme: ${sub_tt_erm}\n` +
    `- Kombiticket regulär: ${kt_reg} Stück, Zwischensumme: ${sub_kt_reg}\n` +
    `- Kombiticket ermäßigt: ${kt_erm} Stück, Zwischensumme: ${sub_kt_erm}\n\n` +
    `Gesamtsumme: ${total_sum}\n\n`;

  const buyerOhneHinweise =
    buyerBaseText +
    `Bitte überweise den Betrag auf folgendes Konto:\n\n` +
    `De Event GbR\n` +
    `IBAN: DE45500105175820646957\n` +
    `Verwendungszweck: ${name} – HOWDY Tickets\n\n` +
    `Sobald der Betrag eingegangen ist, bestätigen wir dir die Buchung per E-Mail.\n\n` +
    `Liebe Grüße\n` +
    `dein HOWDY Team`;

  const buyerMitHinweise =
    buyerBaseText +
    `Du hast uns noch eine Mitteilung geschickt:\n` +
    `${hinweise}\n\n` +
    `Wir schauen uns das kurz an und melden uns zeitnah bei dir, bevor du den Betrag überweist.\n\n` +
    `Liebe Grüße\n` +
    `dein HOWDY Team`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: 'Missing RESEND_API_KEY',
    };
  }

  async function sendEmail(payload) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Resend error', res.status, text);
      throw new Error('Resend failed');
    }
  }

  try {
    // Mail an euch
    await sendEmail({
      from: 'Howdy Festival <tickets@howdy-festival.de>',
      to: 'info@howdy-festival.de',
      subject: 'Neue Ticketbestellung HOWDY Festival',
      text: bestellText,
    });

    // Mail an Käufer
    await sendEmail({
      from: 'Howdy Festival <tickets@howdy-festival.de>',
      to: email,
      subject: 'Deine Ticketbestellung beim HOWDY Family Country Festival',
      text: hasHinweise ? buyerMitHinweise : buyerOhneHinweise,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: 'Error sending email',
    };
  }
};
