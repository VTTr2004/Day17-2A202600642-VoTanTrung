(function () {
  const STORAGE_KEY = "language-discovery-two-phone-v1";
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("language-discovery-two-phone") : null;
  const now = () => new Date().toISOString();

  const accounts = {
    minh: { name: "Minh", subtitle: "Grade 8 · A2", avatar: "M" },
    linh: { name: "Linh", subtitle: "Grade 7 · A1", avatar: "L" },
    coach: { name: "AI Coach", subtitle: "Wizard of Oz operator", avatar: "AI" }
  };

  const defaults = {
    woz: {
      topic: "School life",
      startedAt: now(),
      feedback: [],
      messages: [
        {
          id: crypto.randomUUID(),
          sender: "coach",
          text: "Hi Minh! I am ready to practice English with you. How was your day?",
          at: now()
        }
      ]
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
      state.woz.messages.push({ id: crypto.randomUUID(), sender: account, text, at: now() });
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
      if (!text || !state.omegle.match) return;
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

    if (click === "woz-quick") {
      state.woz.messages.push({ id: crypto.randomUUID(), sender: "coach", text: button.dataset.reply, at: now() });
      save();
    }

    if (click === "woz-feedback") {
      state.woz.feedback.push({ id: crypto.randomUUID(), value: button.dataset.value, at: now() });
      save();
    }

    if (click === "pool-match") {
      const minh = state.pool.signups.minh;
      const linh = state.pool.signups.linh;
      if (!minh || !linh) return;
      state.pool.match = {
        students: ["Minh", "Linh"],
        topic: minh.topic === linh.topic ? minh.topic : `${minh.topic} / ${linh.topic}`,
        time: minh.time,
        room: `meet.demo/${Math.floor(1000 + Math.random() * 9000)}`,
        status: "booked",
        at: now()
      };
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

    if (click === "omegle-end") {
      if (state.omegle.match) state.omegle.endedMatches += 1;
      state.omegle.match = null;
      state.omegle.queue = [];
      state.omegle.messages = [];
      save();
    }
  }

  function handleChange(event) {
    if (event.target.id !== "wozTopic") return;
    state.woz.topic = event.target.value;
    state.woz.messages.push({ id: crypto.randomUUID(), sender: "system", text: `Topic changed to ${state.woz.topic}.`, at: now() });
    save();
  }

  function joinOmegleQueue(account) {
    if (state.omegle.match) return;
    if (!state.omegle.queue.includes(account)) state.omegle.queue.push(account);

    if (state.omegle.queue.includes("minh") && state.omegle.queue.includes("linh")) {
      state.omegle.queue = [];
      state.omegle.match = {
        students: ["minh", "linh"],
        topic: "School life",
        startedAt: now(),
        status: "active"
      };
      state.omegle.messages = [
        { id: crypto.randomUUID(), sender: "system", text: "Matched Minh and Linh. Topic: School life.", at: now() }
      ];
    }
    save();
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
    const metricsByPrototype = {
      woz: [
        ["Messages", state.woz.messages.filter((message) => message.sender !== "system").length],
        ["Feedback", state.woz.feedback.length],
        ["Minutes", Math.max(1, Math.ceil((Date.now() - new Date(state.woz.startedAt).getTime()) / 60000))]
      ],
      pool: [
        ["Signups", Object.keys(state.pool.signups).length],
        ["Matches", state.pool.match ? 1 : 0],
        ["Completed", state.pool.completed]
      ],
      omegle: [
        ["Queue", state.omegle.queue.length],
        ["Matched", state.omegle.match ? 1 : 0],
        ["Messages", state.omegle.messages.filter((message) => message.sender !== "system").length]
      ]
    };

    $("#metrics").innerHTML = metricsByPrototype[activePrototype]
      .map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`)
      .join("");
  }

  function renderWoz() {
    $("#captionA").textContent = "Phone A · Minh account";
    $("#captionB").textContent = "Phone B · Coach/operator account";

    $("#screenA").innerHTML = `
      ${mobileHead("minh", "Practice with AI", `<span class="status-pill">Student</span>`, `
        <div class="topic-row">
          <select id="wozTopic">
            ${["School life", "Favorite movie", "Dream vacation", "Future career"].map((topic) => `
              <option ${topic === state.woz.topic ? "selected" : ""}>${topic}</option>
            `).join("")}
          </select>
          <button class="ghost" data-click="woz-feedback" data-value="want-again">Like</button>
        </div>
      `)}
      ${chatBody(state.woz.messages, "minh")}
      ${composer("woz-message", "minh", "Type your English sentence...")}
    `;

    const needsReply = state.woz.messages.at(-1)?.sender === "minh";
    $("#screenB").innerHTML = `
      ${mobileHead("coach", "Operator console", `<span class="status-pill ${needsReply ? "warn" : ""}">${needsReply ? "Needs reply" : "Ready"}</span>`)}
      ${chatBody(state.woz.messages, "coach")}
      <div class="mobile-actions">
        <div class="quick-row">
          <button class="ghost" data-click="woz-quick" data-reply='Great! You can also say: "I went to school today." What subject do you like most?'>Correction</button>
          <button class="ghost" data-click="woz-quick" data-reply="Nice answer. Can you tell me one more detail?">Ask more</button>
          <button class="ghost" data-click="woz-quick" data-reply="Good try. Try using past tense in your next sentence.">Grammar</button>
        </div>
        ${composer("woz-message", "coach", "Reply as AI...")}
      </div>
    `;
  }

  function renderPool() {
    $("#captionA").textContent = "Phone A · Minh account";
    $("#captionB").textContent = "Phone B · Linh account";
    $("#screenA").innerHTML = poolPhone("minh");
    $("#screenB").innerHTML = poolPhone("linh");
  }

  function poolPhone(account) {
    const signup = state.pool.signups[account];
    const other = account === "minh" ? "linh" : "minh";
    const bothJoined = state.pool.signups.minh && state.pool.signups.linh;
    const canMatch = bothJoined && !state.pool.match;

    return `
      ${mobileHead(account, "Partner Pool", `<span class="status-pill">${signup ? "Joined" : "Not joined"}</span>`)}
      <div class="mobile-body">
        ${signup ? signupCard(signup) : poolForm(account)}
        ${state.pool.signups[other] ? signupCard(state.pool.signups[other], "Other learner online") : emptyCard("Dang cho tai khoan con lai dang ky.")}
        ${state.pool.match ? matchCard(state.pool.match) : emptyCard(canMatch ? "Ca 2 tai khoan da san sang de ghep cap." : "Chua du 2 hoc sinh de tao lich luyen tap.")}
      </div>
      <div class="mobile-actions">
        <div class="split-buttons">
          <button data-click="pool-match" ${canMatch ? "" : "disabled"}>Create match</button>
          <button class="secondary" data-click="pool-complete" ${state.pool.match ? "" : "disabled"}>Completed</button>
        </div>
      </div>
    `;
  }

  function poolForm(account) {
    const isMinh = account === "minh";
    return `
      <form class="form-stack card" data-action="pool-signup" data-account="${account}">
        <h3>Join partner pool</h3>
        <label>Level
          <select name="level">
            <option ${isMinh ? "" : "selected"}>A1</option>
            <option ${isMinh ? "selected" : ""}>A2</option>
            <option>B1</option>
          </select>
        </label>
        <label>Free time
          <input name="time" value="${isMinh ? "Tonight 20:00" : "Tonight 20:15"}" />
        </label>
        <label>Topic
          <input name="topic" value="${isMinh ? "Favorite movie" : "School life"}" />
        </label>
        <button type="submit">Join pool</button>
      </form>
    `;
  }

  function renderOmegle() {
    $("#captionA").textContent = "Phone A · Minh account";
    $("#captionB").textContent = "Phone B · Linh account";
    $("#screenA").innerHTML = omeglePhone("minh");
    $("#screenB").innerHTML = omeglePhone("linh");
  }

  function omeglePhone(account) {
    const queued = state.omegle.queue.includes(account);
    const matched = Boolean(state.omegle.match);
    const status = matched ? "Matched" : queued ? "Waiting" : "Idle";

    return `
      ${mobileHead(account, "Omegle English", `<span class="status-pill ${queued ? "warn" : ""}">${status}</span>`)}
      <div class="mobile-body chat-body">
        ${matched ? matchCard({
          students: ["Minh", "Linh"],
          topic: state.omegle.match.topic,
          time: "Now",
          room: "In-app chat",
          status: "active"
        }) : emptyCard(queued ? "Dang cho tai khoan con lai bam Find Partner." : "Bam Find Partner de vao hang doi live match.")}
        ${chatList(state.omegle.messages, account)}
      </div>
      <div class="mobile-actions">
        ${matched ? composer("omegle-message", account, "Say something in English...") : `<button data-click="omegle-find" data-account="${account}">${queued ? "Waiting..." : "Find Partner"}</button>`}
        ${matched ? `<button class="secondary" data-click="omegle-end">End session</button>` : ""}
      </div>
    `;
  }

  function mobileHead(account, title, right = "", extra = "") {
    const item = accounts[account];
    const avatarClass = account === "coach" ? "ai" : account === "linh" ? "blue" : "";
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
          <small>${labelForSender(message.sender)} · ${formatTime(message.at)}</small>
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
        <p><strong>${escapeHtml(signup.name)}</strong> · ${escapeHtml(signup.level)} · ${escapeHtml(signup.time)}</p>
        <p>Topic: ${escapeHtml(signup.topic)}</p>
      </article>
    `;
  }

  function matchCard(match) {
    return `
      <article class="card match-card">
        <h3>Matched</h3>
        <p><strong>${escapeHtml(match.students.join(" + "))}</strong></p>
        <p>Topic: ${escapeHtml(match.topic)} · Time: ${escapeHtml(match.time)}</p>
        <p>Room: ${escapeHtml(match.room)} · Status: ${escapeHtml(match.status)}</p>
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
