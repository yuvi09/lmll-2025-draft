import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PlayerService, Player } from '../services/player.service';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [
    CommonModule
  ],
  providers: [PlayerService],
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.scss']
})
export class PlayerListComponent implements OnInit {
  recentPlayers: Player[] = [];
  thirdGradePlayers: Player[] = [];
  secondGradePlayers: Player[] = [];
  error: string | null = null;

  constructor(private playerService: PlayerService) {}

  ngOnInit() {
    this.playerService.getRecentPlayers().subscribe({
      next: (players) => {
        console.log('Recent players loaded:', players);
        this.recentPlayers = players;
      },
      error: (error) => {
        console.error('Error loading recent players:', error);
        this.error = 'Failed to load players';
      }
    });

    this.playerService.getTopThirdGraders().subscribe({
      next: (players) => {
        console.log('Third grade players loaded:', players);
        this.thirdGradePlayers = players;
      },
      error: (error) => {
        console.error('Error loading third grade players:', error);
        this.error = 'Failed to load players';
      }
    });

    this.playerService.getTopSecondGraders().subscribe({
      next: (players) => {
        console.log('Second grade players loaded:', players);
        this.secondGradePlayers = players;
      },
      error: (error) => {
        console.error('Error loading second grade players:', error);
        this.error = 'Failed to load players';
      }
    });
  }
}
