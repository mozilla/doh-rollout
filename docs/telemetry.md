This document describes the [telemetry events] sent by the rollout addon.

All events are sent with category `doh`.

# Evaluate events

Evaluate events are sent with method "evaluate" and object "heuristics". These events are sent during the following:
- Browser startup
- Network change
- When the user clicked "disable protections" on the doorhanger notification, opting out of the study.

The event value can be one of the following:
- `enable_doh`: Safe to enable DoH
- `disable_doh`: DoH should not be enabled based on heuristics
- `prefHasUserValue`: The user already has a stored value for `network.trr.mode`, so the add-on will not modify DoH settings _(DoH may be enabled or disabled, but it out side of this add-on study)_. 

The event extras include:
* `google`: whether the resolver configured by the OS uses [forced SafeSearch]
* `youtube`: whether the resolver configured by the OS resolves YouTube to restricted YouTube
* `canary`: whether the resolver configured by the OS uses the [application DNS canary] to request that application DNS (like DoH) is disabled
* `zscalerCanary`: whether the Zscaler's Shift service is being used on the network
* `modifiedRoots`: whether the `security.enterprise_roots.enabled` pref is true
* `browserParent`: whether Firefox parental controls are enabled
* `thirdPartyRoots`: if third-party roots are included in the Firefox trust store
* `policy`: if Firefox enterprise policies are active and DoH is disabled
* `evaluateReason`: why heuristics were evaluated

# State events


Events are sent when the addon changes states, with method "state" and
objects in "loaded", "enabled", "disabled",
"manuallyDisabled" (through about:preferences or about:config), "uninstalled",
"UIOK" (user accepts DoH) or "UIDisabled" (user opts out of DoH).

[application DNS canary]: https://support.mozilla.org/en-US/kb/canary-domain-use-application-dnsnet
[forced SafeSearch]: https://support.google.com/websearch/answer/186669?hl=en
[telemetry events]: https://firefox-source-docs.mozilla.org/toolkit/components/telemetry/collection/events.html
