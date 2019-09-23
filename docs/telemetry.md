This document describes the [telemetry events] sent by the rollout addon.

All events are sent with category `doh`.

# Evaluate events

Evaluate events are sent on startup and network change, with method "evaluate" and object "heuristics".

The event value is either `enable_doh` or `disable_doh`, reflecting the result of the evaluation.

The event extras include:
* `google`: whether the resolver configured by the OS uses [forced SafeSearch]
* `youtube`: whether the resolver configured by the OS resolves YouTube to restricted YouTube
* `canary`: whether the resolver configured by the OS uses the [application DNS canary] to request that application DNS (like DoH) is disabled
* `modifiedRoots`: whether the `security.enterprise_roots.enabled` pref is true
* `browserParent`: whether Firefox parental controls are enabled
* `thirdPartyRoots`: if third-party roots are included in the Firefox trust store
* `policy`: if DoH is blocked by enterprise policy
* `evaluateReason`: why heuristics were evaluated

# State events


Events are sent when the addon changes states, with method "state" and
objects in "loaded", "enabled", "disabled",
"manuallyDisabled" (through about:preferences or about:config), "uninstalled",
"UIOK" (user accepts DoH) or "UIDisabled" (user opts out of DoH).

[application DNS canary]: https://support.mozilla.org/en-US/kb/canary-domain-use-application-dnsnet
[forced SafeSearch]: https://support.google.com/websearch/answer/186669?hl=en
[telemetry events]: https://firefox-source-docs.mozilla.org/toolkit/components/telemetry/collection/events.html
