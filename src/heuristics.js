"use strict";
/* global browser, tldjs */


// TODO: Randomize order of lookups
async function dnsListLookup(domainList) {
  let results = [];
  for (let i = 0; i < domainList.length; i++) {
    let domain = domainList[i];
    try {
      let flags = ["disable_trr", "disable_ipv6", "bypass_cache"];
      let response = await browser.dns.resolve(domain, flags);
      results = results.concat(response.addresses);
    } catch (e) {
      // Handle NXDOMAIN
      if (e.message === "NS_ERROR_UNKNOWN_HOST") {
        results = results.concat(null);
      } else {
        throw e;
      }
    }
  }
  return results;
}


async function usesSafeSearch() {
  const providerList = [
    {
      name: "google",
      check: [
        "www.google.com",
        "google.com"
      ],
      filter: [
        "forcesafesearch.google.com",
      ],
    },
    {
      name: "youtube",
      check: [
        "www.youtube.com",
        "m.youtube.com",
        "youtubei.googleapis.com",
        "youtube.googleapis.com",
        "www.youtube-nocookie.com"
      ],
      filter: [
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
    results.checks = await dnsListLookup(providerObj.check);
    results.filters = await dnsListLookup(providerObj.filter);

    // Given a provider, check if the answer for any safe search domain 
    // matches the answer for any default domain
    for (let filter of results.filters) {
      if (filter === null) {
        continue;
      }

      let filtered = results.checks.includes(filter);
      if (filtered) {
        safeSearchChecks[providerName] = true;
      }
    }
  }
  return safeSearchChecks;
}


async function resolvesComcastDomains() {
  const canaryList = [
    {
      type: "malware",
      check: ["testprotectedbrowsing.xfinity.com"] 
    },
    {
      type: "parental",
      check: ["testparentalcontrols.xfinity.com"]
    }
  ];

  let canaryChecks = {};
  for (let i = 0; i < canaryList.length; i++) {
    let canaryObj = canaryList[i];
    let canaryType = canaryObj.type;
    canaryChecks[canaryType] = false;

    // If NXDOMAIN is not returned, we infer that content filters are on
    let answers = await dnsListLookup(canaryObj.check);
    for (let j = 0; j < answers.length; j++) {
      let answer = answers[j];
      if (answer) {
        canaryChecks[canaryType] = true;
      }
    }
  }
  return canaryChecks;
}


async function blocksExampleAdultSite() {
  const blocklistDomains = ["exampleadultsite.com"];

  let answers = await dnsListLookup(blocklistDomains);
  for (let i = 0; i < answers.length; i++) {
    // If exampleadultsite.com doesn't resolve to 146.112.255.155, 
    // then we infer that content filters are on
    let answer = answers[i];
    if (answer && answer !== "146.112.255.155") {
      return true;
    }
  }
  return false;
}


async function checkContentFilters() {
  let _comcastChecks = await resolvesComcastDomains();
  let _blocksExampleAdultSite = await blocksExampleAdultSite();
  let _safeSearchChecks = await usesSafeSearch();
}


// Private address space for IPv4
// TODO: Add function to parse local addresses for IPv6 (RFC 4193)
function checkRFC1918(ip) {
  if (!ip) {
    return false;
  }

  // Parse the highest order octets of the address
  let octets = ip.split(".");
  let firstOctet = parseInt(octets[0], 10);
  let secondOctet = parseInt(octets[1], 10); 
    
  if (firstOctet === 10) {
    return true;
  } else if (firstOctet === 192 && secondOctet === 168) {
    return true;
  } else if (firstOctet === 172 && secondOctet >= 16  && secondOctet <= 31) {
    return true;
  }
  return false;
}


// TODO: Detect HTTPS upgrades
async function checkSplitHorizon(responseDetails) {
  let url = responseDetails.url;
  let ip = responseDetails.ip;
  let hostname = new URL(url).hostname;
  let fromCache = responseDetails.fromCache;
  let redirectUrl = responseDetails.redirectUrl;

  // Ignore anything from localhost
  if (hostname === "localhost") {
    return;
  }

  // If we didn't get IP/hostname fields from the response object, then either:
  //   a) We read the webpage from the browser cache
  //   b) We are being redirected
  //   c) Something undefined happened
  if (!ip || !hostname) {
    if (!fromCache && !redirectUrl) {
      console.error("Unknown reason for empty IP/Hostname fields", url);
    }
    return;
  }

  // Check if the domain suffix is not in the PSL 
  let tldExists = tldjs.tldExists(hostname);
  if (!tldExists) {
    // TODO: Send Telemetry for notInPSL
  }

  // Check if the domain suffix is in the PSL 
  // but the domain name resolves to an RFC 1918 address
  let isRFC1918 = checkRFC1918(ip);
  if (tldExists && isRFC1918) {
    // TODO: Send Telemetry for pslResolvesLocal
  }
}
