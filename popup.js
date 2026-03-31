function formatTime(seconds) {
  if (seconds < 60) return seconds + "s";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  let result = "";

  if (h > 0) result += h + "h ";
  if (m > 0) result += m + "m ";
  if (s > 0) result += s + "s";

  return result.trim();
}

function render() {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, response => {
    if (chrome.runtime.lastError || !response) return;

    const { domainTimers = {}, activeDomain } = response;

    if (activeDomain) {
      document.getElementById("activeDomain").textContent = activeDomain;
      document.getElementById("timeSpent").textContent = formatTime(domainTimers[activeDomain] || 0);
    } else {
      document.getElementById("activeDomain").textContent = "No Website Opened";
      document.getElementById("timeSpent").textContent = "";
    }

    const entries = Object.entries(domainTimers).sort((a, b) => b[1] - a[1]);
    const list = document.getElementById("domainList");

    if (entries.length === 0) {
      list.innerHTML = '<li class="empty-state">Nothing tracked yet..</li>';
      return;
    }

    list.innerHTML = entries.map(([domain, seconds]) => `
      <li class="domain-item">
        <div class="domain-row">
          <span class="domain-name">${domain}</span>
          <span class="domain-time">${formatTime(seconds)}</span>
          <button class="reset-btn" data-domain="${domain}">reset</button>
        </div>
      </li>
    `).join("");

    list.querySelectorAll(".reset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        showConfirm(() => {
          chrome.runtime.sendMessage({ type: "RESET_DOMAIN", domain: btn.dataset.domain }, render);
        });
      });
    });
  });
}

const overlay = document.getElementById("confirmOverlay");
let pendingAction = null;

function showConfirm(onYes) {
  pendingAction = onYes;
  overlay.classList.add("visible");
}

document.getElementById("resetAllBtn").addEventListener("click", () => {
  showConfirm(() => {
    chrome.runtime.sendMessage({ type: "RESET_ALL" }, render);
  });
});

document.getElementById("confirmYes").addEventListener("click", () => {
  overlay.classList.remove("visible");
  if (pendingAction) pendingAction();
  pendingAction = null;
});

document.getElementById("confirmNo").addEventListener("click", () => {
  overlay.classList.remove("visible");
  pendingAction = null;
});

render();
setInterval(render, 5000);


