"use strict";
/* global browser, tldjs */


const GLOBAL_CANARY = "use-application-dns.net";


async function dnsLookup(hostname) {
  let flags = ["disable_trr", "disable_ipv6", "bypass_cache"];
  let addresses;

  try {
    let response = await browser.dns.resolve(hostname, flags);
    addresses = response.addresses;
  } catch (e) {
    if (e.message !== "NS_ERROR_UNKNOWN_HOST") {
      console.error("DNS lookup for heuristics failed for unknown reason");
    }
    addresses = null;
  }
  return addresses;
}


// TODO: Randomize order of lookups
async function dnsListLookup(domainList) {
  let results = [];
  for (let i = 0; i < domainList.length; i++) {
    let domain = domainList[i];
    let addresses = await dnsLookup(domain);
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
    safeSearchChecks[providerName] = false;

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
        safeSearchChecks[providerName] = true;
      }
    }
  }
  return safeSearchChecks;
}


async function comcastDomains() {
  const canaryList = [
    {
      type: "malware",
      check: ["test.xfiprotectedbrowsing.com"]
    },
    {
      type: "parental",
      check: ["test.xfiparentalcontrols.com"]
    }
  ];

  let canaryChecks = {};
  for (let i = 0; i < canaryList.length; i++) {
    let canaryObj = canaryList[i];
    let canaryType = canaryObj.type;
    canaryChecks[canaryType] = false;

    // If NXDOMAIN is not returned, we infer that content filters are on
    let canaryAnswers = await dnsListLookup(canaryObj.check);
    for (let j = 0; j < canaryAnswers.length; j++) {
      let answer = canaryAnswers[j];
      if (answer) {
        canaryChecks[canaryType] = true;
      }
    }
  }
  return canaryChecks;
}


async function checkContentFilters() {
  let comcastChecks = await comcastDomains();
  let safeSearchChecks = await safeSearch();
  let contentFilterChecks = {"usesComcastMalwareFilter": comcastChecks.malware,
                 "usesComcastParentalFilter": comcastChecks.parental,
                 "usesGoogleSafeSearch": safeSearchChecks.google,
                 "usesYouTubeSafeSearch": safeSearchChecks.youtube};
  return contentFilterChecks;
}


async function checkTLDExists(responseDetails) {
  let url = responseDetails.url;
  let ip = responseDetails.ip;
  let hostname = new URL(url).hostname;
  let fromCache = responseDetails.fromCache;
  let redirectUrl = responseDetails.redirectUrl;

  // Ignore anything from localhost
  if (hostname === "localhost") {
    return false;
  }

  // If we didn't get IP/hostname fields from the response object, then either:
  //   a) We read the webpage from the browser cache
  //   b) We are being redirected
  //   c) Something undefined happened
  if (!ip || !hostname) {
    if (!fromCache && !redirectUrl) {
      console.error("Unknown reason for empty IP/Hostname fields", url);
    }
    return false;
  }

  return tldjs.tldExists(hostname);
}


// TODO: Confirm the expected address when filtering is on
async function checkGlobalCanary() {
  let addresses = await dnsLookup(GLOBAL_CANARY);
  for (let i = 0; i < addresses.length; i++) {
    let addr = addresses[i];
    if (addr === "192.0.0.8") {
      return true;
    }
  }
  return false;
}
