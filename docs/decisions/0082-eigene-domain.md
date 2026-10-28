# 0082 – Eigene Domain conocto.app

- **Status:** akzeptiert
- **Datum:** 2026-10-28
- **Betrifft:** `.github/workflows/deploy-pages.yml`, `.github/workflows/pr-preview.yml`,
  `frontend/public/CNAME`
- **Ergänzt:** 0002 (PR-Preview), 0007 (Previews im Deploy aufräumen)

## Worum geht's

- Nico hat die Domain conocto.app bei Cloudflare gekauft.
- Die App lief bisher unter `https://nicpalapte.github.io/bubbleLV/`.

## Entscheidung

- GitHub Pages liefert die App weiter aus, jetzt unter `https://conocto.app/`.
- Cloudflare ist nur Domain-Anbieter und DNS (Adressbuch des Internets). Die Einträge stehen
  auf „DNS only“, damit GitHub das HTTPS-Zertifikat selbst ausstellt.
- Die Datei `frontend/public/CNAME` nennt die Domain. Sie wandert bei jedem Build nach
  `gh-pages`. Ohne sie würde der Deploy-Workflow die Domain bei jedem Merge löschen.
- Die App liegt in der Wurzel der Domain (Base `/`), Previews unter `/pr-preview/pr-<nr>/`.

## Verworfen

- **Cloudflare Pages statt GitHub Pages:** zweiter Anbieter mit eigenem Konto und eigenen
  Workflows, ohne Nutzen für eine statische App. Die Previews hängen am Branch `gh-pages`.
- **Cloudflare-Proxy (orange Wolke):** nicht nötig und stört die Zertifikatsausstellung
  von GitHub.

## Folgen

- Alte Links auf `nicpalapte.github.io/bubbleLV/…` leitet GitHub auf conocto.app weiter.
- Alles im Browser-Speicher gilt je Adresse: letzte Datei, Markierungen, Kommentare,
  gelernte Begriffe, eigene Regeln. Unter conocto.app ist es zunächst leer. Wer es behalten
  will, sichert vorher unter der alten Adresse die Notizen (und `regeln.json`) und lädt sie
  unter conocto.app wieder.
- Einmalig für Nico: DNS-Einträge in Cloudflare (4× A auf GitHub, `www` als CNAME), nach
  dem Merge in GitHub unter Settings → Pages „Enforce HTTPS“ anhaken.
- Anleitung: [docs/setup/ci-und-agenten.md](../setup/ci-und-agenten.md), Schritt 2a.
