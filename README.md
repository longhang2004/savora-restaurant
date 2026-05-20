# Savora Restaurant - Premium Vietnamese Fusion Web App

A high-performance, dark luxury Vietnamese-fusion culinary showcase built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Framer Motion**, and **CSS Modules**. 

This repository serves as an elite showcase for **frontend engineering excellence** and **advanced search engine optimization (SEO)** practices.

## 🌟 Key Features

*   **Dark Luxury Aesthetic**: Custom typography (Playfair Display & Inter), harmony color tokens, glassmorphism card layouts, and subtle radial light glows.
*   **Dynamic Interactive Menu**: Client-side categorizations (Starters, Mains, Desserts, Drinks) with spring-animated underline transitions and smooth exit/entrance card reveals.
*   **Story Timeline**: A customized scroll-triggered vertical timeline showcasing the restaurant's culinary journey from 2016 to 2026.
*   **Fully Validated Reservation System**: Complete reservation form validating guests count, date/time inputs, and contact data, paired with submit state indicators and a booking summary invoice card.
*   **SEO-Optimized Blog (Journal)**: High-speed Static Site Generation (SSG) lists and dynamic posts (`/blog/[slug]`) that fetch route params as Promises (Next.js 15/16 standard).
*   **Responsive Architecture**: Fluid grid systems and adaptive media elements optimized for mobile, tablet, and ultra-wide desktop screens.

---

## 🚀 SEO & Core Web Vitals Highlights

To guarantee maximum visibility and rapid search engine indexing, the project implements the following technical SEO specifications:

1.  **Metadata Optimization Engine**
    *   Constructed a reusable metadata utility (`generatePageMetadata` in `src/lib/metadata.ts`) to programmatically handle title suffixes, canonical links, Open Graph details, and Twitter Card specifications for each route.
2.  **Structured Data Integration (JSON-LD)**
    *   **Local Business Schema**: Injected globally in `layout.tsx` to declare Savora as a premium food establishment in District 1 HCMC, complete with geolocation coordinates, telephone, currency, and opening hours.
    *   **Menu Schema**: Dynamically injected on `/menu` referencing specific categories and individual chef signature items.
    *   **Article Schema**: Dynamically computed and injected on `/blog/[slug]` referencing the publication date, author name, reading time, and body synopsis.
3.  **Automated XML Sitemap & Robots**
    *   `src/app/sitemap.ts` programmatically queries the static routes and database-backed blog articles, compiling a clean indexing sitemap.
    *   `src/app/robots.ts` declares crawling permissions and directly refers to the sitemap location.
4.  **Static Site Optimization**
    *   Compiled 100% of routes as pre-rendered static HTML (`Static` or `SSG`), achieving maximum Core Web Vitals performance (Largest Contentful Paint, Cumulative Layout Shift).

---

## 🛠️ Technology Stack

*   **Framework**: Next.js 15.2.6 (App Router)
*   **Runtime Library**: React 19.2.4
*   **Type Checker**: TypeScript 5.x
*   **Styling**: Vanilla CSS Modules (Scoped CSS classes, no utility classes pollution)
*   **Motion**: Framer Motion 12.x
*   **Iconography**: Lucide React
*   **Package Manager**: pnpm 10.x

---

## 📂 Project Structure

```
savora-restaurant/
├── public/                 # Optimized images and static assets
├── src/
│   ├── app/                # App Router (Pages, Layouts, Sitemap, Robots)
│   │   ├── about/          # Restaurant Story Page
│   │   ├── blog/           # Blog Listing and Dynamic Article Details ([slug])
│   │   ├── contact/        # Contact Information & Inquiry Form
│   │   ├── menu/           # Food Menu & Categories
│   │   ├── reservations/   # Reservation Form & Policies
│   │   ├── globals.css     # Global luxury design tokens & resets
│   │   └── layout.tsx      # Main layout shell and base JSON-LD
│   ├── components/         # Modular Components
│   │   ├── home/           # Homepage sections (Hero, Story, Testimonials, CTA)
│   │   ├── layout/         # Header & Footer (with inline SVG logos)
│   │   ├── reservations/   # Reservation Form states
│   │   └── ui/             # Animated counters & scroll trigger containers
│   ├── data/               # Structured TS database (mock data)
│   └── lib/                # SEO and JSON-LD schema builder engines
```

---

## 💻 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed and [pnpm](https://pnpm.io/) configured:

```bash
npm install -g pnpm
```

### Installation

Clone the repository and install dependencies:

```bash
pnpm install
```

### Development Server

Run the local development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Production Build

Generate the optimized static build:

```bash
pnpm build
```

This compiles all pages into optimized static HTML files. To preview the production build locally:

```bash
pnpm start
```

---

## 📄 License

Designed and developed by [Hàng Nhựt Long](https://linkedin.com/in/nhựt-long-hàng-0aa434325). Built as a showcase for freelance frontend, performance, and SEO contracts.
