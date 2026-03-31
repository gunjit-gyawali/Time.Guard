const TICK_ALARM = "timeguard_tick";
const TICK_SECONDS = 5;

let domainTimers = {};

function extractDomain(url) {
  try {
    if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return null;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function saveDomainTimers() {
  return new Promise(resolve => {
    chrome.storage.local.set({ domainTimers }, resolve);
  });
}

function loadDomainTimers() {
  return new Promise(resolve => {
    chrome.storage.local.get({ domainTimers: {} }, data => {
      domainTimers = data.domainTimers;
      resolve();
    });
  });
}

function getActiveDomain() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
      if (!tabs || tabs.length === 0) return resolve(null);
      resolve(extractDomain(tabs[0].url));
    });
  });
}

async function tick() {
  const domain = await getActiveDomain();
  if (!domain) return;
  if (domainTimers[domain] === undefined) domainTimers[domain] = 0;
  domainTimers[domain] += TICK_SECONDS;
  await saveDomainTimers();
}

function startAlarm() {
  chrome.alarms.get(TICK_ALARM, alarm => {
    if (!alarm) {
      chrome.alarms.create(TICK_ALARM, {
        delayInMinutes: TICK_SECONDS / 60,
        periodInMinutes: TICK_SECONDS / 60
      });
    }
  });
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === TICK_ALARM) tick();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESET_DOMAIN") {
    delete domainTimers[message.domain];
    saveDomainTimers().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === "GET_STATS") {
    getActiveDomain().then(domain => {
      sendResponse({ domainTimers, activeDomain: domain });
    });
    return true;
  }
  if (message.type === "RESET_ALL") {
    domainTimers = {};
    saveDomainTimers().then(() => sendResponse({ success: true }));
    return true;
  }
});

(async () => {
  await loadDomainTimers();
  startAlarm();
})();
