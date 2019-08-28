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

## How to read the states file

The preferences are managed by [states-trr.json](/src/states-trr.json) this is only read by the browsers parent process in the [Web Extension Experiment code](src/experiments/settings/api.js).

- `"prefTypes"`: This is a list of the types that we set the preferences to. If a preference isn't already built with Firefox, it's sometimes hard to reason about.
- `"prerequisitePrefs"`: This is an array of preferences that must not be modified by the user, if they are the addon uninstalls itself without any further modification
- `"statePref"`: This is where the addon will store it's state `"id"` from the `"states"` objects.
- `"states"`: This is a object, where the keys are the state name used in the code itself. The object:
    - `"id"` which will be stored in the `"statePref"`.
        - negative id's are used to prevent the code from setting uninstall/disable states when the addon is removed.
        - negative id's should be the final state of the addon after it's removed. (The addon never removes it's `"statePref"`)
    - `"_comment"`: this doesn't have any functional impact, it's expected to contain the reason the user has this state.
    - `"prefs"`: This is an object of the initial values that this state will set.
         - When the state is changed, these prefs will be reset.
    - `"persistPrefs"`: This is an object of the values that this state will set even on addon removal.

## Dependencies

- web-ext
- Firefox 61+
