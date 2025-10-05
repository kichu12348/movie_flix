// frontend/public/app.js

const API_URL = "/api";

// --- Helper Functions ---
const getToken = () => localStorage.getItem("token");

const escapeHtml = (text) => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const showNotification = (message, type = "info") => {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((n) => n.remove());

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;

  const icon =
    type === "success"
      ? "fas fa-check-circle"
      : type === "error"
      ? "fas fa-exclamation-circle"
      : "fas fa-info-circle";

  notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${escapeHtml(message)}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  // Add styles dynamically if not present
  if (!document.getElementById("notification-styles")) {
    const styles = document.createElement("style");
    styles.id = "notification-styles";
    styles.textContent = `
            .notification {
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 1000;
                background: rgba(30, 41, 59, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 1rem 1.5rem;
                color: white;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                max-width: 400px;
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-success {
                border-left: 4px solid var(--success);
            }
            
            .notification-error {
                border-left: 4px solid var(--danger);
            }
            
            .notification-info {
                border-left: 4px solid var(--primary);
            }
            
            .notification i:first-child {
                color: var(--success);
                font-size: 1.1rem;
            }
            
            .notification-error i:first-child {
                color: var(--danger);
            }
            
            .notification-info i:first-child {
                color: var(--primary);
            }
            
            .notification-close {
                background: none;
                border: none;
                color: var(--gray);
                cursor: pointer;
                padding: 0.25rem;
                margin-left: auto;
                transition: color 0.2s;
            }
            
            .notification-close:hover {
                color: white;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @media (max-width: 480px) {
                .notification {
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
            }
        `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideIn 0.3s ease-out reverse";
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
};

const checkLoginStatus = () => {
  const token = getToken();
  const loginLink = document.getElementById("login-link");
  const logoutButton = document.getElementById("logout-button");
  const addMovieSection = document.getElementById("add-movie-section");

  if (token) {
    // If a token exists, the user is logged in
    if (loginLink) loginLink.classList.add("hidden");
    if (logoutButton) logoutButton.classList.remove("hidden");
    if (addMovieSection) addMovieSection.classList.remove("hidden");
  } else {
    // If no token, the user is not logged in
    if (loginLink) loginLink.classList.remove("hidden");
    if (logoutButton) logoutButton.classList.add("hidden");
    if (addMovieSection) addMovieSection.classList.add("hidden");
  }
};

// --- API Functions ---

// PROTECTED: Fetches user's movies from the backend and displays them
async function fetchMovies() {
  const token = getToken();

  if (!token) {
    // If no token, show login message instead of movies
    const movieGrid = document.getElementById("movies");
    const emptyState = document.getElementById("empty-state");
    if (movieGrid) movieGrid.innerHTML = "";
    if (emptyState) {
      emptyState.innerHTML = `
                <i class="fas fa-lock"></i>
                <h3>Please log in to view your movies</h3>
                <p>You need to be logged in to manage your movie collection.</p>
            `;
      emptyState.classList.remove("hidden");
    }
    return;
  }

  try {
    const response = await fetch(`${API_URL}/movies`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      // Token is invalid, remove it and redirect to login
      localStorage.removeItem("token");
      showNotification(
        "Your session has expired. Please log in again.",
        "error"
      );
      setTimeout(() => {
        window.location.href = "/auth/user";
      }, 2000);
      return;
    }

    const data = await response.json();
    const movieGrid = document.getElementById("movies");
    const emptyState = document.getElementById("empty-state");

    if (!movieGrid) return;

    movieGrid.innerHTML = ""; // Clear any existing movie cards

    if (data.movies && data.movies.length > 0) {
      // Hide empty state and show movies
      if (emptyState) emptyState.classList.add("hidden");

      data.movies.forEach((movie) => {
        const movieCard = document.createElement("div");
        movieCard.className = "movie-card";

        const isAvailable = movie.is_available !== 0; // Handle SQLite boolean
        const statusClass = isAvailable ? "available" : "unavailable";
        const statusText = isAvailable ? "Available" : "Rented";

        movieCard.innerHTML = `
                    <div class="movie-header">
                        <h3 class="movie-title">
                            <i class="fas fa-film" style="color: var(--secondary);"></i>
                            ${escapeHtml(movie.title)}
                        </h3>
                        <div class="movie-actions">
                            <button class="btn-action btn-edit" onclick="editMovie(${
                              movie.id
                            }, '${escapeHtml(movie.title)}', '${escapeHtml(
          movie.genre
        )}')" title="Edit Movie">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteMovie(${
                              movie.id
                            }, '${escapeHtml(
          movie.title
        )}')" title="Delete Movie">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="movie-genre">${escapeHtml(movie.genre)}</div>
                    <div class="movie-status">
                        <div class="status-indicator ${statusClass}"></div>
                        <span class="status-text">${statusText}</span>
                    </div>
                `;

        movieGrid.appendChild(movieCard);
      });
    } else {
      // Show empty state when no movies
      if (emptyState) emptyState.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Failed to fetch movies:", error);
    // Show error state or fallback
    const movieGrid = document.getElementById("movies");
    if (movieGrid) {
      movieGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>
                    <h3>Error Loading Movies</h3>
                    <p>Unable to load movies. Please try again later.</p>
                </div>
            `;
    }
  }
}

// PROTECTED: Adds a new movie to the database
async function addMovie(event) {
  event.preventDefault();
  const title = document.getElementById("title").value.trim();
  const genre = document.getElementById("genre").value.trim();
  const token = getToken();
  const submitButton = event.target.querySelector('button[type="submit"]');

  // Validate inputs
  if (!title || !genre) {
    showNotification("Please fill in all fields", "error");
    return;
  }

  // Show loading state
  const originalText = submitButton.innerHTML;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  submitButton.disabled = true;

  try {
    const response = await fetch(`${API_URL}/movies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Include the auth token
      },
      body: JSON.stringify({ title, genre }),
    });

    if (response.ok) {
      showNotification("Movie added successfully!", "success");
      fetchMovies(); // Refresh the movie list to show the new one
      event.target.reset(); // Clear the form fields
    } else {
      const errorData = await response.json();
      showNotification(
        `Error: ${errorData.message || errorData.error}`,
        "error"
      );
    }
  } catch (error) {
    console.error("Failed to add movie:", error);
    showNotification("Failed to add movie. Please try again.", "error");
  } finally {
    // Reset button state
    submitButton.innerHTML = originalText;
    submitButton.disabled = false;
  }
}

// Logs the user out by removing the token
const logoutUser = () => {
  localStorage.removeItem("token");
  showNotification("You have been logged out successfully", "info");

  setTimeout(() => {
    window.location.href = "/auth"; // Redirect to the login page
  }, 1000);
};

// --- Movie Management Functions ---

const editMovie = (id, title, genre) => {
  document.getElementById("edit-movie-id").value = id;
  document.getElementById("edit-title").value = title;
  document.getElementById("edit-genre").value = genre;

  document.getElementById("edit-modal").classList.add("active");
  document.body.style.overflow = "hidden"; // Prevent background scrolling
};

// Closes the edit modal
const closeEditModal = () => {
  document.getElementById("edit-modal").classList.remove("active");
  document.body.style.overflow = ""; // Restore scrolling
};

// Opens the delete confirmation modal
const deleteMovie = (id, title) => {
  document.getElementById("delete-movie-title").textContent = title;
  document.getElementById("delete-modal").classList.add("active");
  document.body.style.overflow = "hidden";

  // Set up the confirm delete button
  const confirmBtn = document.getElementById("confirm-delete-btn");
  confirmBtn.onclick = () => confirmDeleteMovie(id);
};

// Closes the delete confirmation modal
const closeDeleteModal = () => {
  document.getElementById("delete-modal").classList.remove("active");
  document.body.style.overflow = "";
};

// PROTECTED: Updates a movie
async function updateMovie(event) {
  event.preventDefault();
  const movieId = document.getElementById("edit-movie-id").value;
  const title = document.getElementById("edit-title").value.trim();
  const genre = document.getElementById("edit-genre").value.trim();
  const token = getToken();
  const submitButton = event.target.querySelector('button[type="submit"]');

  if (!title || !genre) {
    showNotification("Please fill in all fields", "error");
    return;
  }

  // Show loading state
  const originalText = submitButton.innerHTML;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  submitButton.disabled = true;

  try {
    const response = await fetch(`${API_URL}/movies/${movieId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, genre }),
    });

    if (response.ok) {
      showNotification("Movie updated successfully!", "success");
      fetchMovies(); // Refresh the movie list
      closeEditModal();
    } else {
      const errorData = await response.json();
      showNotification(
        `Error: ${errorData.message || errorData.error}`,
        "error"
      );
    }
  } catch (error) {
    console.error("Failed to update movie:", error);
    showNotification("Failed to update movie. Please try again.", "error");
  } finally {
    submitButton.innerHTML = originalText;
    submitButton.disabled = false;
  }
}

// PROTECTED: Deletes a movie
async function confirmDeleteMovie(movieId) {
  const token = getToken();
  const confirmBtn = document.getElementById("confirm-delete-btn");

  // Show loading state
  const originalText = confirmBtn.innerHTML;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
  confirmBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/movies/${movieId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      showNotification("Movie deleted successfully!", "success");
      fetchMovies(); // Refresh the movie list
      closeDeleteModal();
    } else {
      const errorData = await response.json();
      showNotification(
        `Error: ${errorData.message || errorData.error}`,
        "error"
      );
    }
  } catch (error) {
    console.error("Failed to delete movie:", error);
    showNotification("Failed to delete movie. Please try again.", "error");
  } finally {
    confirmBtn.innerHTML = originalText;
    confirmBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();

  if (document.getElementById("movies")) {
    // Only fetch movies if user is logged in
    const token = getToken();
    if (token) {
      fetchMovies();
    }
  }

  // Add movie form
  if (document.getElementById("add-movie-form")) {
    document
      .getElementById("add-movie-form")
      .addEventListener("submit", addMovie);
  }

  // Edit movie form
  if (document.getElementById("edit-movie-form")) {
    document
      .getElementById("edit-movie-form")
      .addEventListener("submit", updateMovie);
  }

  // Logout button
  if (document.getElementById("logout-button")) {
    document
      .getElementById("logout-button")
      .addEventListener("click", logoutUser);
  }

  // Close modals when clicking outside
  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      if (event.target.id === "edit-modal") {
        closeEditModal();
      } else if (event.target.id === "delete-modal") {
        closeDeleteModal();
      }
    }
  });

  // Close modals with Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeEditModal();
      closeDeleteModal();
    }
  });
});
