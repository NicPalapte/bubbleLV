# 0083 – Nicht in Suchmaschinen, keine KI-Crawler

- **Status:** akzeptiert
- **Datum:** 2026-10-28
- **Betrifft:** `frontend/index.html`, `frontend/public/robots.txt`
- **Ergänzt:** 0082 (eigene Domain)

## Worum geht's

- Seit 0082 läuft Conocto unter conocto.app. Nico will die Seite in der Beta für
  Suchmaschinen und Crawler unsichtbar machen.

## Entscheidung

- `index.html` trägt `<meta name="robots" content="noindex, nofollow">`: Suchmaschinen
  nehmen die Seite nicht in ihre Ergebnisse auf und folgen keinen Links.
- `robots.txt` sperrt bekannte KI-Crawler ganz. PR-Vorschauen tragen dasselbe `noindex`.
- Normale Suchmaschinen werden für die App **nicht** per `robots.txt` gesperrt. Sonst lesen
  sie die Seite nicht, sehen das `noindex` nie und listen die nackte Adresse trotzdem,
  wenn sie irgendwo verlinkt ist (z. B. LinkedIn).

## Verworfen

- **`Disallow: /` für alle:** verhindert nicht, dass die Adresse ohne Inhalt gelistet wird
  (siehe oben).
- **Cloudflare „Block AI bots“:** wirkt nur mit Cloudflare-Proxy (orange Wolke), den 0082
  bewusst nicht nutzt.

## Folgen

- Seriöse Suchmaschinen und Crawler halten sich daran; erzwingen lässt es sich nicht.
  Fachdaten liegen ohnehin nie auf dem Server.
- Zum Launch (Seite soll gefunden werden): Meta-Zeile entfernen, `robots.txt` anpassen.
- Neue KI-Crawler tauchen laufend auf; die Liste in `robots.txt` bei Bedarf ergänzen.
