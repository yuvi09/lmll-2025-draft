import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="app-container">
      <nav class="sidebar">
        <div class="nav-header">Draft Viewer</div>
        <a routerLink="/top-picks" routerLinkActive="active">Top Picks</a>
        <a routerLink="/team-selected" routerLinkActive="active">Team Selected</a>
        <a routerLink="/top-batters" routerLinkActive="active">Top Batters</a>
        <a routerLink="/top-pitchers" routerLinkActive="active">Top Pitchers</a>
        <a routerLink="/second-grade" routerLinkActive="active">Top 2nd Graders</a>
        <a routerLink="/third-grade" routerLinkActive="active">Top 3rd Graders</a>
      </nav>
      
      <main class="main-content">
        <header class="top-bar">
          <h1>{{currentPage}}</h1>
        </header>
        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  currentPage = 'Top Picks';
}
