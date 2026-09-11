# JobTrack SEEK & LinkedIn Importer

This optional Chrome/Edge extension lets JobTrack import job details from pages that block server-side requests. It opens the pasted SEEK or LinkedIn URL in an inactive tab, uses the browser's existing signed-in session, extracts only the job title, company and description, then closes that temporary tab.

It does not read, store or transmit account passwords or cookies. Its job-site permissions are limited to SEEK and LinkedIn, and it accepts requests only from the two JobTrack deployment hostnames or local development.

## Install locally

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `browser-extension` folder.
5. Reload JobTrack.

When the helper is active, opening JobTrack's application form shows **Browser helper connected**. Paste a SEEK or LinkedIn job URL and choose **Import details**. Public pages still use the server importer first; when a site blocks that request, JobTrack automatically falls back to this extension.

## Security boundaries

- Only HTTPS SEEK and LinkedIn URLs are accepted.
- The extension opens a new inactive tab; it never closes an existing user tab.
- Only extracted text and the canonical job URL are returned to JobTrack.
- No cookies, credentials, page storage or unrelated browsing data are returned.
- Imported values only prefill the form and are not saved until the user reviews and submits it.
