# **HackerTok** 
*A TikTok-style web app for browsing Hacker News stories*  

## **📌 Overview**  
HackerTok is a modern, **TikTok-style web application** that allows users to browse **Hacker News stories** in a **full-screen, scrollable format**, similar to YouTube Shorts. The app is built with **Next.js**, **React**, **TailwindCSS**, and integrates the **Hacker News API** to fetch the latest trending tech news.  

🚀 **Features:**  
✔ Infinite scrolling with **smooth snap navigation**  
✔ Full-screen story cards with images, descriptions, and metadata  
✔ Like & save your favorite stories **(stored in localStorage)**  
✔ **Fast & optimized API** with caching for **low latency**  
✔ Lazy loading **story metadata** (images, descriptions, favicons)  
✔ Category-based filtering (**Top, New, Best, Ask, Show, Job**)  
✔ Responsive **mobile-first UI**  

---

## **🚀 Demo**  
🌐 **Live Deployment**: [HackerTok on Vercel](https://hacker-tok.vercel.app) 

---

## **🛠️ Tech Stack**  
- **Frontend:** Next.js (React), TailwindCSS, TypeScript  
- **Backend:** Next.js API routes, Cheerio for metadata extraction  
- **Data Source:** [Hacker News API](https://github.com/HackerNews/API)  
- **Deployment:** Vercel  

---

## **📦 Installation & Setup**  
### **1️⃣ Clone the Repository**  
```sh
git clone https://github.com/your-username/hackertok.git
cd hackertok
```

### **2️⃣ Install Dependencies**  
```sh
npm install
# or
yarn install
```

### **3️⃣ Run the Development Server**  
```sh
npm run dev
# or
yarn dev
```
📌 Open **`http://localhost:3000`** in your browser.  

---

## **🖥️ Folder Structure**  
```
HackerTok/
│── public/                          # Static assets (favicons, placeholder images, etc.)
│── src/
│   ├── app/                         # Next.js application pages & routes
│   │   ├── api/                     # API route handlers (server-side logic)
│   │   │   ├── stories/             # API for fetching Hacker News stories
│   │   ├── layout.tsx               # Global layout component
│   │   ├── page.tsx                 # Main page with infinite scrolling & story feed
|   |   ├── globals.css              # Global CSS styles
│   ├── components/                  # UI Components
│   │   ├── StoryCard.tsx            # Displays individual stories
│   │   ├── CategoryFilter.tsx       # Dropdown to filter story categories
│   │   ├── SavedPosts.tsx           # Modal for saved posts
│   │   ├── AboutOverlay.tsx         # Info popup about HackerTok
│   │   ├── ui/                      # Reusable UI elements (buttons, modals, etc.)
│   ├── hooks/                       # Custom hooks (e.g., use-toast for notifications)
│   ├── lib/                         # Utility functions & API calls
│   │   ├── api.ts                   # Fetch stories from API
│   │   ├── types.ts                 # TypeScript type definitions
│   │   ├── utils.ts                 # Helper functions (date formatting, domain extraction, etc.)
│   ├── styles/                      # Global & component-specific styles
│   ├── app/
│── next.config.js                   # Next.js configuration
│── tailwind.config.js               # Tailwind CSS configuration
│── tsconfig.json                    # TypeScript configuration
│── package.json                     # Project dependencies & scripts
│── README.md                        # Project documentation

```

---

## **🚀 API Optimization**  
HackerTok uses an optimized **Next.js API** to fetch Hacker News stories efficiently.  
✔ Uses **in-memory caching** to reduce API calls  
✔ **Lazy-loads metadata** (images, favicons) 
✔ Implements **error handling & fallback UI** for failed requests  

### **Example API Request:**  
```sh
GET /api/stories?type=topstories&page=1
```
📌 Returns paginated **Hacker News stories** in JSON format.  

---

## **💡 Features & Future Improvements**  
🔹 **Current Features:**  
✅ Infinite scrolling with smooth snap          
✅ **Metadata fetching** (images, favicons, descriptions)  
✅ **Optimized API requests** (cached, fast, lazy-loaded)  
✅ **User interactions** (like, save, share)  

✨ **Planned Features:**  
🔹 Implement **dark mode** 🌙  
🔹 Add **server-side caching with Redis** 🗄️  
🔹 Explore **AI-powered summarization** for stories 🤖  

---

## **🔗 Contributing**  
Contributions are welcome! Feel free to open issues and submit pull requests.  

1. **Fork the repository**  
2. **Create a new branch:**  
   ```sh
   git checkout -b feature-new-improvement
   ```
3. **Commit your changes:**  
   ```sh
   git commit -m "Added new feature"
   ```
4. **Push your branch:**  
   ```sh
   git push origin feature-new-improvement
   ```
5. **Open a Pull Request** 🚀  

---

## **📜 License**  
This project is **open-source** and available under the **MIT License**.  

📌 **Author:** [Apoorva Khajbage](https://github.com/ApoorvaKhajbage)  
🌟 **Star the repo** if you find it useful! ⭐  

---

### **📌 Final Notes**  
HackerTok is designed to be a **fast, engaging, and user-friendly** way to consume tech news in a **reels-style experience**. Hope you enjoy using it! 🚀🎉  

---
