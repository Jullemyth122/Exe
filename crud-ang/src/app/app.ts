import { Component, signal, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  isDark = signal(true);

  constructor() {
    // Persist theme preference
    const saved = localStorage.getItem('pawshop-theme');
    if (saved === 'light') {
      this.isDark.set(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }

    effect(() => {
      const dark = this.isDark();
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      localStorage.setItem('pawshop-theme', dark ? 'dark' : 'light');
    });
  }

  toggleTheme() {
    this.isDark.update(v => !v);
  }
}
