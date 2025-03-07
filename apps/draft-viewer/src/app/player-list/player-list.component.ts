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
  
  draftOrder: DraftTeam[] = [];

  currentRound: number = 1;
  currentPickIndex: number = 0;

  firstRowTeams: ApiService.Team[] = [];
  secondRowTeams: ApiService.Team[] = [];
  cdkTeam?: ApiService.Team;

  get currentPickNumber(): number {
    return this.currentRound === 1 
      ? this.currentPickIndex + 1 
      : this.currentPickIndex + 1 + ((this.currentRound - 1) * 13);
  }

  get currentPickTeam(): string {
    return this.currentPickIndex < this.draftOrder.length 
      ? `Team ${this.draftOrder[this.currentPickIndex].teamNumber}`
      : 'Draft Complete';
  }

  get currentTeamManagers(): string {
    return this.currentPickIndex < this.draftOrder.length 
      ? this.draftOrder[this.currentPickIndex].managers
      : '';
  }
  
  constructor(private playerService: PlayerService) {}

  async ngOnInit() {
    await this.fetchAllData();
    this.organizeTeams();
  }
  
  async fetchAllData() {
    // Fetch all required data in parallel
    await Promise.all([
      this.fetchPlayers(),
      this.fetchTeams(),
      this.fetchPicks(),
      this.fetchDraftState()
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
      
      // Create draftOrder from teams data
      this.draftOrder = this.teams
        .sort((a, b) => a.team_number - b.team_number)
        .map(team => ({
          pickNumber: team.team_number,
          teamNumber: team.team_number,
          managers: team.managers
        }));
        
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
  
  async fetchDraftState() {
    try {
      const state = await ApiService.getDraftState();
      this.currentRound = state.current_round;
      this.currentPickIndex = state.current_pick_index;
    } catch (err) {
      console.error('Error loading draft state:', err);
    }
  }
  
  async submitPick() {
    if (!this.selectedPlayer) return;

    try {
      const currentTeam = this.draftOrder[this.currentPickIndex];
      console.log('Submitting pick:', {
        playerId: this.selectedPlayer,
        teamNumber: currentTeam.teamNumber,
        round: this.currentRound,
        pickNumber: this.currentPickNumber
      });
      
      await ApiService.addPick(
        this.selectedPlayer,
        currentTeam.teamNumber,
        this.currentRound,
        this.currentPickNumber
      );

      // Update draft state in database
      await ApiService.updateDraftState({
        current_round: this.currentRound,
        current_pick_index: this.currentPickIndex
      });

      // Refresh picks after adding new one
      await this.fetchPicks();

      // Move to next pick
      this.currentPickIndex++;
      if (this.currentPickIndex >= 13) {
        this.currentPickIndex = 0;
        this.currentRound++;
      }

      // Reset selection
      this.selectedPlayer = null;
      this.playerSearch = '';
    } catch (err: any) {
      console.error('Error adding pick:', err);
      console.error('Error response:', err.response?.data);
      this.error.addPick = err.response?.data?.error || 'Failed to add pick';
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

  organizeTeams() {
    // First row: Teams 11, 4, 5, 8, 3, 1
    const firstRowNumbers = [11, 4, 5, 8, 3, 1];
    this.firstRowTeams = this.teams
      .filter(team => firstRowNumbers.includes(team.team_number))
      .sort((a, b) => firstRowNumbers.indexOf(a.team_number) - firstRowNumbers.indexOf(b.team_number));

    // Second row: Teams 9, 10, 12, 13, 2, 7
    const secondRowNumbers = [9, 10, 12, 13, 2, 7];
    this.secondRowTeams = this.teams
      .filter(team => secondRowNumbers.includes(team.team_number))
      .sort((a, b) => secondRowNumbers.indexOf(a.team_number) - secondRowNumbers.indexOf(b.team_number));

    // CDK Team (Team 6)
    this.cdkTeam = this.teams.find(team => team.team_number === 6);
  }

  getTeamPicks(teamNumber: number): ApiService.Pick[] {
    return this.picks.filter(pick => pick.team_number === teamNumber);
  }

  // Add reset functionality
  async resetDraft() {
    if (confirm('Are you sure you want to reset the draft? This will clear all picks.')) {
      try {
        await ApiService.clearPicks();
        await ApiService.updateDraftState({
          current_round: 1,
          current_pick_index: 0
        });
        
        this.currentRound = 1;
        this.currentPickIndex = 0;
        this.selectedPlayer = null;
        this.playerSearch = '';
        
        await this.fetchPicks();
      } catch (err) {
        console.error('Error resetting draft:', err);
      }
    }
  }

  get nextPickTeam(): string {
    const nextIndex = this.currentPickIndex + 1;
    if (nextIndex >= this.draftOrder.length) {
      return 'Round Complete';
    }
    return `Team ${this.draftOrder[nextIndex].teamNumber}`;
  }

  get nextTeamManagers(): string {
    const nextIndex = this.currentPickIndex + 1;
    if (nextIndex >= this.draftOrder.length) {
      return '';
    }
    return this.draftOrder[nextIndex].managers;
  }

  async skipPick() {
    try {
      // Move to next pick
      this.currentPickIndex++;
      if (this.currentPickIndex >= this.draftOrder.length) {
        this.currentPickIndex = 0;
        this.currentRound++;
      }

      // Update draft state in database
      await ApiService.updateDraftState({
        current_round: this.currentRound,
        current_pick_index: this.currentPickIndex
      });

      // Clear any existing selection
      this.selectedPlayer = null;
      this.playerSearch = '';
    } catch (err) {
      console.error('Error skipping pick:', err);
    }
  }
}
