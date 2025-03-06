import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { PlayerService, Player } from '../services/player.service';

interface ExtendedPlayer extends Player {
  comments: string[];
}

interface NewPick {
  teamNo: number | undefined;
  grade: string;
  draftNo: number | undefined;
  name: string;
}

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatOptionModule
  ],
  providers: [PlayerService],
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.scss']
})
export class PlayerListComponent implements OnInit {
  recentPlayers: ExtendedPlayer[] = [];
  thirdGradePlayers: Player[] = [];
  secondGradePlayers: Player[] = [];
  error: string | null = null;
  newPick: NewPick = {
    teamNo: undefined,
    grade: '3rd',
    draftNo: undefined,
    name: ''
  };
  allPlayers: Player[] = [];
  filteredPlayers: Player[] = [];

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

    this.playerService.getPlayers().subscribe(players => {
      this.allPlayers = players;
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

  onNameSearch(event: any) {
    const value = event.target.value.toLowerCase();
    this.filteredPlayers = this.allPlayers.filter(player => 
      player.name.toLowerCase().includes(value)
    ).slice(0, 5);
  }

  onPlayerSelected(event: any) {
    const selectedPlayer = this.allPlayers.find(p => p.name === event.option.value);
    if (selectedPlayer) {
      this.newPick.grade = selectedPlayer.grade;
    }
  }

  addPick() {
    if (!this.newPick.teamNo || !this.newPick.draftNo || !this.newPick.name) {
      return;
    }
    
    const selectedPlayer = this.allPlayers.find(p => p.name === this.newPick.name);
    if (selectedPlayer) {
      this.recentPlayers.unshift({
        ...selectedPlayer,
        comments: (selectedPlayer.Comments || '').split(',').map(c => c.trim()).filter(c => c)
      });
      
      // Reset form
      this.newPick = {
        teamNo: undefined,
        grade: '3rd',
        draftNo: undefined,
        name: ''
      };
    }
  }
}
