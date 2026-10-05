# johnKeysCloud

Personal calling card for the founder of
[Cyclone Studios](https://www.cyclonestud.io/).

Built with Next.js, TypeScript, and SCSS modules.

## Develop

```sh
npm install
npm run dev
```

To test on a phone over Wi-Fi, run `npm run pressStart` instead. It writes
your LAN address to `.env.local` and serves the site on port 3100.

## Edit content

All copy and outbound links live in `src/content/site.ts`.

## Contact form

The contact dialog submits to [Netlify Forms](https://docs.netlify.com/forms/setup/).
Netlify only detects forms in static HTML, so `public/__forms.html` mirrors
the form's name and fields. Keep the two in sync. Submissions only work on
Netlify deploys, not under `npm run dev`.

ツkc 💭
