import { Component } from '@angular/core';

@Component({
  selector: 'app-player-list',
  standalone: true,
  template: `
    <div class="player-list-container">
      <div class="header">
        <h2>Your Recent Players</h2>
        <button class="see-all">See all Players</button>
      </div>

      <div class="player-list">
        <div class="player-card">
          <div class="player-icon red">
            <span>JD</span>
          </div>
          <div class="player-details">
            <h3>John Doe</h3>
            <div class="stats">$10/game</div>
            <div class="tags">
              <span class="tag">Pitcher</span>
              <span class="tag">Right-handed</span>
            </div>
            <div class="meta">
              <span class="location">New York</span>
              <span class="time">2h ago</span>
            </div>
          </div>
          <button class="expand-button">
            <span>↓</span>
          </button>
        </div>

        <div class="player-card">
          <div class="player-icon blue">
            <span>MS</span>
          </div>
          <div class="player-details">
            <h3>Mike Smith</h3>
            <div class="stats">$12/game</div>
            <div class="tags">
              <span class="tag">Batter</span>
              <span class="tag">Left-handed</span>
            </div>
            <div class="meta">
              <span class="location">Boston</span>
              <span class="time">5h ago</span>
            </div>
          </div>
          <button class="expand-button">
            <span>↓</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./player-list.component.scss']
})
export class PlayerListComponent {}
