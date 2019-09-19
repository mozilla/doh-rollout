## DoH Roll-Out

This is a WebExtension + Experimental API to gradually roll out [DNS-over-HTTP](https://support.mozilla.org/en-US/kb/firefox-dns-over-https) to Firefox users.

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

To see the banner [create a new boolean pref](https://support.mozilla.org/en-US/kb/about-config-editor-firefox#w_adding-changing-and-resetting-preferences) `doh-rollout.enabled` in [about:config](about:config) and set to `true`.

This will run heuristics against your network settings to determine if DoH can safely be enabled. If it can, it will trigger a doorhanger notification announcing that is has been enabled.

To check if DoH is turned on, check the value of pref `network.trr.mode`. If it is enabled, it will be set to `2`.

## Dependencies

- [web-ext](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Getting_started_with_web-ext)
- Firefox 61+

## Contributing

See the [guidelines][contributing-link] for contributing to this project – including on how best to report an issue with this project.

This project is governed by a [Code Of Conduct][coc-link].

To disclose potential a security vulnerability please see our [security][security-link] documentation.

## [License][license-link]

This module is licensed under the [Mozilla Public License, version 2.0][license-link].

[docs-link]: docs/
[contributing-link]: docs/contributing.md
[coc-link]: docs/code_of_conduct.md
[security-link]: docs/security.md
[license-link]: /LICENSE

## Press Releases

### Related press releases:

- [What’s next in making Encrypted DNS-over-HTTPS the Default](https://blog.mozilla.org/futurereleases/2019/09/06/whats-next-in-making-dns-over-https-the-default/) _September 9, 2019_
- [DNS-over-HTTPS (DoH) Update – Detecting Managed Networks and User Choice ](https://blog.mozilla.org/futurereleases/2019/07/31/dns-over-https-doh-update-detecting-managed-networks-and-user-choice/) _July 31, 2019_
- [DNS-over-HTTPS (DoH) Update – Recent Testing Results and Next Steps ](https://blog.mozilla.org/futurereleases/2019/04/02/dns-over-https-doh-update-recent-testing-results-and-next-steps/) _April 2, 2019_
- [Next Steps in DNS-over-HTTPS Testing ](https://blog.mozilla.org/futurereleases/2018/11/27/next-steps-in-dns-over-https-testing/) _November 11, 2018_
- [DNS over HTTPS (DoH) – Testing on Beta ](https://blog.mozilla.org/futurereleases/2018/09/13/dns-over-https-doh-testing-on-beta/) _September 13, 2018_
