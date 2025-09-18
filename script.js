const API_URL =
  "https://script.google.com/macros/s/AKfycbzu77QDCDC8lrfCfcEs7L4Ri9LAR559Ee0xe7mUts6XRs_v_Ie-ErQ9JchOzhjBsePGFQ/exec";
let currentUser = null;
let ecoTrends = {}; // { hashtag: count }


// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  // Show page function
  function showPage(pageId) {
    document.querySelectorAll(".page-container").forEach((page) => {
      page.classList.remove("active");
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add("active");
      window.scrollTo(0, 0);

      // Fire custom event
      document.dispatchEvent(
        new CustomEvent("pageChanged", { detail: { pageId } })
      );

      // Page-specific loading
      if (pageId === "social-feed-page") loadPosts();
      if (pageId === "events-page") loadEvents();
    }
  }

  // Make showPage globally available
  window.showPage = showPage;

  // Auth button events
  document.querySelectorAll(".auth-btn.login").forEach((btn) => {
    btn.addEventListener("click", () => showPage("login-page"));
  });
  document.querySelectorAll(".auth-btn.register").forEach((btn) => {
    btn.addEventListener("click", () => showPage("register-page"));
  });

  // Nav events
  document.querySelectorAll(".nav-icon").forEach((icon) => {
    icon.addEventListener("click", (e) => {
      const target = e.currentTarget.getAttribute("data-target");
      if (target) showPage(target);
    });
  });

  // Init page
  showPage("landing-page");

  // Restore user session
  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateLoginState();
    updateProfileData();
  }

  // Avatar preview update
  const avatarInput = document.getElementById("avatar-url");
  if (avatarInput) {
    avatarInput.addEventListener("input", function () {
      document.getElementById("avatar-preview").src = this.value;
    });
  }
});

// ------------------ POSTS ------------------

async function createPost() {
  if (!currentUser) {
    alert("Please login to create a post");
    return;
  }

  const content = document.getElementById("post-content").value.trim();
  if (!content) {
    alert("Please write something before posting");
    return;
  }

  try {
    const payload = {
      action: "createPost",
      user_id: currentUser.id,
      content,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (data.success) {
      addPostToFeed({
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        content,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
      });

      document.getElementById("post-content").value = "";

      // ✅ Log activity
      logActivity("post", content);
    } else {
      alert("Failed to post: " + data.message);
    }
  } catch (error) {
    alert("Error creating post: " + error.message);
  }
}


function addPostToFeed(post) {
  const postsContainer = document.getElementById("posts-container");
  const postEl = document.createElement("div");
  postEl.className = "post"; // ✅ match your CSS

  postEl.innerHTML = `
    <div class="post-user">
      <img src="${post.userAvatar || "default-avatar.png"}" class="post-avatar">
      <div class="post-user-info">
        <h3>${post.userName}</h3>
        <p class="timestamp">${new Date(post.timestamp).toLocaleString()}</p>
      </div>
    </div>

    <p class="post-content">${post.content}</p>

    <div class="post-stats">
      <span>${post.likes || 0} Likes</span>
      <span>${post.comments?.length || 0} Comments</span>
    </div>

    <div class="post-actions">
      <div class="post-action like-btn" data-id="${post.id}">
        <i class="fas fa-heart"></i> Like
      </div>
      <div class="post-action comment-toggle" data-id="${post.id}">
        <i class="fas fa-comment"></i> Comment
      </div>
    </div>

    <div class="comments-section hidden" id="comments-${post.id}">
      <div class="comments-list">
        ${(post.comments || [])
          .map(
            (c) =>
              `<div class="comment"><strong>${c.user}:</strong> ${c.text}</div>`
          )
          .join("")}
      </div>
      <input type="text" placeholder="Write a comment..." class="comment-input" data-id="${
        post.id
      }">
    </div>
  `;

  postsContainer.prepend(postEl);
  setupPostInteractions(postEl);
}



async function loadPosts() {
  const postsContainer = document.getElementById("posts-container");
  postsContainer.innerHTML = "<p>Loading posts...</p>";
  ecoTrends = {}; // reset

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getPosts" }),
    });
    const data = await response.json();

    postsContainer.innerHTML = "";

    if (data.success && data.posts.length > 0) {
      data.posts.forEach((post) => {
        addPostToFeed(post);

        if (post.hashtags) {
          post.hashtags.forEach((tag) => {
            ecoTrends[tag] = (ecoTrends[tag] || 0) + 1;
          });
        }
      });
      renderEcoTrends();
    } else {
      postsContainer.innerHTML = "<p>No posts yet. Be the first to post!</p>";
    }
  } catch (err) {
    console.error("Feed load error:", err);
    postsContainer.innerHTML = "<p>Failed to load posts.</p>";
  }
}


function setupPostInteractions(postEl) {
  // Like
  postEl.querySelector(".like-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    let count = parseInt(btn.textContent.replace("❤️", "").trim()) || 0;
    count++;
    btn.textContent = `❤️ ${count}`;
    // TODO: send to backend
  });

  // Toggle comments
  postEl.querySelector(".comment-toggle").addEventListener("click", (e) => {
    const postId = e.currentTarget.dataset.id;
    document.getElementById(`comments-${postId}`).classList.toggle("hidden");
  });

  // Add comment
  postEl
    .querySelector(".comment-input")
    .addEventListener("keypress", async (e) => {
      if (e.key === "Enter" && e.target.value.trim() !== "") {
        const postId = e.target.dataset.id;
        const newComment = {
          user: currentUser?.email || "Guest",
          text: e.target.value,
        };
        const list = e.target.previousElementSibling;
        list.innerHTML += `<div class="comment"><strong>${newComment.user}:</strong> ${newComment.text}</div>`;
        e.target.value = "";
        // TODO: send to backend
      }
    });
}

function extractHashtags(text) {
  const regex = /#(\w+)/g; // matches # followed by word chars, no spaces
  let matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push("#" + match[1].toLowerCase()); // normalize to lowercase
  }
  return matches;
}

function renderEcoTrends() {
  const trendsContainer = document.getElementById("eco-trends");
  trendsContainer.innerHTML = "";

  const sorted = Object.entries(ecoTrends).sort((a, b) => b[1] - a[1]); // sort by count desc

  if (sorted.length === 0) {
    trendsContainer.innerHTML = "<p>No trends yet.</p>";
    return;
  }

  sorted.forEach(([tag, count]) => {
    const item = document.createElement("div");
    item.className = "trend-item";
    item.innerHTML = `${tag} <span class="trend-count">(${count})</span>`;
    trendsContainer.appendChild(item);
  });
}


// ------------------ SEARCH ------------------

const globalSearchInput = document.getElementById("global-search");

if (globalSearchInput) {
  globalSearchInput.addEventListener("keypress", async function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // stop page reload

      const query = e.target.value.trim();
      if (query.length < 2) return;

      // Always go to results page
      showPage("search-results-page");
      const resultsContainer = document.getElementById("search-results-list");
      resultsContainer.innerHTML = "<p>Searching...</p>";

      try {
        // Call backend
        const response = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({ action: "search", query }),
        });
        const data = await response.json();

        resultsContainer.innerHTML = "";

        if (data.success && data.results.length > 0) {
          data.results.forEach((item) => {
            const card = document.createElement("div");
            card.className = "result-card";
            card.innerHTML = `
              <h3>${item.title || "Untitled"}</h3>
              <p>${item.description || ""}</p>
            `;
            resultsContainer.appendChild(card);
          });
        } else {
          // Mock fallback (useful if Apps Script isn’t ready)
          const fallback = [
            { title: "Campus Tree Planting", description: "Join us in planting trees around BPSU Main." },
            { title: "Plastic Recycling Drive", description: "Bring your plastics to the student center this Friday." }
          ];
          fallback.forEach(item => {
            const card = document.createElement("div");
            card.className = "result-card";
            card.innerHTML = `
              <h3>${item.title}</h3>
              <p>${item.description}</p>
            `;
            resultsContainer.appendChild(card);
          });
        }
      } catch (err) {
        console.error("Search error:", err);
        resultsContainer.innerHTML = "<p>Error performing search.</p>";
      }
    }
  });
}



// ------------------ STATS ------------------

async function loadStats() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getStats" }),
    });
    const data = await response.json();

    if (data.success) {
      document.getElementById("trees-count").textContent =
        data.trees.toLocaleString();
      document.getElementById("waste-count").textContent =
        data.waste.toLocaleString() + " kg";
      document.getElementById("carbon-count").textContent =
        data.carbon.toLocaleString() + " kg";

      animateCounter(document.getElementById("tree-counter"), data.trees);

      document.getElementById("trees-fill").style.width =
        Math.min((data.trees / data.goals.trees) * 100, 100) + "%";
      document.getElementById("waste-fill").style.width =
        Math.min((data.waste / data.goals.waste) * 100, 100) + "%";
      document.getElementById("carbon-fill").style.width =
        Math.min((data.carbon / data.goals.carbon) * 100, 100) + "%";
    }
  } catch (err) {
    console.error("Stats error:", err);
  }
}

function animateCounter(el, target) {
  let start = 0;
  const duration = 1000;
  const step = Math.max(Math.floor(duration / target), 1);
  const timer = setInterval(() => {
    start++;
    el.textContent = start.toLocaleString();
    if (start >= target) clearInterval(timer);
  }, step);
}
// ------------------ PROFILE STATS ------------------
function updateProfileStats() {
  if (!currentUser) return;

  // Posts = number of 'post' activities
  const posts = userActivity.filter((a) => a.action === "post").length;

  // Events = number of 'event-join' activities
  const events = userActivity.filter((a) => a.action === "event-join").length;

  // Trees = placeholder (can be tied to events/tree logs later)
  const trees = userActivity.filter((a) => a.action === "tree-log").length;

  document.getElementById("profile-posts").textContent = posts;
  document.querySelector(
    "#profile-page .stat-large:nth-child(2) .number"
  ).textContent = events;
  document.querySelector(
    "#profile-page .stat-large:nth-child(3) .number"
  ).textContent = trees;
}
// Initialize stats if missing
function initUserStats() {
  if (!currentUser.stats) {
    currentUser.stats = { posts: 0, events: 0, trees: 0 };
  }
}

// Update the profile stats UI
function updateProfileStats() {
  if (!currentUser || !currentUser.stats) return;

  document.getElementById("profile-posts-count").textContent =
    currentUser.stats.posts || 0;
  document.getElementById("profile-events-count").textContent =
    currentUser.stats.events || 0;
  document.getElementById("profile-trees-count").textContent =
    currentUser.stats.trees || 0;
}

// ------------------ EVENTS ------------------

// View event details
function viewEventDetails(eventId) {
  // Store event ID for detail page
  sessionStorage.setItem("currentEventId", eventId);
  showPage("event-detail-page");
  loadEventDetails();
}

function backToEvents() {
  showPage("events-page");
}

// Join an event
async function joinEvent(button) {
  if (!currentUser) {
    alert("Please login to join events");
    showPage("login-page");
    return;
  }

  const eventId = button.getAttribute("data-event-id");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "joinEvent",
        event_id: eventId,
        user_id: currentUser.id,
      }),
    });

    const data = await response.json();

    if (data.success) {
      button.innerHTML = '<i class="fas fa-check"></i> Joined';
      button.classList.remove("join");
      button.classList.add("joined");
      alert("You have successfully joined this event!");

      // ✅ Log activity
      if (data.event && data.event.title) {
        logActivity("event-join", data.event.title);
      } else {
        logActivity("event-join", `Event ID: ${eventId}`);
      }
    } else {
      alert("Failed to join event: " + data.message);
    }
  } catch (error) {
    alert("Error joining event: " + error.message);
  }
}


// Load all events
async function loadEvents() {
  try {
    const response = await fetch(`${API_URL}?action=getEvents`);
    const data = await response.json();

    if (data.success) {
      renderEvents(data.events);
    } else {
      console.error("Failed to load events:", data.message);
    }
  } catch (error) {
    console.error("Error loading events:", error);
  }
}

// Render events list
function renderEvents(events) {
  const eventsGrid = document.querySelector(".events-grid");
  eventsGrid.innerHTML = "";

  events.forEach((event) => {
    const eventCard = document.createElement("div");
    eventCard.className = "event-card";
    eventCard.innerHTML = `
      <div class="event-image" 
           style="background-image: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), 
           url('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80');">
        <div class="event-status ${event.status}">
          ${event.status.charAt(0).toUpperCase() + event.status.slice(1)}
        </div>
      </div>
      <div class="event-details">
        <h3 class="event-title">${event.title}</h3>
        <div class="event-meta">
          <div class="event-meta-item">
            <i class="fas fa-calendar"></i> ${formatEventDate(event.date)}
          </div>
          <div class="event-meta-item">
            <i class="fas fa-clock"></i> 
            ${formatEventTime(event.start_time)} - ${formatEventTime(event.end_time)}
          </div>
          <div class="event-meta-item">
            <i class="fas fa-map-marker-alt"></i> ${event.location}
          </div>
        </div>
        <p class="event-description">${event.description}</p>
        <div class="event-stats">
          <div class="stat-item">
            <div class="stat-value">${event.tree_count}</div>
            <div class="stat-label">Trees</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${event.participants || 0}/${event.participant_limit}</div>
            <div class="stat-label">Participants</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${getDaysLeft(event.date)}</div>
            <div class="stat-label">Days Left</div>
          </div>
        </div>
        <div class="event-actions">
          <button class="event-btn join" data-event-id="${event.id}" onclick="joinEvent(this)">
            Join Event
          </button>
          <button class="event-btn view" onclick="viewEventDetails('${event.id}')">
            Details
          </button>
        </div>
      </div>
    `;
    eventsGrid.appendChild(eventCard);
  });
}

// Load single event details
async function loadEventDetails() {
  const eventId = sessionStorage.getItem("currentEventId");
  if (!eventId) return;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getEventDetails", event_id: eventId }),
    });
    const data = await response.json();

    if (data.success && data.event) {
      const event = data.event;

      // Banner
      document.querySelector("#event-detail-page .event-title-large").textContent = event.title;
      document.querySelector("#event-detail-page .event-subtitle").textContent =
        "Join us in making our campus greener, one tree at a time";

      const metaItems = document.querySelectorAll("#event-detail-page .event-header-meta .event-meta-item");
      metaItems[0].innerHTML = `<i class="fas fa-calendar"></i> ${formatEventDate(event.date)}`;
      metaItems[1].innerHTML = `<i class="fas fa-clock"></i> ${formatEventTime(event.start_time)} - ${formatEventTime(event.end_time)}`;
      metaItems[2].innerHTML = `<i class="fas fa-map-marker-alt"></i> ${event.location}`;

      // Description
      document.querySelector("#event-detail-page .event-description-detail").textContent = event.description;

      // Participants count (TODO: fetch participants list later)
      document.querySelector("#event-detail-page .participants-header h2").textContent =
        `Participants (${event.participants || 0}/${event.participant_limit})`;
    }
  } catch (error) {
    console.error("Error loading event details:", error);
  }
}

// Create event modal functions
function openCreateEventModal() {
  document.getElementById("create-event-modal").style.display = "flex";
}

function closeCreateEventModal() {
  document.getElementById("create-event-modal").style.display = "none";
}

// Create new event
async function createNewEvent() {
  const eventData = {
    action: "createEvent",
    title: document.getElementById("event-title").value,
    location: document.getElementById("event-location").value,
    date: document.getElementById("event-date").value,
    start_time: document.getElementById("start-time").value,
    end_time: document.getElementById("end-time").value,
    campus: document.getElementById("event-campus").value,
    tree_count: document.getElementById("tree-count").value,
    participant_limit: document.getElementById("participant-limit").value,
    description: document.getElementById("event-description").value,
    organizer_id: currentUser.id,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(eventData),
    });
    const data = await response.json();

    if (data.success) {
      alert("Event created successfully!");
      closeCreateEventModal();
      loadEvents(); // refresh list
    }
  } catch (error) {
    alert("Error creating event: " + error.message);
  }
}

// --------- HELPERS ---------

function formatEventDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(timeString) {
  if (!timeString) return "";

  // HH:mm format
  const parts = timeString.split(":");
  if (parts.length >= 2) {
    const [hour, minute] = parts.map(Number);
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return timeString;
}

function getDaysLeft(eventDate) {
  const today = new Date();
  const eventDay = new Date(eventDate);
  const diffTime = eventDay - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}






// ======================================================
// AUTH & PROFILE FUNCTIONS
// ======================================================

// Update login state UI
function updateLoginState() {
  if (currentUser) {
    document.getElementById("auth-buttons").style.display = "none";
    document.getElementById("user-menu").style.display = "flex";
    document.getElementById("header-avatar").src = currentUser.avatar;
    document.getElementById("post-user-avatar").src = currentUser.avatar;
  } else {
    document.getElementById("auth-buttons").style.display = "flex";
    document.getElementById("user-menu").style.display = "none";
  }
}

// Update profile data
function updateProfileData() {
  if (!currentUser) return;

  // Update all avatar images
  const avatars = document.querySelectorAll(
    ".user-avatar, .profile-avatar, #profile-avatar"
  );
  avatars.forEach((avatar) => {
    avatar.src = currentUser.avatar;
  });

  // Sidebar profile (social feed page)
  if (document.getElementById("profile-sidebar-name")) {
    document.getElementById("profile-sidebar-name").textContent = currentUser.name;
  }

  // Profile page large
  if (document.getElementById("profile-name-large")) {
    document.getElementById("profile-name-large").textContent = currentUser.name;
  }

  // Handles
  if (document.getElementById("profile-sidebar-handle")) {
    document.getElementById("profile-sidebar-handle").textContent = `@${currentUser.username}`;
  }
  if (document.getElementById("profile-handle-large")) {
    document.getElementById("profile-handle-large").textContent = `@${currentUser.username}`;
  }

  // Bios
  if (document.getElementById("profile-sidebar-bio")) {
    document.getElementById("profile-sidebar-bio").textContent = currentUser.bio;
  }
  if (document.getElementById("profile-bio-large")) {
    document.getElementById("profile-bio-large").textContent = currentUser.bio;
  }

  // Fill settings form
  fillSettingsForm();
}

// ======================================================
// LOGIN / REGISTER / LOGOUT
// ======================================================

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        username: email,
        password: password,
      }),
    });

    const data = await response.json();

    if (data.success) {
      currentUser = data.user;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      updateLoginState();
      updateProfileData();
      showPage("landing-page");
    } else {
      alert("Login failed: " + data.message);
    }
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function register() {
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const username = document.getElementById("reg-username").value;
  const password = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;

  if (!name || !email || !username || !password || !confirm) {
    alert("Please fill all fields");
    return;
  }
  if (password !== confirm) {
    alert("Passwords do not match");
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "register",
        name: name,
        email: email,
        username: username,
        password: password,
        avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
        department: "",
        bio: "New sustainability enthusiast",
      }),
    });

    const data = await response.json();

    if (data.success) {
      currentUser = {
        id: data.user.id,
        name,
        email,
        username,
        avatar: data.user.avatar,
        role: "student",
        department: "",
        bio: "New sustainability enthusiast",
      };

      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      updateLoginState();
      updateProfileData();
      showPage("landing-page");
      alert("Registration successful! Welcome to SEED");
    } else {
      alert("Registration failed: " + data.message);
    }
  } catch (error) {
    alert("Registration error: " + error.message);
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  updateLoginState();
  showPage("login-page");
}

// ======================================================
// SETTINGS
// ======================================================

function fillSettingsForm() {
  if (!currentUser) return;

  document.getElementById("display-name").value = currentUser.name;
  document.getElementById("username").value = currentUser.username;
  document.getElementById("email").value = currentUser.email;
  document.getElementById("bio").value = currentUser.bio;
  document.getElementById("avatar-url").value = currentUser.avatar;
}

async function saveSettings() {
  if (!currentUser) return;

  const payload = {
    action: "updateProfile",
    user_id: currentUser.id,
    name: document.getElementById("display-name").value,
    username: document.getElementById("username").value,
    email: document.getElementById("email").value,
    bio: document.getElementById("bio").value,
    avatar: document.getElementById("avatar-url").value,
    department: document.getElementById("department").value,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "cors",
    });

    const data = await response.json();

    if (data.success) {
      Object.assign(currentUser, payload);
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      updateProfileData();
      alert("Profile updated successfully!");
    } else {
      alert("Update failed: " + (data.message || "Unknown error"));
    }
  } catch (error) {
    console.error("Update error:", error);
    alert("Error updating profile: " + error.message);
  }
}

// ======================================================
// PROFILE TABS
// ======================================================

function switchTab(tabName) {
  // Update active tab
  document.querySelectorAll(".profile-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  event.target.classList.add("active");

  // Show active pane
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.remove("active");
  });
  document.getElementById(tabName + "-tab").classList.add("active");
}

// ======================================================
// PROFILE ACTIVITY LOG & STATS
// ======================================================

let userActivity = [];

// Increment a specific stat
function incrementUserStat(type) {
  if (!currentUser) return;
  initUserStats();

  if (type === "post") currentUser.stats.posts++;
  if (type === "event-join") currentUser.stats.events++;
  if (type === "tree-log") currentUser.stats.trees++;

  // Save in localStorage
  localStorage.setItem("currentUser", JSON.stringify(currentUser));

  // Update UI
  updateProfileStats();
}

// Initialize stats if missing
function initUserStats() {
  if (!currentUser.stats) {
    currentUser.stats = { posts: 0, events: 0, trees: 0 };
  }
}

// Update the profile stats UI
// Update the profile stats UI (profile page + sidebar card)
// Update the profile stats UI (profile page + sidebar card)
function updateProfileStats() {
  if (!currentUser) return;

  const stats = currentUser.stats || { posts: 0, events: 0, trees: 0 };

  // Profile page counters
  if (document.getElementById("profile-posts-count")) {
    document.getElementById("profile-posts-count").textContent = stats.posts;
  }
  if (document.getElementById("profile-events-count")) {
    document.getElementById("profile-events-count").textContent = stats.events;
  }
  if (document.getElementById("profile-trees-count")) {
    document.getElementById("profile-trees-count").textContent = stats.trees;
  }

  // Sidebar counters (social feed)
  if (document.getElementById("sidebar-posts-count")) {
    document.getElementById("sidebar-posts-count").textContent = stats.posts;
  }
  if (document.getElementById("sidebar-events-count")) {
    document.getElementById("sidebar-events-count").textContent = stats.events;
  }
  if (document.getElementById("sidebar-trees-count")) {
    document.getElementById("sidebar-trees-count").textContent = stats.trees;
  }
}



// Log activity and increment stats
function logActivity(action, details) {
  const activity = {
    action,   // "post" | "event-join" | "tree-log"
    details,  // description text
    timestamp: new Date().toISOString(),
  };

  userActivity.unshift(activity); // add to beginning
  renderActivity();

  // ✅ Update stats whenever we log an activity
  incrementUserStat(action);
}

// Render activity cards
function renderActivity() {
  const grid = document.getElementById("activity-grid");
  if (!grid) return;

  if (userActivity.length === 0) {
    grid.innerHTML = "<p>No activity yet. Start posting or join events!</p>";
    return;
  }

  grid.innerHTML = "";
  userActivity.forEach((act) => {
    const item = document.createElement("div");
    item.className = "activity-card";

    let icon, text;
    if (act.action === "post") {
      icon = "📝";
      text = `Posted: ${act.details}`;
    } else if (act.action === "event-join") {
      icon = "🌱";
      text = `Joined event: ${act.details}`;
    } else if (act.action === "tree-log") {
      icon = "🌳";
      text = `Logged a tree: ${act.details}`;
    } else {
      icon = "ℹ️";
      text = act.details;
    }

    item.innerHTML = `
      <div class="activity-entry">
        <span class="activity-icon">${icon}</span>
        <div>
          <p>${text}</p>
          <small>${new Date(act.timestamp).toLocaleString()}</small>
        </div>
      </div>
    `;
    grid.appendChild(item);
  });
}

// Fetch user stats (from Apps Script later, fallback to local)
async function fetchUserStats(userId) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getUserStats",
        user_id: userId,
      }),
    });

    const data = await response.json();

    if (data.success) {
      currentUser.stats = data.stats; // { posts, events, trees }
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      updateProfileStats();
    } else {
      console.warn("Failed to fetch stats:", data.message);
      // fallback if backend not ready
      if (!currentUser.stats) {
        currentUser.stats = { posts: 0, events: 0, trees: 0 };
      }
      updateProfileStats();
    }
  } catch (error) {
    console.error("Error fetching stats:", error);
    if (!currentUser.stats) {
      currentUser.stats = { posts: 0, events: 0, trees: 0 };
    }
    updateProfileStats();
  }
}


