## DoH Roll-Out

This is a test WebExtension + Experimental API to enable DNS over HTTP for release to general users.

## How to install WebExtension

1. Install web-ext `npm install -g web-ext`
2. Install the dependencies `npm install`
3. Build the addon `npm run build`

## How to run WebExtension
1. `web-ext run --verbose -f Nightly`

OR

1. Run a non-release build (Nightly or Aurora) version 61+.
2. Set `extensions.legacy.enabled` to true in about:config
3. Navigate to `about:debugging`, choose
   "Load Temporary Add-on" and select a file from this project:
   - Select `manifest.json`
   - Select `src/web-ext-artifacts/dns_over_https-${VERSION}.zip`

You should see a new entry in the list of extensions titled "DoH Roll-Out".

To see the banner enable "doh-rollout.enabled" in about:config

## Dependencies

- web-ext
- Firefox 61+
