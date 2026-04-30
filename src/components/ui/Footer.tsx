export default function Footer() {
  return (
    <footer className="w-full py-12 px-6 border-t border-white/10 mt-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-white/60 text-sm">
          © {new Date().getFullYear()} Charmant AR. All rights reserved.
        </div>
        <div className="flex gap-6 text-sm text-white/60">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
