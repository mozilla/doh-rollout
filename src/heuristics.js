"use strict";
/* global browser */


const GLOBAL_CANARY = "use-application-dns.net";

// TODO: Confirm that this error message corresponds to NXDOMAIN
const NXDOMAIN_ERR = "NS_ERROR_UNKNOWN_HOST";


async function dnsLookup(hostname) {
  let flags = ["disable_trr", "disable_ipv6", "bypass_cache"];
  let addresses, err;

  try {
    let response = await browser.dns.resolve(hostname, flags);
    addresses = response.addresses;
  } catch (e) {
    addresses = [null];
    err = e.message;
  }
  return {"addresses": addresses, "err": err};
}


async function dnsListLookup(domainList) {
  let results = [];
  for (let i = 0; i < domainList.length; i++) {
    let domain = domainList[i];
    let {addresses, _} = await dnsLookup(domain);
    results = results.concat(addresses);
  }
  return results;
}


async function safeSearch() {
  const providerList = [
    {
      name: "google",
      unfiltered: [
        "www.google.com",
        "google.com"
      ],
      safeSearch: [
        "forcesafesearch.google.com",
      ],
    },
    {
      name: "youtube",
      unfiltered: [
        "www.youtube.com",
        "m.youtube.com",
        "youtubei.googleapis.com",
        "youtube.googleapis.com",
        "www.youtube-nocookie.com"
      ],
      safeSearch: [
        "restrict.youtube.com",
        "restrictmoderate.youtube.com"
      ],
    }
  ];

  // Compare strict domain lookups to non-strict domain lookups
  let safeSearchChecks = {};
  for (let i = 0; i < providerList.length; i++) {
    let providerObj = providerList[i];
    let providerName = providerObj.name;
    safeSearchChecks[providerName] = "enable_doh";

    let results = {};
    results.unfilteredAnswers = await dnsListLookup(providerObj.unfiltered);
    results.safeSearchAnswers = await dnsListLookup(providerObj.safeSearch);

    // Given a provider, check if the answer for any safe search domain
    // matches the answer for any default domain
    for (let j = 0; j < results.safeSearchAnswers.length; j++) {
      let answer = results.safeSearchAnswers[j];
      if (answer === null) {
        continue;
      }

      let safeSearchEnabled = results.unfilteredAnswers.includes(answer);
      if (safeSearchEnabled) {
        safeSearchChecks[providerName] = "disable_doh";
      }
    }
  }
  return safeSearchChecks;
}

// TODO: Confirm the expected behavior when filtering is on
async function globalCanary() {
  let {addresses, err} = await dnsLookup(GLOBAL_CANARY);
  if (err === NXDOMAIN_ERR) {
    return "disable_doh";
  }
  if (addresses.length === 0) {
    return "disable_doh";
  }
  return "enable_doh";
}


async function modifiedRoots() {
  // Check for presence of both enterprise_roots and if enterprise_roots.auto-enabled
  // is false. (Firefox flips enterprise_roots.auto-enabled to true in some MITM detection cases.)
  // We only want to disable DoH when the user has turned enterprise_roots on manually. 
  let rootsEnabled = await browser.experiments.preferences.getUserPref(
    "security.enterprise_roots.enabled", false);
  let rootsAutoEnabled = await browser.experiments.preferences.getUserPref(
    "security.enterprise_roots.auto-enabled", false);
  if (rootsEnabled && !rootsAutoEnabled) {
    return "disable_doh";
  }
  return "enable_doh";
}

async function runHeuristics() {
  let safeSearchChecks = await safeSearch();
  let canaryCheck = await globalCanary();
  let modifiedRootsCheck = await modifiedRoots();

  // Check other heuristics through privileged code
  let browserParentCheck = await browser.experiments.heuristics.checkParentalControls();
  let enterpriseCheck = await browser.experiments.heuristics.checkEnterprisePolicies();
  let thirdPartyRootsCheck = await browser.experiments.heuristics.checkThirdPartyRoots();

  // Return result of each heuristic
  let heuristics = {"google": safeSearchChecks.google,
    "youtube": safeSearchChecks.youtube,
    "canary": canaryCheck,
    "modifiedRoots": modifiedRootsCheck,
    "browserParent": browserParentCheck,
    "thirdPartyRoots": thirdPartyRootsCheck,
    "policy": enterpriseCheck};
  return heuristics;
}
