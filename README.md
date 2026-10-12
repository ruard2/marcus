# Ontdek Marcus

Een installeerbare, privacyvriendelijke webapp om Marcus vers voor vers te ontdekken. De eerste studie behandelt Marcus 1:1–15.

## Lokaal starten

Vereist Node.js 20 of nieuwer.

```bash
npm start
```

Open daarna `http://localhost:3000`.

## Naar Railway

1. Maak van deze map een GitHub-repository en push de bestanden.
2. Kies in Railway **New Project → Deploy from GitHub repo**.
3. Railway gebruikt automatisch `npm start` en geeft de app een `PORT`.
4. Genereer bij **Settings → Networking** een publiek domein.

Er zijn geen omgevingsvariabelen, database of buildstap nodig.

## Installeren als app

- Android/Chrome/Edge: kies **App installeren**.
- iPhone/iPad: kies **Delen → Zet op beginscherm**.
- Computer: gebruik het installatie-icoon in de adresbalk of de knop **Installeer**.

De app gebruikt een service worker en werkt na het eerste bezoek ook offline. Voortgang en notities blijven via lokale browseropslag alleen op het eigen apparaat staan.

## Samen stemmen

Iedereen die de app tegelijkertijd gebruikt, wordt automatisch en anoniem met dezelfde tijdelijke stemgroep verbonden. Bij ieder tekstgedeelte kan een deelnemer maximaal drie vragen een duimpje geven. De aantallen worden ongeveer iedere anderhalve seconde bijgewerkt; codes en accounts zijn niet nodig.

De stemgegevens bestaan alleen in het geheugen van de server. Tien minuten nadat geen enkel apparaat de app nog gebruikt, wordt de groep automatisch verwijderd. Een herstart of nieuwe deployment van Railway wist de stemmen eveneens. Persoonlijke notities worden nooit gedeeld.

## Inhoud aanpassen

Alle studie-inhoud staat bovenaan in `app.js`, in de lijst `passages`. Elke passage bevat:

- een verwijzing, titel en de NBV21-, HSV- en BGT-weergave;
- ontdekkingsvragen;
- één indringende hoofdvraag;
- achtergrond en uitleg;
- verwijzingen naar andere Bijbelgedeelten.

De kernteksten zijn bewust als parafrase aangeduid. Daardoor kan de groep zelf een gewenste Bijbelvertaling gebruiken.
