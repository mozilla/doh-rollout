## HTTP DNS

This is a test WebExtension + Experimental API to enable HTTP DNS in the browser, for
testing purposes.

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

You should see a new entry in the list of extensions titled "HTTP DNS".

# Telemetry

The addon will enable DNS over HTTPS which will send timing statistics of trr resolving to Firefox. This won't include domains or specific information about the queries being used.

The addon will also send usage telemetry about the state of the addon being install or removed using Shield telemetry.
- When a user opts out of the banner shown a ping will be sent. ("UIDisabled" or "UIOk")
- When a user disables or uninstalls the add-on, a ping will be sent ("disabled" or "uninstalled").
- Existing Shield telemetry utils telemetry will be sent.
- The variant of the study will be captured.

# Configuring

Setting "network.trr.experimentalPerfInterval" will change how often in seconds the addon does a telemetry request. We check roughly every minute to see if the last perf check was before this interval time.
This is useful for debugging the telemetry from the addon.

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

## TODO list

- Document functions
- Add tests for unset hidden prefs and public ones
- Decide if pref setting should be synced across devices
