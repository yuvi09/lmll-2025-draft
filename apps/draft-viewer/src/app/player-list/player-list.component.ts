import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService, Player } from '../services/player.service';

interface ExtendedPlayer extends Player {
  comments: string[];
}

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule],
  providers: [PlayerService],
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.scss']
})
export class PlayerListComponent implements OnInit {
  recentPlayers: ExtendedPlayer[] = [];
  thirdGradePlayers: Player[] = [];
  secondGradePlayers: Player[] = [];
  error: string | null = null;

  constructor(private playerService: PlayerService) {}

  ngOnInit() {
    this.playerService.getRecentPlayers().subscribe({
      next: (players) => {
        this.recentPlayers = players.map(p => ({
          ...p,
          comments: (p.Comments || '').split(',').map(c => c.trim()).filter(c => c)
        }));
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

  updatePickOrder(player: ExtendedPlayer, event: Event) {
    const newOrder = (event.target as HTMLInputElement).value;
    // Implement pick order update logic
  }

  updatePlayerName(player: ExtendedPlayer, event: Event) {
    const newName = (event.target as HTMLInputElement).value;
    // Implement name update logic
  }

  editPlayer(player: ExtendedPlayer) {
    // Implement edit modal/form logic
  }

  removePlayer(player: ExtendedPlayer) {
    // Implement remove player logic
  }
}
