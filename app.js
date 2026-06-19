(function () {
  const STORAGE_KEY = "language-discovery-three-user-v1";
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("language-discovery-three-user") : null;
  const now = () => new Date().toISOString();
  const learnerIds = ["minh", "linh", "an"];

  const accounts = {
    minh: { name: "Minh", subtitle: "Grade 8 - A2", avatar: "M", level: "A2", time: "Tonight 20:00", topic: "Favorite movie" },
    linh: { name: "Linh", subtitle: "Grade 7 - A1", avatar: "L", level: "A1", time: "Tonight 20:10", topic: "School life" },
    an: { name: "An", subtitle: "Grade 8 - A2", avatar: "A", level: "A2", time: "Tonight 20:20", topic: "Dream vacation" },
    coach: { name: "AI Coach", subtitle: "Wizard of Oz operator", avatar: "AI" }
  };

  const defaults = {
    woz: {
      topic: "School life",
      activeStudent: "minh",
      startedAt: now(),
      feedback: [],
      conversations: {
        minh: [
          { id: crypto.randomUUID(), sender: "coach", text: "Hi Minh! I am ready to practice English with you. How was your day?", at: now() }
        ],
        linh: [
          { id: crypto.randomUUID(), sender: "coach", text: "Hi Linh! Let's practice a short conversation today.", at: now() }
        ]
      }
    },
    pool: {
      signups: {},
      match: null,
      completed: 0
    },
    omegle: {
      queue: [],
      match: null,
      endedMatches: 0,
      messages: []
    }
  };

  let activePrototype = new URLSearchParams(location.search).get("prototype") || "woz";
  let state = loadState();

  const prototypeMeta = {
    woz: ["Prototype 1", "Wizard of Oz Chat"],
    pool: ["Prototype 2", "Human Partner Pool"],
    omegle: ["Prototype 3", "Omegle for English"]
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  init();

  function init() {
    $$(".nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        activePrototype = button.dataset.prototype;
        updateUrl();
        render();
      });
    });

    $("#resetDemo").addEventListener("click", () => {
      state = structuredClone(defaults);
      state.woz.startedAt = now();
      save();
    });

    document.addEventListener("submit", handleSubmit);
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;
      state = loadState();
      render();
    });

    if (channel) {
      channel.addEventListener("message", () => {
        state = loadState();
        render();
      });
    }

    render();
  }

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored ? mergeDefaults(defaults, stored) : structuredClone(defaults);
    } catch {
      return structuredClone(defaults);
    }
  }

  function mergeDefaults(base, value) {
    if (Array.isArray(base)) return Array.isArray(value) ? value : base;
    if (!base || typeof base !== "object") return value ?? base;
    const merged = { ...base, ...(value || {}) };
    Object.keys(base).forEach((key) => {
      merged[key] = mergeDefaults(base[key], value ? value[key] : undefined);
    });
    return merged;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (channel) channel.postMessage({ type: "updated" });
    render();
  }

  function updateUrl() {
    const url = new URL(location.href);
    url.searchParams.set("prototype", activePrototype);
    history.replaceState(null, "", url);
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!form.matches("[data-action]")) return;
    event.preventDefault();

    const action = form.dataset.action;
    const account = form.dataset.account;
    const input = form.querySelector("input");

    if (action === "woz-message") {
      const text = input.value.trim();
      if (!text) return;
      ensureConversation(account);
      state.woz.conversations[account].push({ id: crypto.randomUUID(), sender: account, text, at: now() });
      state.woz.activeStudent = account;
      input.value = "";
      save();
    }

    if (action === "woz-coach-message") {
      const text = input.value.trim();
      const student = state.woz.activeStudent;
      if (!text || !student) return;
      ensureConversation(student);
      state.woz.conversations[student].push({ id: crypto.randomUUID(), sender: "coach", text, at: now() });
      input.value = "";
      save();
    }

    if (action === "pool-signup") {
      const data = new FormData(form);
      state.pool.signups[account] = {
        account,
        name: accounts[account].name,
        level: data.get("level"),
        time: data.get("time"),
        topic: data.get("topic"),
        at: now()
      };
      save();
    }

    if (action === "omegle-message") {
      const text = input.value.trim();
      if (!text || !isInOmegleMatch(account)) return;
      state.omegle.messages.push({ id: crypto.randomUUID(), sender: account, text, at: now() });
      input.value = "";
      save();
    }
  }

  function handleClick(event) {
    const button = event.target.closest("[data-click]");
    if (!button) return;

    const click = button.dataset.click;
    const account = button.dataset.account;

    if (click === "woz-focus") {
      state.woz.activeStudent = account;
      save();
    }

    if (click === "woz-quick") {
      const student = state.woz.activeStudent;
      ensureConversation(student);
      state.woz.conversations[student].push({ id: crypto.randomUUID(), sender: "coach", text: button.dataset.reply, at: now() });
      save();
    }

    if (click === "woz-feedback") {
      state.woz.feedback.push({ id: crypto.randomUUID(), account, value: button.dataset.value, at: now() });
      save();
    }

    if (click === "pool-auto-match") {
      createPoolMatch();
    }

    if (click === "pool-reset-match") {
      state.pool.match = null;
      save();
    }

    if (click === "pool-complete") {
      if (!state.pool.match) return;
      state.pool.match.status = "completed";
      state.pool.completed += 1;
      save();
    }

    if (click === "omegle-find") {
      joinOmegleQueue(account);
    }

    if (click === "omegle-leave") {
      state.omegle.queue = state.omegle.queue.filter((item) => item !== account);
      save();
    }

    if (click === "omegle-end") {
      if (state.omegle.match) state.omegle.endedMatches += 1;
      state.omegle.match = null;
      state.omegle.messages = [];
      maybeCreateOmegleMatch();
      save();
    }
  }

  function handleChange(event) {
    if (event.target.id !== "wozTopic") return;
    state.woz.topic = event.target.value;
    Object.keys(state.woz.conversations).forEach((student) => {
      state.woz.conversations[student].push({ id: crypto.randomUUID(), sender: "system", text: `Topic changed to ${state.woz.topic}.`, at: now() });
    });
    save();
  }

  function ensureConversation(account) {
    if (!state.woz.conversations[account]) state.woz.conversations[account] = [];
  }

  function createPoolMatch() {
    const signed = learnerIds.filter((id) => state.pool.signups[id]);
    if (signed.length < 2 || state.pool.match) return;
    const pair = signed.slice(0, 2);
    const first = state.pool.signups[pair[0]];
    const second = state.pool.signups[pair[1]];
    state.pool.match = {
      accounts: pair,
      students: pair.map((id) => accounts[id].name),
      topic: first.topic === second.topic ? first.topic : `${first.topic} / ${second.topic}`,
      time: first.time,
      room: `meet.demo/${Math.floor(1000 + Math.random() * 9000)}`,
      status: "booked",
      at: now()
    };
    save();
  }

  function joinOmegleQueue(account) {
    if (isInOmegleMatch(account)) return;
    if (!state.omegle.queue.includes(account)) state.omegle.queue.push(account);
    maybeCreateOmegleMatch();
    save();
  }

  function maybeCreateOmegleMatch() {
    if (state.omegle.match || state.omegle.queue.length < 2) return;
    const pair = state.omegle.queue.slice(0, 2);
    state.omegle.queue = state.omegle.queue.slice(2);
    state.omegle.match = {
      accounts: pair,
      students: pair.map((id) => accounts[id].name),
      topic: "School life",
      startedAt: now(),
      status: "active"
    };
    state.omegle.messages = [
      { id: crypto.randomUUID(), sender: "system", text: `Matched ${pair.map((id) => accounts[id].name).join(" and ")}. Topic: School life.`, at: now() }
    ];
  }

  function isInOmegleMatch(account) {
    return Boolean(state.omegle.match && state.omegle.match.accounts.includes(account));
  }

  function render() {
    const [eyebrow, title] = prototypeMeta[activePrototype];
    $("#prototypeEyebrow").textContent = eyebrow;
    $("#prototypeTitle").textContent = title;

    $$(".nav-item").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.prototype === activePrototype);
    });

    renderMetrics();

    if (activePrototype === "woz") renderWoz();
    if (activePrototype === "pool") renderPool();
    if (activePrototype === "omegle") renderOmegle();
  }

  function renderMetrics() {
    const wozMessages = Object.values(state.woz.conversations).flat().filter((message) => message.sender !== "system").length;
    const signed = learnerIds.filter((id) => state.pool.signups[id]);
    const poolWaiting = state.pool.match ? signed.filter((id) => !state.pool.match.accounts.includes(id)).length : signed.length;

    const metricsByPrototype = {
      woz: [
        ["Messages", wozMessages],
        ["Feedback", state.woz.feedback.length],
        ["Minutes", Math.max(1, Math.ceil((Date.now() - new Date(state.woz.startedAt).getTime()) / 60000))]
      ],
      pool: [
        ["Signups", signed.length],
        ["Matched", state.pool.match ? 2 : 0],
        ["Waiting", poolWaiting]
      ],
      omegle: [
        ["Queue", state.omegle.queue.length],
        ["Matched", state.omegle.match ? 2 : 0],
        ["Messages", state.omegle.messages.filter((message) => message.sender !== "system").length]
      ]
    };

    $("#metrics").innerHTML = metricsByPrototype[activePrototype]
      .map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`)
      .join("");
  }

  function renderWoz() {
    $("#captionA").textContent = "Phone A - Minh account";
    $("#captionB").textContent = "Phone B - Linh account";
    $("#captionC").textContent = "Phone C - AI Coach/operator";
    $("#screenA").innerHTML = wozStudentPhone("minh");
    $("#screenB").innerHTML = wozStudentPhone("linh");
    $("#screenC").innerHTML = wozCoachPhone();
  }

  function wozStudentPhone(account) {
    ensureConversation(account);
    return `
      ${mobileHead(account, "Practice with AI", `<span class="status-pill">Student</span>`, account === "minh" ? `
        <div class="topic-row">
          <select id="wozTopic">
            ${["School life", "Favorite movie", "Dream vacation", "Future career"].map((topic) => `
              <option ${topic === state.woz.topic ? "selected" : ""}>${topic}</option>
            `).join("")}
          </select>
          <button class="ghost" data-click="woz-feedback" data-account="${account}" data-value="want-again">Like</button>
        </div>
      ` : `<button class="ghost" data-click="woz-feedback" data-account="${account}" data-value="want-again">Like session</button>`)}
      ${chatBody(state.woz.conversations[account], account)}
      ${composer("woz-message", account, "Type your English sentence...")}
    `;
  }

  function wozCoachPhone() {
    const student = state.woz.activeStudent;
    const latest = state.woz.conversations[student]?.at(-1);
    const needsReply = latest && latest.sender === student;
    return `
      ${mobileHead("coach", "Operator console", `<span class="status-pill ${needsReply ? "warn" : ""}">${needsReply ? "Needs reply" : "Ready"}</span>`)}
      <div class="mobile-body">
        <div class="quick-row">
          ${["minh", "linh"].map((id) => `<button class="ghost" data-click="woz-focus" data-account="${id}">${accounts[id].name}</button>`).join("")}
        </div>
        <article class="card">
          <h3>Replying to ${accounts[student].name}</h3>
          <p>Topic: ${state.woz.topic}</p>
        </article>
        ${chatList(state.woz.conversations[student] || [], "coach")}
      </div>
      <div class="mobile-actions">
        <div class="quick-row">
          <button class="ghost" data-click="woz-quick" data-reply='Great! You can also say: "I went to school today." What subject do you like most?'>Correction</button>
          <button class="ghost" data-click="woz-quick" data-reply="Nice answer. Can you tell me one more detail?">Ask more</button>
          <button class="ghost" data-click="woz-quick" data-reply="Good try. Try using past tense in your next sentence.">Grammar</button>
        </div>
        ${composer("woz-coach-message", "coach", "Reply as AI...")}
      </div>
    `;
  }

  function renderPool() {
    $("#captionA").textContent = "Phone A - Minh account";
    $("#captionB").textContent = "Phone B - Linh account";
    $("#captionC").textContent = "Phone C - An account";
    $("#screenA").innerHTML = poolPhone("minh");
    $("#screenB").innerHTML = poolPhone("linh");
    $("#screenC").innerHTML = poolPhone("an");
  }

  function poolPhone(account) {
    const signup = state.pool.signups[account];
    const signed = learnerIds.filter((id) => state.pool.signups[id]);
    const canMatch = signed.length >= 2 && !state.pool.match;
    const isMatched = Boolean(state.pool.match && state.pool.match.accounts.includes(account));
    const isWaiting = signup && !isMatched;

    return `
      ${mobileHead(account, "Partner Pool", `<span class="status-pill ${isWaiting ? "warn" : ""}">${poolStatus(account)}</span>`)}
      <div class="mobile-body">
        ${signup ? signupCard(signup) : poolForm(account)}
        ${state.pool.match ? matchCard(state.pool.match) : emptyCard(canMatch ? "At least 2 learners are ready. Create a pair and leave the extra learner waiting." : "Need at least 2 learners to create a practice pair.")}
        ${isWaiting ? emptyCard("You are waiting for the next available partner.") : ""}
        <div class="list">
          ${signed.map((id) => `<div class="list-item"><strong>${accounts[id].name}</strong><span>${state.pool.signups[id].level} - ${state.pool.signups[id].time} - ${state.pool.signups[id].topic}</span></div>`).join("")}
        </div>
      </div>
      <div class="mobile-actions">
        <div class="split-buttons">
          <button data-click="pool-auto-match" ${canMatch ? "" : "disabled"}>Auto match</button>
          <button class="secondary" data-click="pool-complete" ${state.pool.match ? "" : "disabled"}>Completed</button>
        </div>
        <button class="ghost" data-click="pool-reset-match" ${state.pool.match ? "" : "disabled"}>Clear match</button>
      </div>
    `;
  }

  function poolStatus(account) {
    if (!state.pool.signups[account]) return "Not joined";
    if (state.pool.match?.accounts.includes(account)) return "Matched";
    return "Waiting";
  }

  function poolForm(account) {
    const item = accounts[account];
    return `
      <form class="form-stack card" data-action="pool-signup" data-account="${account}">
        <h3>Join partner pool</h3>
        <label>Level
          <select name="level">
            ${["A1", "A2", "B1"].map((level) => `<option ${level === item.level ? "selected" : ""}>${level}</option>`).join("")}
          </select>
        </label>
        <label>Free time
          <input name="time" value="${item.time}" />
        </label>
        <label>Topic
          <input name="topic" value="${item.topic}" />
        </label>
        <button type="submit">Join pool</button>
      </form>
    `;
  }

  function renderOmegle() {
    $("#captionA").textContent = "Phone A - Minh account";
    $("#captionB").textContent = "Phone B - Linh account";
    $("#captionC").textContent = "Phone C - An account";
    $("#screenA").innerHTML = omeglePhone("minh");
    $("#screenB").innerHTML = omeglePhone("linh");
    $("#screenC").innerHTML = omeglePhone("an");
  }

  function omeglePhone(account) {
    const queued = state.omegle.queue.includes(account);
    const matched = isInOmegleMatch(account);
    const otherMatchActive = state.omegle.match && !matched;
    const status = matched ? "Matched" : queued ? "Waiting" : "Idle";

    return `
      ${mobileHead(account, "Omegle English", `<span class="status-pill ${queued || otherMatchActive ? "warn" : ""}">${status}</span>`)}
      <div class="mobile-body chat-body">
        ${matched ? matchCard({
          students: state.omegle.match.students,
          topic: state.omegle.match.topic,
          time: "Now",
          room: "In-app chat",
          status: "active"
        }) : emptyCard(queued ? "You are waiting while another pair may already be practicing." : "Tap Find Partner to enter the live queue.")}
        ${otherMatchActive ? emptyCard(`${state.omegle.match.students.join(" + ")} are practicing now. You can wait for the next match.`) : ""}
        ${matched ? chatList(state.omegle.messages, account) : ""}
      </div>
      <div class="mobile-actions">
        ${matched ? composer("omegle-message", account, "Say something in English...") : `<button data-click="omegle-find" data-account="${account}" ${queued ? "disabled" : ""}>${queued ? "Waiting..." : "Find Partner"}</button>`}
        ${queued ? `<button class="secondary" data-click="omegle-leave" data-account="${account}">Leave queue</button>` : ""}
        ${matched ? `<button class="secondary" data-click="omegle-end">End session</button>` : ""}
      </div>
    `;
  }

  function mobileHead(account, title, right = "", extra = "") {
    const item = accounts[account];
    const avatarClass = account === "coach" ? "ai" : account === "linh" ? "blue" : account === "an" ? "rose" : "";
    return `
      <header class="mobile-head">
        <div class="account-row">
          <div class="account">
            <span class="avatar ${avatarClass}">${item.avatar}</span>
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.subtitle)}</span>
            </div>
          </div>
          ${right}
        </div>
        <h2>${escapeHtml(title)}</h2>
        ${extra}
      </header>
    `;
  }

  function chatBody(messages, viewer) {
    return `<div class="mobile-body chat-body">${chatList(messages, viewer)}</div>`;
  }

  function chatList(messages, viewer) {
    const items = messages.map((message) => {
      const side = message.sender === "system" ? "system" : message.sender === viewer ? "me" : "them";
      return `
        <div class="message ${side}">
          <small>${labelForSender(message.sender)} - ${formatTime(message.at)}</small>
          ${escapeHtml(message.text)}
        </div>
      `;
    }).join("");
    return `<div class="chat-list">${items || `<div class="message system">No messages yet.</div>`}</div>`;
  }

  function composer(action, account, placeholder) {
    return `
      <form class="composer" data-action="${action}" data-account="${account}">
        <input autocomplete="off" placeholder="${escapeHtml(placeholder)}" />
        <button type="submit">Send</button>
      </form>
    `;
  }

  function signupCard(signup, title = "Your request") {
    return `
      <article class="card">
        <h3>${escapeHtml(title)}</h3>
        <p><strong>${escapeHtml(signup.name)}</strong> - ${escapeHtml(signup.level)} - ${escapeHtml(signup.time)}</p>
        <p>Topic: ${escapeHtml(signup.topic)}</p>
      </article>
    `;
  }

  function matchCard(match) {
    return `
      <article class="card match-card">
        <h3>Matched</h3>
        <p><strong>${escapeHtml(match.students.join(" + "))}</strong></p>
        <p>Topic: ${escapeHtml(match.topic)} - Time: ${escapeHtml(match.time)}</p>
        <p>Room: ${escapeHtml(match.room)} - Status: ${escapeHtml(match.status)}</p>
      </article>
    `;
  }

  function emptyCard(text) {
    return `<article class="card"><p>${escapeHtml(text)}</p></article>`;
  }

  function labelForSender(sender) {
    return {
      minh: "Minh",
      linh: "Linh",
      an: "An",
      coach: "AI Coach",
      system: "System"
    }[sender] || sender;
  }

  function formatTime(value) {
    return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
