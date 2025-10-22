const API_URL =
  "https://script.google.com/macros/s/AKfycbzwFAU4xbB5ierkntouCKDkz8ezsAD2Os-kGQ6x9vSxx63fPob8h64i7DpHV3XJrdp5bA/exec";
let currentUser = null;
let ecoTrends = {}; // { hashtag: count }
// Global event list for filtering
let allEvents = [];


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
      // Page-specific loading
      if (pageId === "social-feed-page") {
        loadPosts();
        loadEcoTrends(); // Add this line
      }
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
document.addEventListener("DOMContentLoaded", function () {
  // Get current and goal values
  const trees = 12157,
    treesGoal = 20000;
  const waste = 6252,
    wasteGoal = 20000;
  const carbon = 267454,
    carbonGoal = 500000;

  // Calculate percentages
  const treesPercent = (trees / treesGoal) * 100;
  const wastePercent = (waste / wasteGoal) * 100;
  const carbonPercent = (carbon / carbonGoal) * 100;

  // Apply to progress bars
  document.getElementById("trees-fill").style.width = treesPercent + "%";
  document.getElementById("waste-fill").style.width = wastePercent + "%";
  document.getElementById("carbon-fill").style.width = carbonPercent + "%";
});
// ===== Simple Demo Encryption (Base64) =====

function encryptPassword(password) {
  return btoa(unescape(encodeURIComponent(password))); // text → base64
}

function decryptPassword(encrypted) {
  try {
    return decodeURIComponent(escape(atob(encrypted))); // base64 → text
  } catch {
    return ""; // if decoding fails
  }
}

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
    const hashtags = extractHashtags(content);
    const payload = {
      action: "createPost",
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content,
      hashtags,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (data.success) {
      // Create new post with actual timestamp from server if available
      const newPost = {
        id: data.postId || Date.now().toString(), // Use server ID or fallback
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        content,
        timestamp: new Date().toISOString(), // Current time for new post
        likes: 0,
        comments: [],
      };

      addPostToFeed(newPost, true); // true = prepend to top

      document.getElementById("post-content").value = "";
      loadEcoTrends();
      // Log activity
      logActivity("post", content);
    } else {
      alert("Failed to post: " + data.message);
    }
  } catch (error) {
    alert("Error creating post: " + error.message);
  }
}

// Update UI to reflect user’s liked state correctly
function addPostToFeed(post, prepend = false) {
  const postsContainer = document.getElementById("posts-container");
  const postEl = document.createElement("div");
  postEl.className = "post";

  const processedPost = processPostData(post);
  const comments = processedPost.comments.filter(c => !c._meta && c.user && c.text);
  const userLiked = currentUser && processedPost.likers
    ? processedPost.likers.includes(currentUser.id)
    : false;

  postEl.innerHTML = `
    <div class="post-user">
      <img src="${processedPost.userAvatar || "https://randomuser.me/api/portraits/lego/1.jpg"}" class="post-avatar">
      <div class="post-user-info">
        <h3>${processedPost.userName}</h3>
        <p class="timestamp">${formatPostTimestamp(processedPost.timestamp)}</p>
      </div>
    </div>

    <p class="post-content">${processedPost.content}</p>

    <div class="post-stats">
      <span>${processedPost.likes} Likes</span>
      <span>${comments.length} Comments</span>
    </div>

    <div class="post-actions">
      <div class="post-action like-btn ${userLiked ? "liked" : ""}" data-id="${processedPost.id}">
        <i class="fas fa-heart"></i> ${userLiked ? "Liked" : "Like"}
      </div>
      <div class="post-action comment-toggle" data-id="${processedPost.id}">
        <i class="fas fa-comment"></i> Comment
      </div>
    </div>

    <div class="comments-section hidden" id="comments-${processedPost.id}">
      <div class="comments-list">
        ${comments.map(c => `<div class="comment"><strong>${c.user}:</strong> ${c.text}</div>`).join("")}
      </div>
      <input type="text" placeholder="Write a comment..." class="comment-input" data-id="${processedPost.id}">
    </div>
  `;

  if (prepend) postsContainer.prepend(postEl);
  else postsContainer.appendChild(postEl);

  setupPostInteractions(postEl);
}

// Refresh like buttons using local storage
function restoreLikedButtons() {
  const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
  likedPosts.forEach(id => {
    const btn = document.querySelector(`.like-btn[data-id="${id}"]`);
    if (btn) {
      btn.classList.add("liked");
      btn.innerHTML = '<i class="fas fa-heart"></i> Liked';
    }
  });
}

// Replace the current loadPosts function with this improved version
async function loadPosts() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getPosts" }),
    });
    const data = await response.json();

    const postsContainer = document.getElementById("posts-container");
    postsContainer.innerHTML = "";

    if (data.success && data.posts && data.posts.length > 0) {
      data.posts.forEach((post) => addPostToFeed(processPostData(post)));
      restoreLikedButtons(); // ✅ Restore state after rendering
    } else {
      postsContainer.innerHTML = "<p>No posts yet. Be the first to post!</p>";
    }
  } catch (error) {
    console.error("Error loading posts:", error);
    document.getElementById("posts-container").innerHTML =
      "<p>Error loading posts. Please check your connection.</p>";
  }
}

// Add this new function to properly process post data from backend
function processPostData(post) {
  // Ensure comments parsed correctly
  let comments = [];
  if (post.comments) {
    if (typeof post.comments === "string") {
      try {
        comments = JSON.parse(post.comments);
      } catch {
        comments = [];
      }
    } else if (Array.isArray(post.comments)) {
      comments = post.comments;
    }
  }

  // Extract likers from meta comment if present
  const likersMeta = comments.find((c) => c._meta === "likers");
  const likers = likersMeta?.list || [];

  // Normalize likes count
  let likes =
    typeof post.likes === "number" ? post.likes : parseInt(post.likes) || 0;
  if (likes === 0 && Array.isArray(likers)) likes = likers.length;

  // Attach normalized info
  return {
    ...post,
    comments,
    likes,
    likers, // <-- add this for local UI
  };
}

// Improved like function - update UI immediately without reloading all posts
async function likePost(button) {
  if (!currentUser) {
    alert("Please login to like posts");
    return;
  }

  const postId = button.getAttribute("data-id");
  const postEl = button.closest(".post");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "likePost",
        post_id: postId,
        user_id: currentUser.id,
        user_name: currentUser.name,
      }),
    });

    const data = await response.json();
    if (data.success) {
      const stats = postEl.querySelector(".post-stats span:first-child");
      const newCount = data.likes || (parseInt(stats.textContent) || 0) + 1;
      stats.textContent = `${newCount} Likes`;

      button.classList.add("liked");
      button.innerHTML = '<i class="fas fa-heart"></i> Liked';

      // Store liked post locally
      const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
      if (!likedPosts.includes(postId)) {
        likedPosts.push(postId);
        localStorage.setItem("likedPosts", JSON.stringify(likedPosts));
      }
    } else if (data.message === "Already liked") {
      button.classList.add("liked");
      button.innerHTML = '<i class="fas fa-heart"></i> Liked';
    }
  } catch (err) {
    console.error("Like error:", err);
    alert("Error liking post");
  }
}


// 🧩 NEW: Better date parsing specifically for sorting
function parseDateForSorting(value) {
  if (!value) return new Date(0);
  
  // If it's already a Date object
  if (value instanceof Date) return value;
  
  // Try direct parsing first
  const directDate = new Date(value);
  if (!isNaN(directDate)) return directDate;
  
  // Handle Google Sheets format (MM/DD/YYYY HH:MM:SS)
  if (typeof value === 'string') {
    // Try common formats
    const formats = [
      // MM/DD/YYYY HH:MM:SS
      /(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})/,
      // YYYY-MM-DD HH:MM:SS
      /(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})/,
      // DD/MM/YYYY HH:MM:SS (common in some regions)
      /(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})/,
    ];
    
    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        let year, month, day, hours, minutes, seconds;
        
        if (format.source.includes('YYYY-MM-DD')) {
          // YYYY-MM-DD format
          [_, year, month, day, hours, minutes, seconds] = match.map(Number);
        } else {
          // MM/DD/YYYY or DD/MM/YYYY format
          const [_, p1, p2, p3, h, m, s] = match.map(Number);
          
          // Determine if it's MM/DD/YYYY or DD/MM/YYYY
          if (p1 > 12) {
            // p1 is day (DD/MM/YYYY)
            day = p1;
            month = p2 - 1;
            year = p3;
          } else if (p2 > 12) {
            // p2 is day (MM/DD/YYYY)
            month = p1 - 1;
            day = p2;
            year = p3;
          } else {
            // Ambiguous, assume MM/DD/YYYY (US format)
            month = p1 - 1;
            day = p2;
            year = p3;
          }
          
          hours = h || 0;
          minutes = m || 0;
          seconds = s || 0;
        }
        
        const parsedDate = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(parsedDate)) return parsedDate;
      }
    }
    
    // Try simple date string
    const simpleDate = new Date(value.split(' ')[0]);
    if (!isNaN(simpleDate)) return simpleDate;
  }
  
  // Fallback to current date
  console.warn("Could not parse date, using current date:", value);
  return new Date();
}

// 🧩 NEW: Better timestamp display
function formatPostTimestamp(timestamp) {
  if (!timestamp) return "Recently";

  let date;

  // Handle different timestamp formats
  if (typeof timestamp === "string") {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  // If date is invalid, return fallback
  if (isNaN(date.getTime())) {
    return "Recently";
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: diffDays < 365 ? undefined : "numeric",
  });
}

// 🧠 Enhanced date parsing helper
function parseDate(value) {
  if (!value) return new Date(0);

  // If it's already a Date object or valid date string
  if (value instanceof Date) return value;
  if (!isNaN(new Date(value))) return new Date(value);

  // Handle Google Sheets timestamp format (MM/DD/YYYY HH:MM:SS)
  if (typeof value === "string") {
    // Try common date formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})/, // MM/DD/YYYY HH:MM:SS
      /(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2}):(\d{2})/, // YYYY-MM-DD HH:MM:SS
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        if (match.length >= 6) {
          // Full datetime
          const [_, month, day, year, hour, minute, second] = match;
          return new Date(
            year,
            month - 1,
            day,
            hour || 0,
            minute || 0,
            second || 0
          );
        } else if (match.length >= 4) {
          // Date only
          const [_, month, day, year] = match;
          return new Date(year, month - 1, day);
        }
      }
    }
  }

  // Fallback to current date if parsing fails
  console.warn("Could not parse date:", value);
  return new Date();
}

// 🧠 Helper: make timestamps always sortable
function parseDate(value) {
  if (!value) return new Date(0);
  if (typeof value === "string") {
    // Try to handle formats like "10/12/2025 22:24:54"
    const parts = value.split(/[\s/:]+/);
    if (parts.length >= 5) {
      // Assuming MM/DD/YYYY or DD/MM/YYYY — swap if needed
      const [p1, p2, p3, h, m] = parts.map(Number);
      // if month > 12, it's actually DD/MM/YYYY (Philippines format)
      const [day, month, year] = p1 > 12 ? [p1, p2, p3] : [p2, p1, p3];
      return new Date(year, month - 1, day, h || 0, m || 0);
    }
  }
  return new Date(value);
}

async function likePost(button) {
  if (!currentUser) {
    alert("Please login to like posts");
    return;
  }

  const postId = button.getAttribute("data-id");
  const postEl = button.closest(".post");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "likePost",
        post_id: postId,
        user_id: currentUser.id,
        user_name: currentUser.name,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Update the like count in the UI
      const stats = postEl.querySelector(".post-stats span:first-child");
      const currentLikes = parseInt(stats.textContent) || 0;
      stats.textContent = `${currentLikes + 1} Likes`;

      // Update button state
      button.classList.add("liked");
      button.innerHTML = '<i class="fas fa-heart"></i> Liked';

      // DON'T reload all posts - this preserves the timestamp
    } else if (data.message === "Already liked") {
      // Update button to show already liked state
      button.classList.add("liked");
      button.innerHTML = '<i class="fas fa-heart"></i> Liked';
      alert("You already liked this post!");
    } else {
      console.warn("Like failed:", data.message);
    }
  } catch (err) {
    console.error("Like error:", err);
    alert("Error liking post");
  }
}

function setupPostInteractions(postEl) {
  // LIKE HANDLER
  const likeBtn = postEl.querySelector(".like-btn");
  if (likeBtn) {
    likeBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await likePost(e.currentTarget);
    });
  }

  // TOGGLE COMMENT BOX
  const commentToggle = postEl.querySelector(".comment-toggle");
  if (commentToggle) {
    commentToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const postId = e.currentTarget.dataset.id;
      const commentsSection = document.getElementById(`comments-${postId}`);
      if (commentsSection) {
        commentsSection.classList.toggle("hidden");
      }
    });
  }

  // ENHANCED COMMENT HANDLER
  const commentInput = postEl.querySelector(".comment-input");
  if (commentInput) {
    commentInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter" && e.target.value.trim() !== "") {
        e.preventDefault();
        const postId = e.target.dataset.id;
        const text = e.target.value.trim();

        if (!currentUser) {
          alert("Please login to comment");
          return;
        }

        const postEl = e.target.closest(".post");
        const list = e.target.previousElementSibling;

        try {
          const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
              action: "commentPost",
              post_id: postId,
              user_id: currentUser.id,
              user_name: currentUser.name,
              text: text,
            }),
          });

          const data = await response.json();

          if (data.success) {
            // Add to UI instantly
            const commentHTML = `<div class="comment"><strong>${currentUser.name}:</strong> ${text}</div>`;
            if (list) {
              list.insertAdjacentHTML("beforeend", commentHTML);
            }
            e.target.value = "";

            // Update comment count immediately
            const stats = postEl.querySelector(".post-stats span:nth-child(2)");
            const currentCount = parseInt(stats.textContent) || 0;
            stats.textContent = `${currentCount + 1} Comments`;

            // Refresh the post state to ensure backend data is reflected
            setTimeout(() => {
              refreshPostState(postId);
            }, 500);
          } else {
            alert("Failed to add comment: " + data.message);
          }
        } catch (err) {
          console.error("Comment error:", err);
          alert("Error adding comment");
        }
      }
    });
  }
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

async function loadEcoTrends() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getEcoTrends" }),
    });

    const data = await response.json();

    if (data.success && data.trends) {
      renderTrends(data.trends);
    } else {
      console.error("Failed to fetch trends:", data.message);
      // Show empty state
      renderTrends([]);
    }
  } catch (err) {
    console.error("Error loading eco trends:", err);
    // Show empty state on error
    renderTrends([]);
  }
}

function renderTrends(trends) {
  const container = document.getElementById("eco-trends");
  if (!container) return;

  container.innerHTML = "";

  if (!trends || trends.length === 0) {
    container.innerHTML = `<p class="no-trends">No trending hashtags yet 🌱</p>`;
    return;
  }

  trends.forEach((trend, index) => {
    const trendItem = document.createElement("div");
    trendItem.className = "trend-item";

    trendItem.innerHTML = `
      <div class="trend-rank">♡${index + 1}</div>
      <div class="trend-info">
        <span class="trend-tag">${trend.hashtag}</span>
        <span class="trend-count">${trend.count} posts</span>
      </div>
    `;

    container.appendChild(trendItem);
  });
}

function updateLocalPostLikes(postId, newLikeCount, userId) {
  // This would ideally update a local posts array if you maintain one
  // For now, we'll trigger a refresh of the affected post
  setTimeout(() => {
    refreshPostState(postId);
  }, 500);
}
function updatePostUI(postId, updatedPost) {
  const postEl = document
    .querySelector(`.like-btn[data-id="${postId}"]`)
    ?.closest(".post");
  if (!postEl) return;

  const processedPost = processPostData(updatedPost);
  const comments = processedPost.comments;
  const realComments = comments.filter((c) => !c._meta && c.user && c.text);
  const likersMeta = comments.find((c) => c._meta === "likers");
  const likers =
    likersMeta && Array.isArray(likersMeta.list) ? likersMeta.list : [];
  const userLiked = currentUser ? likers.includes(currentUser.id) : false;

  // Update like count
  const likeStats = postEl.querySelector(".post-stats span:first-child");
  if (likeStats) {
    likeStats.textContent = `${processedPost.likes} Likes`;
  }

  // Update comment count
  const commentStats = postEl.querySelector(".post-stats span:nth-child(2)");
  if (commentStats) {
    commentStats.textContent = `${realComments.length} Comments`;
  }

  // Update like button
  const likeBtn = postEl.querySelector(".like-btn");
  if (likeBtn) {
    likeBtn.classList.toggle("liked", userLiked);
    likeBtn.innerHTML = `<i class="fas fa-heart"></i> ${
      userLiked ? "Liked" : "Like"
    }`;
  }

  // Update comments list
  const commentsList = postEl.querySelector(".comments-list");
  if (commentsList) {
    commentsList.innerHTML = realComments
      .map(
        (comment) => `
        <div class="comment">
          <strong>${comment.user}:</strong> ${comment.text}
        </div>
      `
      )
      .join("");
  }
}
// Enhanced refreshPostState function
async function refreshPostState(postId) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getPosts" }),
    });
    const data = await response.json();

    if (data.success && data.posts) {
      const updatedPost = data.posts.find((p) => p.id === postId);
      if (updatedPost) {
        updatePostUI(postId, updatedPost);
      }
    }
  } catch (error) {
    console.error("Error refreshing post state:", error);
  }
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
          body: JSON.stringify({ action: "globalSearch", query }),
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
// Enhanced join event function for main events page
async function joinEvent(button) {
  if (!currentUser) {
    alert("Please login to join events");
    showPage("login-page");
    return;
  }

  const eventId = button.getAttribute("data-event-id");

  // Prevent re-clicking
  if (button.classList.contains("joined") || button.disabled) return;

  try {
    // Update button state immediately for better UX
    button.disabled = true;
    button.textContent = "Joining...";
    button.classList.add("joining");

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "joinEvent",
        event_id: eventId,
        user_id: currentUser.id,
        user_name: currentUser.name,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Update button state
      button.textContent = "Joined";
      button.disabled = true;
      button.classList.remove("joining");
      button.classList.add("joined");

      // Show success message
      showToast("Successfully joined the event!");

      // Update participant count in the event card immediately
      updateEventCardParticipantCount(eventId, true);

      // Refresh events to get updated data from backend
      setTimeout(() => {
        loadEvents();
      }, 1000);

      logActivity("event-join", `Event ID: ${eventId}`);
    } else {
      alert(data.message || "Failed to join event.");
      // Reset button state on failure
      button.disabled = false;
      button.textContent = "Join Event";
      button.classList.remove("joining");
    }
  } catch (error) {
    alert("Error joining event: " + error.message);
    // Reset button state on error
    button.disabled = false;
    button.textContent = "Join Event";
    button.classList.remove("joining");
  }
}

// Function to update participant count in event card
function updateEventCardParticipantCount(eventId, increment = true) {
  const eventCard = document.querySelector(`[data-event-id="${eventId}"]`)?.closest('.event-card');
  if (!eventCard) return;

  const participantStat = eventCard.querySelector('.stat-item:nth-child(2) .stat-value');
  if (participantStat) {
    const [current, limit] = participantStat.textContent.split('/').map(Number);
    const newCurrent = increment ? current + 1 : Math.max(0, current - 1);
    participantStat.textContent = `${newCurrent}/${limit}`;
  }
}

// Load all events
async function loadEvents() {
  try {
    console.log("Loading events...");
    const payload = { action: "getEvents" };

    // Include user ID to get participation status
    if (currentUser) {
      payload.user_id = currentUser.id;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Events response:", data);

    if (data.success && data.events) {
      allEvents = data.events;
      console.log("Events loaded:", allEvents);
      renderEvents(allEvents);
      attachEventFilters();
    } else {
      console.error("Failed to load events:", data.message);
      // Show fallback events for testing
      showFallbackEvents();
    }
  } catch (error) {
    console.error("Error loading events:", error);
    // Show fallback events on error
    showFallbackEvents();
  }
}

// Fallback function to show sample events if backend fails
function showFallbackEvents() {
  const fallbackEvents = [
    {
      id: "fallback-1",
      title: "Campus Tree Planting Day",
      location: "Main Campus Green",
      date: "2025-04-15",
      start_time: "09:00",
      end_time: "12:00",
      campus: "main",
      tree_count: 50,
      participant_limit: 30,
      description:
        "Join us for a morning of tree planting around the main campus.",
      status: "upcoming",
      participants: 15,
      user_joined: false, // Add this field
    },
    {
      id: "fallback-2",
      title: "Eco Club Planting Event",
      location: "North Campus Park",
      date: "2025-04-20",
      start_time: "10:00",
      end_time: "14:00",
      campus: "north",
      tree_count: 100,
      participant_limit: 50,
      description: "Eco Club's monthly tree planting initiative.",
      status: "upcoming",
      participants: 25,
      user_joined: false, // Add this field
    },
  ];

  allEvents = fallbackEvents;
  renderEvents(fallbackEvents);
}


// Render events list
function renderEvents(events) {
  const eventsGrid = document.getElementById("events-grid");
  if (!eventsGrid) {
    console.error("Events grid element not found!");
    return;
  }

  eventsGrid.innerHTML = "";

  if (!events || events.length === 0) {
    eventsGrid.innerHTML =
      "<p class='no-events'>No events found. Create the first one!</p>";
    return;
  }

  events.forEach((event) => {
    const eventCard = document.createElement("div");
    eventCard.className = "event-card";

    // Use safe property access with fallbacks
    const title = event.title || "Untitled Event";
    const location = event.location || "Location TBD";
    const date = event.date || "Date TBD";
    const startTime = event.start_time || "TBD";
    const endTime = event.end_time || "TBD";
    const treeCount = event.tree_count || event.tree_count || 0;
    const participantLimit =
      event.participant_limit || event.participant_limit || 0;
    const participants = event.participants || event.participant_count || 0;
    const description = event.description || "No description available.";
    const status = event.status || "upcoming";
    const campus = event.campus || "main";

    // Check if current user has joined this event
    const hasJoined = checkIfUserJoinedEvent(event);

    eventCard.innerHTML = `
      <div class="event-image" 
           style="background-image: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), 
           url('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80');">
        <div class="event-status ${status}">
          ${status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>
      <div class="event-details">
        <h3 class="event-title">${title}</h3>
        <div class="event-meta">
          <div class="event-meta-item">
            <i class="fas fa-calendar"></i> ${formatEventDate(date)}
          </div>
          <div class="event-meta-item">
            <i class="fas fa-clock"></i> 
            ${formatEventTime(startTime)} - ${formatEventTime(endTime)}
          </div>
          <div class="event-meta-item">
            <i class="fas fa-map-marker-alt"></i> ${location}
          </div>
        </div>
        <p class="event-description">${description}</p>
        <div class="event-stats">
          <div class="stat-item">
            <div class="stat-value">${treeCount}</div>
            <div class="stat-label">Trees</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${participants}/${participantLimit}</div>
            <div class="stat-label">Participants</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${getDaysLeft(date)}</div>
            <div class="stat-label">Days Left</div>
          </div>
        </div>
        <div class="event-actions">
          <button class="event-btn ${hasJoined ? "joined" : "join"} ${
      participants >= participantLimit && participantLimit > 0 ? "disabled" : ""
    }" 
                  data-event-id="${event.id}" 
                  onclick="joinEvent(this)"
                  ${
                    hasJoined ||
                    (participants >= participantLimit && participantLimit > 0)
                      ? "disabled"
                      : ""
                  }>
            ${
              hasJoined
                ? "Joined"
                : participants >= participantLimit && participantLimit > 0
                ? "Event Full"
                : "Join Event"
            }
          </button>
          <button class="event-btn view" onclick="viewEventDetails('${
            event.id
          }')">
            Details
          </button>
        </div>
      </div>
    `;
    eventsGrid.appendChild(eventCard);
  });
}

// Function to check if current user has joined an event
function checkIfUserJoinedEvent(event) {
  if (!currentUser) return false;

  // Check if event has participants array and current user is in it
  if (event.participants && Array.isArray(event.participants)) {
    return event.participants.some(
      (participant) =>
        participant.id === currentUser.id ||
        participant.user_id === currentUser.id
    );
  }

  // Fallback: Check if we have this information in the event object
  return event.user_joined || false;
}

// Load single event details
// Load event details with complete information
// Enhanced loadEventDetails function
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
      console.log("Event details received:", event);
      
      // Update banner section
      document.getElementById("event-title-large").textContent = event.title || "Untitled Event";
      
      // Update meta information with proper formatting
      document.getElementById("event-date-text").textContent = formatEventDate(event.date);
      document.getElementById("event-time-text").textContent = 
        `${safeFormatTime(event.start_time)} - ${safeFormatTime(event.end_time)}`;
      document.getElementById("event-location-text").textContent = event.location || "Location TBD";
      document.getElementById("event-campus-text").textContent = 
        formatCampusName(event.campus);

      // Update description
      document.getElementById("event-description-detail").textContent = 
        event.description || "No description available.";

      // Update event details grid
      const treeCount = event.tree_count || 0;
      document.getElementById("event-tree-count").textContent = treeCount;
      
      const participantCount = event.participants ? event.participants.length : 0;
      const participantLimit = event.participant_limit || 0;
      document.getElementById("event-participant-count").textContent = 
        `${participantCount}/${participantLimit}`;
      
      // Calculate environmental impact
      const co2Reduction = treeCount * 48; // Average kg CO2 per tree annually
      document.getElementById("event-impact").textContent = 
        `${co2Reduction} kg CO₂ reduction annually`;
      
      document.getElementById("event-status").textContent = 
        formatStatus(event.status);

      // Update schedule with safe time formatting
      document.getElementById("event-start-time").textContent = safeFormatTime(event.start_time);
      document.getElementById("event-end-time").textContent = safeFormatTime(event.end_time);

      // Update progress bar
      updateProgressBar(participantCount, participantLimit);

      // Update quick stats
      document.getElementById("event-duration").textContent = calculateEventDuration(event.start_time, event.end_time);
      document.getElementById("event-days-left").textContent = getDaysLeft(event.date);
      document.getElementById("event-campus-name").textContent = formatCampusName(event.campus);

      // Update organizer information
      updateOrganizerInfo(event);

      // Update join button state
      updateJoinButtonState(event);
      
    } else {
      console.error("Failed to load event details:", data.message);
      showErrorState();
    }
  } catch (error) {
    console.error("Error loading event details:", error);
    showErrorState();
  }
}

// Safe time formatting function
function safeFormatTime(timeValue) {
  if (!timeValue) return "TBD";
  
  // If it's already a properly formatted time string (HH:MM)
  if (typeof timeValue === 'string' && timeValue.match(/^\d{1,2}:\d{2}$/)) {
    return formatEventTime(timeValue);
  }
  
  // If it's a date string or Google Sheets serial number
  if (typeof timeValue === 'number') {
    // Convert Google Sheets serial number to time
    const date = new Date((timeValue - 25569) * 86400 * 1000);
    return Utilities.formatDate(date, "Asia/Manila", "HH:mm");
  }
  
  // If it's a full date string, extract time part
  if (typeof timeValue === 'string' && timeValue.includes('T')) {
    try {
      const date = new Date(timeValue);
      if (!isNaN(date)) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
    } catch (e) {
      console.warn("Could not parse time:", timeValue);
    }
  }
  
  return "TBD";
}

// Enhanced calculateEventDuration function
function calculateEventDuration(startTime, endTime) {
  if (!startTime || !endTime) return "Unknown";
  
  try {
    // Parse times safely
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      
      // Handle HH:MM format
      if (typeof timeStr === 'string' && timeStr.match(/^\d{1,2}:\d{2}$/)) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
      }
      
      // Handle Google Sheets serial numbers
      if (typeof timeStr === 'number') {
        return new Date((timeStr - 25569) * 86400 * 1000);
      }
      
      // Handle ISO strings
      if (typeof timeStr === 'string') {
        const date = new Date(timeStr);
        return isNaN(date) ? null : date;
      }
      
      return null;
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    if (!start || !end) return "Unknown";

    let diff = (end - start) / (1000 * 60 * 60); // Convert to hours
    
    // Handle overnight events
    if (diff < 0) {
      diff += 24;
    }

    if (diff < 1) {
      const minutes = Math.round(diff * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (diff === 1) {
      return "1 hour";
    } else {
      // Show decimal for partial hours
      const rounded = Math.round(diff * 2) / 2; // Round to nearest 0.5
      return `${rounded} hours`;
    }
  } catch (error) {
    console.error("Error calculating duration:", error);
    return "Unknown";
  }
}

// Update progress bar
function updateProgressBar(participantCount, participantLimit) {
  const progressFill = document.getElementById("participant-progress-fill");
  const progressText = document.getElementById("participant-progress-text");
  
  let progressPercent = 0;
  if (participantLimit > 0) {
    progressPercent = Math.min((participantCount / participantLimit) * 100, 100);
  }
  
  progressFill.style.width = `${progressPercent}%`;
  progressText.textContent = `${participantCount}/${participantLimit} spots filled`;
}

// Update organizer information
function updateOrganizerInfo(event) {
  const organizerName = document.getElementById("organizer-name");
  const organizerAvatar = document.querySelector(".organizer-avatar");
  
  if (organizerName) {
    organizerName.textContent = event.organizer_name || "SEED Platform";
  }
  
  if (organizerAvatar && event.organizer_avatar) {
    organizerAvatar.src = event.organizer_avatar;
    organizerAvatar.alt = event.organizer_name || "Organizer";
  }
}

// Format campus name
function formatCampusName(campus) {
  if (!campus) return "Main Campus";
  return campus.charAt(0).toUpperCase() + campus.slice(1) + " Campus";
}

// Format status
function formatStatus(status) {
  if (!status) return "Upcoming";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Enhanced join event function for detail page
async function joinEventDetail() {
  if (!currentUser) {
    alert("Please login to join events");
    showPage("login-page");
    return;
  }

  const eventId = sessionStorage.getItem("currentEventId");
  const joinBtn = document.getElementById("join-event-btn");

  if (joinBtn.disabled) return;

  try {
    joinBtn.disabled = true;
    joinBtn.textContent = "Joining...";

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "joinEvent",
        event_id: eventId,
        user_id: currentUser.id,
        user_name: currentUser.name,
      }),
    });

    const data = await response.json();

    if (data.success) {
      joinBtn.textContent = "Joined!";
      joinBtn.disabled = true;
      joinBtn.classList.add("joined");
      
      showToast("Successfully joined the event!");
      
      // Reload event details to update participant count
      setTimeout(() => {
        loadEventDetails();
      }, 1000);
      
      logActivity("event-join", `Joined: ${document.getElementById("event-title-large").textContent}`);
    } else {
      alert(data.message || "Failed to join event.");
      joinBtn.disabled = false;
      joinBtn.textContent = "Join Event";
    }
  } catch (error) {
    alert("Error joining event: " + error.message);
    joinBtn.disabled = false;
    joinBtn.textContent = "Join Event";
  }
}

// Update join button state
function updateJoinButtonState(event) {
  const joinBtn = document.getElementById("join-event-btn");
  if (!joinBtn) return;

  const participantCount = event.participants ? event.participants.length : 0;
  const participantLimit = event.participant_limit || 0;
  
  if (!currentUser) {
    joinBtn.textContent = "Login to Join";
    joinBtn.disabled = true;
    return;
  }

  // Check if user is already participating
  const isParticipating = event.participants && 
    event.participants.some(p => p.id === currentUser.id);
  
  if (isParticipating) {
    joinBtn.textContent = "Already Joined";
    joinBtn.disabled = true;
    joinBtn.classList.add("joined");
  } else if (participantCount >= participantLimit && participantLimit > 0) {
    joinBtn.textContent = "Event Full";
    joinBtn.disabled = true;
  } else {
    joinBtn.textContent = "Join Event";
    joinBtn.disabled = false;
    joinBtn.classList.remove("joined");
  }
}

// Helper function to calculate event duration
function calculateEventDuration(startTime, endTime) {
  if (!startTime || !endTime) return "Unknown";
  
  try {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60 * 60); // Convert to hours
    
    if (diff < 1) {
      return `${Math.round(diff * 60)} minutes`;
    } else if (diff === 1) {
      return "1 hour";
    } else {
      return `${Math.round(diff)} hours`;
    }
  } catch {
    return "Unknown";
  }
}

// Update join button based on user's participation status
function updateJoinButtonState(event) {
  const joinBtn = document.getElementById("join-event-btn");
  const participantCount = event.participants ? event.participants.length : 0;
  const participantLimit = event.participant_limit || 0;
  
  if (!currentUser) {
    joinBtn.textContent = "Login to Join";
    joinBtn.disabled = true;
    return;
  }

  // Check if user is already participating
  const isParticipating = event.participants && 
    event.participants.some(p => p.id === currentUser.id);
  
  if (isParticipating) {
    joinBtn.textContent = "Already Joined";
    joinBtn.disabled = true;
    joinBtn.classList.add("joined");
  } else if (participantCount >= participantLimit && participantLimit > 0) {
    joinBtn.textContent = "Event Full";
    joinBtn.disabled = true;
  } else {
    joinBtn.textContent = "Join Event";
    joinBtn.disabled = false;
    joinBtn.classList.remove("joined");
  }
}

// Enhanced join event function for detail page
async function joinEventDetail() {
  if (!currentUser) {
    alert("Please login to join events");
    showPage("login-page");
    return;
  }

  const eventId = sessionStorage.getItem("currentEventId");
  const joinBtn = document.getElementById("join-event-btn");

  // Prevent multiple clicks
  if (joinBtn.disabled) return;

  try {
    joinBtn.disabled = true;
    joinBtn.textContent = "Joining...";

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "joinEvent",
        event_id: eventId,
        user_id: currentUser.id,
        user_name: currentUser.name,
      }),
    });

    const data = await response.json();

    if (data.success) {
      joinBtn.textContent = "Joined!";
      joinBtn.classList.add("joined");
      
      // Show success message
      showToast("Successfully joined the event!");
      
      // Reload event details to update participant count
      setTimeout(() => {
        loadEventDetails();
      }, 1000);
      
      logActivity("event-join", `Joined: ${document.getElementById("event-title-large").textContent}`);
    } else {
      alert(data.message || "Failed to join event.");
      joinBtn.disabled = false;
      joinBtn.textContent = "Join Event";
    }
  } catch (error) {
    alert("Error joining event: " + error.message);
    joinBtn.disabled = false;
    joinBtn.textContent = "Join Event";
  }
}

// Show error state
function showErrorState() {
  document.getElementById("event-title-large").textContent = "Event Not Found";
  document.getElementById("event-description-detail").textContent = 
    "Sorry, we couldn't load the event details. Please try again later.";
}

// Toast notification function
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2e7d32;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Add this CSS for toast animation
const toastStyles = `
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;

// Inject toast styles
const styleSheet = document.createElement("style");
styleSheet.textContent = toastStyles;
document.head.appendChild(styleSheet);

async function refreshEventDetails() {
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
      const count = event.participants?.length || 0;
      const limit = event.participant_limit || 0;

      // Update participant count text
      const header = document.querySelector(
        "#event-detail-page .participants-header h2"
      );
      if (header) header.textContent = `Participants (${count}/${limit})`;
    }
  } catch (err) {
    console.error("Error refreshing event details:", err);
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

let editingEventId = null;

function openEditEvent(eventId) {
  const event = allEvents.find((e) => e.id === eventId);
  if (!event) return;

  editingEventId = eventId;

  // Prefill modal fields
  document.getElementById("event-title").value = event.title;
  document.getElementById("event-location").value = event.location;
  document.getElementById("event-date").value = event.date;
  document.getElementById("start-time").value = event.start_time;
  document.getElementById("end-time").value = event.end_time;
  document.getElementById("event-campus").value = event.campus;
  document.getElementById("tree-count").value = event.tree_count;
  document.getElementById("participant-limit").value = event.participant_limit;
  document.getElementById("event-description").value = event.description;

  document.getElementById("create-event-modal").style.display = "flex";
  document.querySelector("#create-event-modal .modal-title").textContent =
    "Edit Event";
  document.querySelector("#create-event-modal .event-submit-btn").textContent =
    "Save Changes";
}

async function saveEventChanges() {
  const payload = {
    action: "updateEvent",
    event_id: editingEventId,
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
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      alert("Event updated successfully!");
      closeCreateEventModal();
      loadEvents();
      editingEventId = null;
    } else {
      alert("Update failed: " + data.message);
    }
  } catch (err) {
    alert("Error updating event: " + err.message);
  }
}

function attachEventFilters() {
  const searchInput = document.getElementById("event-search");
  const campusFilter = document.getElementById("filter-campus");
  const statusFilter = document.getElementById("filter-status");

  if (!searchInput || !campusFilter || !statusFilter) return;

  // Listen to changes
  searchInput.addEventListener("input", filterEvents);
  campusFilter.addEventListener("change", filterEvents);
  statusFilter.addEventListener("change", filterEvents);
}

function filterEvents() {
  const search =
    document.getElementById("event-search")?.value.toLowerCase() || "";
  const campus = document.getElementById("filter-campus")?.value || "all";
  const status = document.getElementById("filter-status")?.value || "all";

  let filtered = allEvents.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(search) ||
      event.location.toLowerCase().includes(search);

    const matchesCampus =
      campus === "all" || event.campus.toLowerCase() === campus.toLowerCase();

    const matchesStatus =
      status === "all" || event.status.toLowerCase() === status.toLowerCase();

    return matchesSearch && matchesCampus && matchesStatus;
  });

  renderEvents(filtered);
}


// --------- HELPERS ---------

// Enhanced date formatting
function formatEventDate(dateString) {
  if (!dateString) return "Date TBD";
  
  try {
    // Handle Google Sheets serial numbers
    if (typeof dateString === 'number') {
      const date = new Date((dateString - 25569) * 86400 * 1000);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    
    // Handle string dates
    const date = new Date(dateString);
    if (isNaN(date)) {
      // Try parsing different formats
      const parts = dateString.split(/[-/]/);
      if (parts.length >= 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(dateObj)) {
          return dateObj.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });
        }
      }
      return "Invalid Date";
    }
    
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Date TBD";
  }
}

// Enhanced time formatting
function formatEventTime(timeString) {
  if (!timeString) return "TBD";
  
  try {
    // Handle HH:MM format directly
    if (typeof timeString === 'string' && timeString.match(/^\d{1,2}:\d{2}$/)) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return safeFormatTime(timeString);
  } catch (error) {
    console.error("Time formatting error:", error);
    return "TBD";
  }
}

function getDaysLeft(dateString) {
  if (!dateString) return 0;

  const today = new Date();
  const eventDate = new Date(dateString);

  // If the date is invalid, return 0
  if (isNaN(eventDate.getTime())) return 0;

  const diff = eventDate - today;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function backToEvents() {
  showPage("events-page");
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

  // === Avatar updates ===
  const avatars = document.querySelectorAll(
    ".user-avatar, .profile-avatar, #profile-avatar"
  );
  avatars.forEach((avatar) => {
    avatar.src = currentUser.avatar || "https://via.placeholder.com/150";
  });

  // === Sidebar profile (social feed) ===
  if (document.getElementById("profile-sidebar-name")) {
    document.getElementById("profile-sidebar-name").textContent =
      currentUser.name || "Guest User";
  }
  if (document.getElementById("profile-sidebar-handle")) {
    document.getElementById("profile-sidebar-handle").textContent = `@${
      currentUser.username || "guest_user"
    }`;
  }
  if (document.getElementById("profile-sidebar-bio")) {
    document.getElementById("profile-sidebar-bio").textContent =
      currentUser.bio && currentUser.bio.trim() !== ""
        ? currentUser.bio
        : "This user hasn’t added a bio yet.";
  }

  // === Profile Page (main profile) ===
  // Full name
  if (document.getElementById("profile-name-large")) {
    document.getElementById("profile-name-large").textContent =
      currentUser.name || "Guest User";
  }

  // Department (NEW)
  if (document.getElementById("profile-department")) {
    document.getElementById("profile-department").textContent =
      currentUser.department && currentUser.department.trim() !== ""
        ? currentUser.department
        : "No Department";
  }

  // Handle (@username)
  if (document.getElementById("profile-handle-large")) {
    document.getElementById("profile-handle-large").textContent = `@${
      currentUser.username || "guest_user"
    }`;
  }

  // Bio
  if (document.getElementById("profile-bio")) {
    document.getElementById("profile-bio").textContent =
      currentUser.bio && currentUser.bio.trim() !== ""
        ? currentUser.bio
        : "This user hasn’t added a bio yet.";
  }

  // === Settings form fields ===
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
        password: encryptPassword(password),
      }),
    });

    const data = await response.json();

if (data.success) {
  currentUser = {
    ...data.user,
    password: encryptPassword(password), // store for refresh after saveSettings
  };
  localStorage.setItem("currentUser", JSON.stringify(currentUser));

  updateLoginState();
  updateProfileData();
  fillSettingsForm(); // ✅ ensure form reflects the new user
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
        name,
        email,
        username,
        password: encryptPassword(password),
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
    password: encryptPassword(password), // keep encrypted password
  };

  localStorage.setItem("currentUser", JSON.stringify(currentUser));

  updateLoginState();
  updateProfileData();
  fillSettingsForm(); // ✅ refresh settings form for the new user
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

  // Safely fill all profile fields
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("display-name", currentUser.name);
  setValue("username", currentUser.username);
  setValue("email", currentUser.email);
  setValue("department", currentUser.department);
  setValue("bio", currentUser.bio);
  setValue("avatar-url", currentUser.avatar);

  // Update avatar preview image
  const preview = document.getElementById("avatar-preview");
  if (preview) {
    preview.src =
      currentUser.avatar || "https://randomuser.me/api/portraits/lego/1.jpg";
  }

  // Clear password fields for security
  setValue("current-password", "");
  setValue("new-password", "");
  setValue("confirm-password", "");
}


async function saveSettings() {
  if (!currentUser) return;

  // Grab current profile field values
  const name = document.getElementById("display-name").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("settings-email").value.trim();
  const bio = document.getElementById("bio").value.trim();
  const avatar = document.getElementById("avatar-url").value.trim();
  const department = document.getElementById("department").value.trim();

  // Grab password fields
  const currentPass = document.getElementById("current-password").value.trim();
  const newPass = document.getElementById("new-password").value.trim();
  const confirmPass = document.getElementById("confirm-password").value.trim();

  // Default = keep old password
  let passwordToSave = currentUser.password;

  // --- Password change logic ---
  if (currentPass || newPass || confirmPass) {
    if (!currentPass || !newPass || !confirmPass) {
      alert("Please fill in all password fields to change your password.");
      return;
    }

    const decryptedOld = decryptPassword(currentUser.password);
    if (currentPass !== decryptedOld) {
      alert("Current password is incorrect.");
      return;
    }

    if (newPass !== confirmPass) {
      alert("New passwords do not match.");
      return;
    }

    passwordToSave = encryptPassword(newPass);
  }

  // --- Build payload for backend ---
  const payload = {
    action: "updateProfile",
    user_id: currentUser.id,
    name,
    username,
    email,
    bio,
    avatar,
    department,
    password: passwordToSave,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      // ✅ Prefer using backend's returned `user` object (fresh + latest)
      if (data.user) {
        currentUser = data.user;
      } else {
        // fallback if backend doesn’t send full user object
        currentUser = {
          ...currentUser,
          name,
          username,
          email,
          bio,
          avatar,
          department,
          password: passwordToSave,
        };
      }

      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      updateProfileData();

      // Clear password fields for security
      document.getElementById("current-password").value = "";
      document.getElementById("new-password").value = "";
      document.getElementById("confirm-password").value = "";

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


