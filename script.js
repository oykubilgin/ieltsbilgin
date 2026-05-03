/* ── Helpers ── */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* ── App state ── */
let quickCards = [];
let infoSections = {};
let skillSections = {};
let downloads = [];
let exams = [];
let forumCategories = [];
let seedPosts = [];
const searchItems = [];

/* ── Load data.json ── */
async function loadData() {
  const res = await fetch("data.json");
  const data = await res.json();
  quickCards = data.quickCards;
  infoSections = data.infoSections;
  skillSections = data.skillSections;
  downloads = data.downloads;
  exams = data.exams;
  forumCategories = data.forumCategories;
  seedPosts = data.seedPosts.map(p => ({
    ...p,
    id: p.id || crypto.randomUUID(),
    date: p.date || new Date(Date.now() - 86400000).toISOString(),
    comments: (p.comments || []).map(c => ({
      ...c,
      id: c.id || crypto.randomUUID(),
      replies: (c.replies || []).map(r => ({ ...r, id: r.id || crypto.randomUUID() }))
    }))
  }));
}

/* ── Search index ── */
function buildSearchIndex() {
  searchItems.length = 0;
  quickCards.forEach(([title, desc, page, section]) =>
    searchItems.push({ title, desc, page, section, type: "Page" }));
  Object.entries(infoSections).forEach(([section, d]) =>
    searchItems.push({ title: d.title, desc: stripHtml(d.html).slice(0, 140), page: "information", section, type: "Information" }));
  Object.entries(skillSections).forEach(([section, d]) =>
    searchItems.push({ title: d.title, desc: stripHtml(d.html).slice(0, 140), page: "skills", section, type: "Skill" }));
  downloads.forEach(([title, desc, category, fileType]) =>
    searchItems.push({ title, desc: `${category} • ${fileType} • ${desc}`, page: "downloads", section: "", type: "Download" }));
  exams.forEach(([title, desc, category]) =>
    searchItems.push({ title, desc: `${category} • ${desc}`, page: "exams", section: "", type: "Exam" }));
  getPosts().forEach(post =>
    searchItems.push({ title: post.title, desc: `${post.category} • ${post.body}`, page: "forum", section: "", type: "Forum" }));
  searchItems.push({
    title: "IELTS One Skill Retake",
    desc: "Eligibility, costs, application, retake conditions, and tips before applying.",
    page: "one-skill-retake", section: "", type: "Admin"
  });
}

/* ── Utilities ── */
function stripHtml(html) {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent || el.innerText || "";
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>'"]/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function toast(message) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

/* ── Render helpers ── */
function makeCard(title, desc, page, section, icon) {
  return `<article class="card link-card" tabindex="0" role="button" data-link="${page}" data-section="${section || ""}">
    <div class="card-icon">${icon}</div>
    <div><h3>${title}</h3><p>${desc}</p></div>
    <span class="tag">Open →</span>
  </article>`;
}

/* ── Page renderers ── */
function renderHome() {
  $("#quickCards").innerHTML = quickCards.map(c => makeCard(...c)).join("");
  $("#featuredResources").innerHTML = downloads.slice(1, 4).map(([title, desc, cat, type]) =>
    `<article class="card link-card" data-link="downloads" tabindex="0" role="button">
      <span class="tag">${cat}</span>
      <h3>${title}</h3>
      <p>${desc}</p>
      <div class="download-meta"><span>${type}</span><span>Download →</span></div>
    </article>`).join("");
}

function renderInfo(active = "test-types") {
  $("#infoSideNav").innerHTML = Object.entries(infoSections).map(([key, data]) =>
    `<button class="${key === active ? "active" : ""}" data-info-section="${key}">${data.title}</button>`).join("");
  const section = infoSections[active] || infoSections["test-types"];
  $("#infoContent").innerHTML = `<article class="card info-block"><span class="tag">${section.tag}</span><h2>${section.title}</h2>${section.html}</article>`;
}

function renderSkills(active = "listening") {
  $("#skillsSideNav").innerHTML = Object.entries(skillSections).map(([key, data]) =>
    `<button class="${key === active ? "active" : ""}" data-skill-section="${key}">${data.title}</button>`).join("");
  const section = skillSections[active] || skillSections.listening;
  $("#skillsContent").innerHTML = `<article class="card info-block"><span class="tag">${section.tag}</span><h2>${section.title}</h2>${section.html}</article>`;
}

function renderExams() {
  $("#examCards").innerHTML = exams.map(([title, desc, cat, buttons]) =>
    `<article class="card link-card">
      <span class="tag">${cat}</span>
      <h3>${title}</h3>
      <p>${desc}</p>
      <div class="button-row">
        ${buttons.map((b, i) =>
          `<button class="btn ${i === 0 ? "btn-primary" : i === 1 ? "btn-accent" : "btn-ghost"} btn-small"
            data-toast="${b}: ${title}">${b}</button>`).join("")}
      </div>
    </article>`).join("");
}

function renderDownloadFilters(active = "All") {
  const cats = ["All", ...new Set(downloads.map(d => d[2]))];
  $("#downloadFilters").innerHTML = cats.map(cat =>
    `<button class="filter-btn ${cat === active ? "active" : ""}" data-download-filter="${cat}">${cat}</button>`).join("");
  const filtered = active === "All" ? downloads : downloads.filter(d => d[2] === active);
  $("#downloadCards").innerHTML = filtered.map(([title, desc, cat, type]) =>
    `<article class="card link-card">
      <span class="tag">${cat}</span>
      <h3>${title}</h3>
      <p>${desc}</p>
      <div class="download-meta">
        <span>${type}</span>
        <button class="btn btn-primary btn-small" data-toast="Preparing demo download: ${title}">Download</button>
      </div>
    </article>`).join("");
}

/* ── Forum ── */
function getPosts() {
  const saved = localStorage.getItem("ieltsBilginPosts");
  if (!saved) return seedPosts;
  try { return JSON.parse(saved); } catch { return seedPosts; }
}

function savePosts(posts) {
  localStorage.setItem("ieltsBilginPosts", JSON.stringify(posts));
  buildSearchIndex();
}

function renderForumFilters(active = "All") {
  $("#forumFilters").innerHTML = forumCategories.map(cat =>
    `<button class="filter-btn ${cat === active ? "active" : ""}" data-forum-filter="${cat}">${cat}</button>`).join("");
  renderPosts(active);
}

function renderPosts(category = "All") {
  const posts = getPosts().filter(p => category === "All" || p.category === category);
  $("#forumPosts").innerHTML = posts.map(post => `
    <article class="card post" data-post-id="${post.id}">
      <div class="post-head">
        <div>
          <span class="tag">${post.category}</span>
          <h3>${escapeHtml(post.title)}</h3>
          <div class="post-meta">By ${escapeHtml(post.author)} • ${new Date(post.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>
        </div>
      </div>
      <p>${escapeHtml(post.body)}</p>
      ${post.image ? `<img src="${post.image}" alt="Forum post attachment" style="border-radius:16px;border:1px solid var(--border);max-height:260px;object-fit:cover;width:100%">` : ""}
      <div class="comment-box">
        <strong>Comments</strong>
        ${(post.comments || []).map(comment => `
          <div class="comment">
            <strong>${escapeHtml(comment.author)}</strong>
            <p>${escapeHtml(comment.text)}</p>
            ${(comment.replies || []).map(reply => `
              <div class="reply">
                <strong>${escapeHtml(reply.author)}</strong>
                <p>${escapeHtml(reply.text)}</p>
              </div>`).join("")}
            <form class="reply-form form-grid" data-comment-id="${comment.id}">
              <input required placeholder="Reply to this comment" />
              <button class="btn btn-ghost btn-small" type="submit">Reply</button>
            </form>
          </div>`).join("") || `<p class="post-meta">No comments yet. Be the first to respond.</p>`}
        <form class="comment-form form-grid">
          <input required placeholder="Add a comment" />
          <button class="btn btn-accent btn-small" type="submit">Comment</button>
        </form>
      </div>
    </article>`).join("");
}

function renderForumForm() {
  $("#postCategory").innerHTML = forumCategories.filter(c => c !== "All").map(c => `<option>${c}</option>`).join("");
}

/* ── Search ── */
function showSuggestions(input, container) {
  const q = input.value.trim().toLowerCase();
  if (!q) { container.classList.remove("visible"); container.innerHTML = ""; return; }
  const results = searchItems.filter(item =>
    `${item.title} ${item.desc} ${item.type}`.toLowerCase().includes(q)).slice(0, 8);
  container.innerHTML = results.length
    ? results.map(item =>
        `<button class="suggestion" data-link="${item.page}" data-section="${item.section || ""}">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${item.type} • ${escapeHtml(item.desc)}</span>
        </button>`).join("")
    : `<div class="suggestion"><strong>No matches found</strong><span>Try "writing", "band scores", "downloads", or "speaking".</span></div>`;
  container.classList.add("visible");
}

/* ── Navigation ── */
function navigate(page, section = "") {
  $$(".page").forEach(p => p.classList.remove("active"));
  const pageEl = $(`#page-${page}`);
  if (!pageEl) return navigate("home");
  pageEl.classList.add("active");
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.link === page));
  if (page === "information") renderInfo(section || "test-types");
  if (page === "skills") renderSkills(section || "listening");
  if (page === "downloads") renderDownloadFilters("All");
  if (page === "forum") renderForumFilters("All");
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (location.hash !== `#${page}${section ? ":" + section : ""}`)
    history.replaceState(null, "", `#${page}${section ? ":" + section : ""}`);
}

function closeMobileMenu() {
  $("#mobilePanel").classList.remove("active");
  $("#hamburger").setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

/* ── Events ── */
function initEvents() {
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-link]");
    if (link) { event.preventDefault(); navigate(link.dataset.link, link.dataset.section || ""); return; }

    const infoButton = event.target.closest("[data-info-section]");
    if (infoButton) {
      renderInfo(infoButton.dataset.infoSection);
      history.replaceState(null, "", `#information:${infoButton.dataset.infoSection}`);
      return;
    }

    const skillButton = event.target.closest("[data-skill-section]");
    if (skillButton) {
      renderSkills(skillButton.dataset.skillSection);
      history.replaceState(null, "", `#skills:${skillButton.dataset.skillSection}`);
      return;
    }

    const filter = event.target.closest("[data-download-filter]");
    if (filter) { renderDownloadFilters(filter.dataset.downloadFilter); return; }

    const forumFilter = event.target.closest("[data-forum-filter]");
    if (forumFilter) { renderForumFilters(forumFilter.dataset.forumFilter); return; }

    const toastButton = event.target.closest("[data-toast]");
    if (toastButton) { toast(toastButton.dataset.toast); return; }

    const accordionButton = event.target.closest(".accordion-trigger");
    if (accordionButton) { accordionButton.closest(".accordion").classList.toggle("open"); return; }
  });

  $("#hamburger").addEventListener("click", () => {
    const panel = $("#mobilePanel");
    const isOpen = panel.classList.toggle("active");
    $("#hamburger").setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });

  $("#mobileSearchButton").addEventListener("click", () => {
    $("#mobilePanel").classList.add("active");
    $("#hamburger").setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    setTimeout(() => $("#mobileSearchInput").focus(), 50);
  });

  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("ieltsBilginTheme", next);
    $("#themeToggle").textContent = next === "dark" ? "☀" : "☾";
  });

  [["#searchInput", "#suggestions"], ["#mobileSearchInput", "#mobileSuggestions"]].forEach(([inputSel, boxSel]) => {
    const input = $(inputSel);
    const box = $(boxSel);
    input.addEventListener("input", () => showSuggestions(input, box));
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && box.querySelector(".suggestion[data-link]")) box.querySelector(".suggestion[data-link]").click();
      if (e.key === "Escape") box.classList.remove("visible");
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrap")) $$(".suggestions").forEach(s => s.classList.remove("visible"));
  });

  $("#postImage").addEventListener("change", event => {
    const file = event.target.files[0];
    const preview = $("#imagePreview");
    if (!file) { preview.style.display = "none"; preview.src = ""; return; }
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.style.display = "block"; };
    reader.readAsDataURL(file);
  });

  $("#postForm").addEventListener("submit", event => {
    event.preventDefault();
    const posts = getPosts();
    posts.unshift({
      id: crypto.randomUUID(),
      author: $("#authorName").value.trim(),
      title: $("#postTitle").value.trim(),
      category: $("#postCategory").value,
      body: $("#postBody").value.trim(),
      image: $("#imagePreview").src && $("#imagePreview").style.display !== "none" ? $("#imagePreview").src : "",
      date: new Date().toISOString(),
      comments: []
    });
    savePosts(posts);
    event.target.reset();
    $("#imagePreview").style.display = "none";
    renderForumFilters("All");
    toast("Your IELTS experience has been published.");
  });

  $("#forumPosts").addEventListener("submit", event => {
    const postEl = event.target.closest("[data-post-id]");
    if (!postEl) return;
    event.preventDefault();
    const posts = getPosts();
    const post = posts.find(p => p.id === postEl.dataset.postId);
    const input = event.target.querySelector("input");
    if (!post || !input.value.trim()) return;
    if (event.target.classList.contains("comment-form")) {
      post.comments.push({ id: crypto.randomUUID(), author: "Guest", text: input.value.trim(), replies: [] });
    }
    if (event.target.classList.contains("reply-form")) {
      const comment = post.comments.find(c => c.id === event.target.dataset.commentId);
      if (comment) comment.replies.push({ id: crypto.randomUUID(), author: "Guest", text: input.value.trim() });
    }
    savePosts(posts);
    renderForumFilters($("#forumFilters .active")?.dataset.forumFilter || "All");
  });
}

/* ── Init ── */
function loadFromHash() {
  const hash = location.hash.replace("#", "") || "home";
  const [page, section] = hash.split(":");
  navigate(page, section || "");
}

async function init() {
  await loadData();

  const savedTheme = localStorage.getItem("ieltsBilginTheme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $("#themeToggle").textContent = document.documentElement.dataset.theme === "dark" ? "☀" : "☾";

  renderHome();
  renderInfo();
  renderSkills();
  renderExams();
  renderDownloadFilters();
  renderForumForm();
  renderForumFilters();
  buildSearchIndex();
  initEvents();
  loadFromHash();
}

init();
