# BackpackYourTrip

Premium marketing site for **BackpackYourTrip** — a personalised travel itinerary-planning studio.

**You Dream. We Plan. You Travel.**

We research destinations and craft custom day-wise itineraries. Customers book flights, stays and tickets independently. We do not sell tour packages.

## Run locally

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

Or open `index.html` directly in a browser.

## Deploy on Vercel

Import this folder as a static project, or from the CLI:

```bash
npx vercel
```

`vercel.json` is included for clean URLs and basic security headers.

## Configure contact details

Edit `config.js` to set:

- Email, phone display and `tel:` link
- WhatsApp number (digits with country code) and default message
- Instagram URL and handle
- Address

All CTAs and the floating WhatsApp button read from this file.

## Form submissions

The enquiry form uses **frontend validation** and a local success state only. Nothing is emailed or stored until you connect a backend or form service (e.g. Formspree, Basin, or your own API). Wire the submit handler in `script.js` when ready.

## Sections

- Sticky navigation + mobile menu
- Full-bleed cinematic hero
- Introduction & business model
- Services
- How it works (3 steps)
- Why BackpackYourTrip
- Who it's for
- Destination inspiration gallery
- About
- FAQ accordion
- Final CTA
- Enquiry form + footer
- Floating WhatsApp button
