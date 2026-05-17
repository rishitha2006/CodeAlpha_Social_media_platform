const API = "http://localhost:5000/api/posts";

async function loadPosts() {
  const res = await fetch(API);
  const data = await res.json();

  document.getElementById("posts").innerHTML = data.map(p => `
    <div class="post">
      <p>${p.content}</p>
      <button onclick="likePost('${p._id}')">❤️ ${p.likes.length}</button>
    </div>
  `).join("");
}

async function createPost() {
  const content = document.getElementById("postText").value;

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, userId: "123" })
  });

  loadPosts();
}

async function likePost(id) {
  await fetch(`${API}/like/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "123" })
  });

  loadPosts();
}

loadPosts();