<div align="center">
  <br />
  <a href="https://github.com/YogeshTundiya/AR_jewel" target="_blank">
    <img src="https://raw.githubusercontent.com/YogeshTundiya/AR_jewel/main/web-ar-jewelry/public/images/hero-bg.jpg" alt="AR Jewel Banner" width="100%" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 20px;">
  </a>

  # ✨ AR Jewel: Premium WebAR Try-On Experience

  <p align="center">
    A high-fidelity, luxury digital jewelry catalog featuring an immersive, zero-cost augmented reality try-on experience built directly for the modern browser.
  </p>

  <p align="center">
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" /></a>
    <a href="https://developers.google.com/mediapipe"><img src="https://img.shields.io/badge/MediaPipe-00B2A9?style=for-the-badge&logo=google&logoColor=white" alt="MediaPipe" /></a>
    <a href="https://www.framer.com/motion/"><img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" /></a>
  </p>
</div>

---

## 🌟 Overview

**AR Jewel** is a showcase platform designed to replicate the luxury retail experience on the web. It bridges the gap between digital browsing and physical try-ons by utilizing advanced client-side AR capabilities. Users can instantly visualize premium jewelry pieces—such as rings, necklaces, and earrings—on themselves using just their device's camera.

Built entirely using an open-source, "zero-cost" stack, AR Jewel proves that high-end augmented reality commerce doesn't require expensive enterprise software or dedicated mobile apps.

## ✨ Key Features

- **Liquid Glass Interface:** A bespoke, minimalist UI crafted with Tailwind CSS and Framer Motion, inspired by the aesthetics of elite jewelry brands like Cartier and Tiffany & Co.
- **On-Device WebAR Try-On:** Immersive virtual try-ons using **MindAR** (for face/neck tracking) and **MediaPipe** (for hand/finger tracking) with zero server-side processing.
- **Cinematic Parallax & Scroll Animations:** Fluid scroll experiences powered by Lenis and meticulously timed micro-interactions.
- **High-Fidelity 3D Rendering:** React Three Fiber integration complete with custom HDRI environment maps to simulate realistic gem sparkle and metallic reflections.

## 🛠️ Technology Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 14, React, TypeScript |
| **Styling & Motion** | Tailwind CSS, Framer Motion, Lenis (Smooth Scroll) |
| **3D Rendering** | Three.js, React Three Fiber, Drei |
| **Augmented Reality** | MindAR (Face Tracking), MediaPipe Vision (Hand Tracking) |
| **Deployment** | Vercel (Recommended) |

## 🚀 Getting Started

Follow these steps to run the premium AR showcase locally.

### Prerequisites

Ensure you have Node.js (v18+) and npm/yarn/pnpm installed.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YogeshTundiya/AR_jewel.git
   cd AR_jewel/web-ar-jewelry
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or yarn install / pnpm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Experience the Magic:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.
   > **Note:** For the AR try-on features to work locally, you may need to access your local server via HTTPS or use localhost strictly. Ensure camera permissions are granted.

## 🏛️ Architecture Blueprint

This project follows a phased implementation strategy:

- **Phase 1: Generative 3D Asset Pipeline** - Converting 2D jewelry designs into optimized 3D models (glTF/GLB) using AI tools like Meshy AI or Tripo3D.
- **Phase 2: AR Engine Integration** - Utilizing MediaPipe for robust hand/finger landmark detection (rings/bracelets) and MindAR for face tracking (earrings/necklaces).
- **Phase 3: Photorealistic Rendering** - Applying PBR (Physically Based Rendering) materials and HDRI lighting maps to achieve authentic light refraction on gemstones.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/YogeshTundiya/AR_jewel/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<div align="center">
  <p>Crafted with precision & passion for the future of digital retail.</p>
</div>
