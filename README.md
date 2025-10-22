
# SEED – Seeds for Tomorrow

## Description

**SEED (Sustainability Engagement and Environmental Development)** is a web-based sustainability platform designed for the **Bataan Peninsula State University (BPSU) Environmental Sustainability Office**.
The system allows students and organizations to participate in tree planting events, log sustainability actions, share eco-friendly updates, and track environmental progress in real time.
It serves as a centralized platform for collaboration and environmental awareness within the BPSU community.

## Features

* **Landing Page Overview**: Displays SEED’s mission and statistics on trees planted, waste reduced, and carbon emissions reduced.
* **Dynamic Progress Bars**: Progress indicators automatically fill based on goal completion percentages.
* **Social Feed**: Students and organizations can post updates, like, and comment on sustainability initiatives.
* **Hashtag Trends**: Automatically detects hashtags from posts and displays trending environmental topics.
* **Event Management**: Lists upcoming and ongoing tree planting events with complete details such as date, campus, participants, and goals.
* **Organization Profiles**: Highlights BPSU organizations leading sustainability efforts.
* **Search System**: Global search bar to find people, events, and eco topics.
* **Responsive UI**: Fully optimized for desktop, tablet, and mobile browsers.

## System Requirements

* **Web Browser**: Compatible with Chrome, Firefox, and Edge.
* **Internet Connection**: Required to connect to the Google Apps Script backend API.
* **Deployment Platform**: GitHub Pages or any static web hosting service.

## Project Structure

### Main Features Breakdown

#### Landing Page and Mission Stats:

* Presents SEED’s goals, progress statistics, and sustainability metrics.
* Displays total trees planted, waste reduced, and carbon emissions reduced.
* Features “Join as Student” and “Register Organization” buttons for user participation.

#### Social Feed Interaction:

* Users can create, like, and comment on sustainability-related posts.
* Each post supports hashtags for easy topic discovery.
* Displays trending hashtags on the sidebar under “Eco Trends.”

#### Event Management:

* Displays all BPSU tree planting events in a clean grid layout.
* Includes detailed pages for event descriptions, schedules, and impact.
* Tracks progress for participants and tree planting targets.

#### Organization Section:

* Showcases BPSU organizations involved in sustainability initiatives.
* Encourages partnerships and group participation in eco programs.

#### Responsive Design:

* Adjusts layout and visuals seamlessly for mobile and desktop devices.
* Includes custom scrollbars, animated buttons, and modern color schemes.

### Backend Integration

* Uses **Google Apps Script** as the backend API.
* Stores all data (Users, Posts, Events, Trends) in **Google Sheets**.
* Connects via the following API endpoint in `script.js`:

  ```javascript
  const API_URL = "https://script.google.com/macros/s/AKfycbz.../exec";
  ```

## Getting Started

1. **Clone the repository to your local machine.**

   ```bash
   git clone https://github.com/yourusername/SEED-BPSU.git
   ```
2. **Navigate to the project directory.**

   ```bash
   cd SEED-BPSU
   ```
3. **Open the project.**

   * Open `index.html` directly in your browser, **or**
   * Use the **Live Server** extension in VS Code for better testing.
4. **Connect to your backend.**

   * Create a Google Apps Script project and link it to a Google Sheet.
   * Deploy it as a web app and copy its URL.
   * Replace the existing `API_URL` in `script.js` with your own.
5. **Deploy the website.**

   * Upload your repository to GitHub.
   * Go to **Settings → Pages** and enable GitHub Pages.
   * Your project will be live at:

     ```
     https://yourusername.github.io/SEED-BPSU/
     ```

## Program Flow

1. **Landing Page**:

   * Displays SEED’s mission, total trees planted, waste reduced, and carbon goals with animated progress bars.

2. **User Interaction**:

   * Visitors can explore the site, sign up as students or organizations, and view active sustainability features.

3. **Post Creation**:

   * Logged-in users can create posts, add hashtags, and interact with others through likes and comments.

4. **Eco Trends**:

   * Hashtags from user posts are analyzed and displayed as trending eco topics on the sidebar.

5. **Event Listing**:

   * Displays a grid of current and upcoming tree planting events.
   * Each event includes detailed schedules, goals, and participant counts.

6. **Organization Collaboration**:

   * Highlights participating student organizations leading environmental projects across campuses.

7. **Progress Tracking**:

   * Statistics for trees planted, waste reduced, and carbon saved are dynamically updated via JavaScript.

## Conclusion

This project serves as a prototype for a **digital environmental engagement system** for the **BPSU Environmental Sustainability Office**.
It applies key principles of front-end web development—HTML, CSS, and JavaScript—combined with a cloud-based backend using Google Apps Script and Sheets integration.

Through this project, concepts such as dynamic data rendering, event-driven JavaScript, and responsive web design were effectively implemented.
The SEED platform promotes environmental participation, transparency, and collaboration across the BPSU community, aligning technology with sustainability goals.

This project is presented in partial fulfillment of the requirements for **Web Development and Database Management**, showcasing proficiency in both frontend logic and backend integration.

---

**Developer:** Alfie Arellano
**Project:** SEED – Seeds for Tomorrow
**Institution:** Bataan Peninsula State University (BPSU)
**Year:** 2025
