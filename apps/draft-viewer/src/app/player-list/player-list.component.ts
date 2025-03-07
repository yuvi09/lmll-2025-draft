import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { PlayerService } from '../services/player.service';
import * as ApiService from '../services/api.service';

interface ExtendedPlayer extends ApiService.Player {
  comments: string[];
}

interface NewPick {
  teamNo: number | undefined;
  grade: number;
  draftNo: number | undefined;
  name: string;
}

interface DraftTeam {
  pickNumber: number;
  teamNumber: number;
  managers: string;
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
  thirdGradePlayers: ApiService.Player[] = [];
  secondGradePlayers: ApiService.Player[] = [];
  error = {
    players: null as string | null,
    teams: null as string | null,
    picks: null as string | null,
    addPick: null as string | null
  };
  newPick: NewPick = {
    teamNo: undefined,
    grade: 3,
    draftNo: undefined,
    name: ''
  };
  allPlayers: ApiService.Player[] = [];
  filteredPlayers: ApiService.Player[] = [];
  players: ApiService.Player[] = [];
  teams: ApiService.Team[] = [];
  picks: ApiService.Pick[] = [];
  cdkPicks: ApiService.Pick[] = []; // Picks for Team CDK
  
  // Form data for Add Pick
  selectedPlayer: number | null = null;
  selectedTeam: number | null = null;
  selectedRound: number = 1;
  
  loading = {
    players: true,
    teams: true,
    picks: true
  };
  
  playerSearch: string = '';
  
  draftOrder: DraftTeam[] = [
    { pickNumber: 1, teamNumber: 11, managers: 'DeSimone, Pasqua, Seeman' },
    { pickNumber: 2, teamNumber: 6, managers: 'Candela, Dodia, Kuker' },
    // ... rest of the teams
  ];

  currentRound: number = 1;
  currentPickIndex: number = 0;

  get currentPickNumber(): number {
    return this.currentRound === 1 
      ? this.currentPickIndex + 1 
      : this.currentPickIndex + 1 + ((this.currentRound - 1) * 13);
  }

  get currentPickTeam(): string {
    return `Team ${this.draftOrder[this.currentPickIndex].teamNumber}`;
  }

  get currentTeamManagers(): string {
    return this.draftOrder[this.currentPickIndex].managers;
  }
  
  constructor(private playerService: PlayerService) {}

  async ngOnInit() {
    await this.fetchAllData();
  }
  
  async fetchAllData() {
    // Fetch all required data in parallel
    await Promise.all([
      this.fetchPlayers(),
      this.fetchTeams(),
      this.fetchPicks()
    ]);
  }
  
  async fetchPlayers() {
    try {
      this.loading.players = true;
      this.players = await ApiService.getPlayers();
    } catch (err) {
      this.error.players = 'Failed to load players';
      console.error(err);
    } finally {
      this.loading.players = false;
    }
  }
  
  async fetchTeams() {
    try {
      this.loading.teams = true;
      this.teams = await ApiService.getTeams();
    } catch (err) {
      this.error.teams = 'Failed to load teams';
      console.error(err);
    } finally {
      this.loading.teams = false;
    }
  }
  
  async fetchPicks() {
    try {
      this.loading.picks = true;
      this.picks = await ApiService.getPicks();
      
      // Filter picks for Team CDK
      const cdkTeam = this.teams.find(team => team.name === 'CDK');
      if (cdkTeam) {
        this.cdkPicks = this.picks.filter(pick => pick.team_id === cdkTeam.id);
      }
    } catch (err) {
      this.error.picks = 'Failed to load picks';
      console.error(err);
    } finally {
      this.loading.picks = false;
    }
  }
  
  async submitPick() {
    if (!this.selectedPlayer) return;

    try {
      await ApiService.addPick(
        this.selectedPlayer,
        this.draftOrder[this.currentPickIndex].teamNumber,
        this.currentRound,
        this.currentPickNumber
      );

      // Move to next pick
      this.currentPickIndex++;
      if (this.currentPickIndex >= 13) {
        this.currentPickIndex = 0;
        this.currentRound++;
      }

      // Reset selection
      this.selectedPlayer = null;
      this.playerSearch = '';
    } catch (err) {
      // ... error handling
    }
  }
  
  // Helper to check if a player is already drafted
  isPlayerDrafted(playerId: number): boolean {
    return this.picks.some(pick => pick.player_id === playerId);
  }
  
  // Get player name by ID
  getPlayerName(playerId: number): string {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  }
  
  // Get team name by ID
  getTeamName(teamId: number): string {
    const team = this.teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  }
  
  // Get player grade by ID
  getPlayerGrade(playerId: number): number {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.grade : 0;
  }
  
  // Get player overall rating by ID
  getPlayerRating(playerId: number): number {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.overall : 0;
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

  onPlayerSearchInput(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm.length < 2) {
      this.filteredPlayers = [];
      return;
    }

    this.filteredPlayers = this.players
      .filter(player => 
        player.name.toLowerCase().includes(searchTerm) &&
        !this.isPlayerDrafted(player.id)
      )
      .slice(0, 5); // Limit to 5 results
  }

  onPlayerSelected(event: any) {
    const selectedPlayer = this.players.find(p => p.name === event.option.value);
    if (selectedPlayer) {
      this.selectedPlayer = selectedPlayer.id;
      // You might want to auto-focus the next input (team or round)
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
        grade: 3,
        draftNo: undefined,
        name: ''
      };
    }
  }
}
