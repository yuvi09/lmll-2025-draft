import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { PlayerService } from '../services/player.service';
import { ApiService, Player, Team, Pick, IneligiblePlayer } from '../services/api.service';

interface ExtendedPlayer extends Player {
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

// Add interface for pick order response
interface PickOrderResponse {
  pick_number: number;
  team_number: number;
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
  thirdGradePlayers: Player[] = [];
  secondGradePlayers: Player[] = [];
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
  allPlayers: Player[] = [];
  filteredPlayers: Player[] = [];
  players: Player[] = [];
  teams: Team[] = [];
  picks: Pick[] = [];
  teamSixPicks: Pick[] = []; // Picks for Team 6
  
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

  firstRowTeams: Team[] = [];
  secondRowTeams: Team[] = [];
  cdkTeam?: Team;

  ineligiblePlayers: IneligiblePlayer[] = [];

  isOffline = false;

  get currentPickNumber(): number {
    return this.currentRound === 1 
      ? this.currentPickIndex + 1 
      : this.currentPickIndex + 1 + ((this.currentRound - 1) * 13);
  }

  get currentPickTeam(): string {
    const roundOrder = this.getCurrentRoundPickOrder();
    return this.currentPickIndex < roundOrder.length 
      ? `Team ${roundOrder[this.currentPickIndex].teamNumber}`
      : 'Draft Complete';
  }

  get currentTeamManagers(): string {
    const roundOrder = this.getCurrentRoundPickOrder();
    return this.currentPickIndex < roundOrder.length 
      ? roundOrder[this.currentPickIndex].managers
      : '';
  }
  
  constructor(
    private playerService: PlayerService,
    private apiService: ApiService
  ) {
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.fetchAllData();
    });
    
    window.addEventListener('offline', () => {
      this.isOffline = true;
    });
  }

  async ngOnInit() {
    await this.fetchAllData();
    this.organizeTeams();
  }
  
  async fetchAllData() {
    if (this.isOffline) {
      console.warn('App is offline, using cached data if available');
      return;
    }

    try {
      await Promise.all([
        this.fetchPlayers(),
        this.fetchTeams(),
        this.fetchPicks(),
        this.fetchDraftState(),
        this.fetchIneligiblePlayers()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      // Show offline message or fallback UI
    }
  }
  
  async fetchPlayers() {
    try {
      this.loading.players = true;
      this.players = await this.apiService.getPlayers();
      
      // Update the available players lists
      this.updateAvailablePlayers();
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
      
      // Fetch teams and pick order in parallel
      const [teams, pickOrder] = await Promise.all([
        this.apiService.getTeams(),
        this.apiService.getPickOrder()
      ]);
      
      this.teams = teams;
      
      // Create draftOrder from database pick order
      this.draftOrder = pickOrder.map((order: PickOrderResponse) => ({
        pickNumber: order.pick_number,
        teamNumber: order.team_number,
        managers: order.managers
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
      this.picks = await this.apiService.getPicks();
      
      // Filter picks for Team 6
      this.teamSixPicks = this.picks.filter(pick => pick.team_number === 6);
      
      // Update available players after picks change
      this.updateAvailablePlayers();
    } catch (err) {
      this.error.picks = 'Failed to load picks';
      console.error(err);
    } finally {
      this.loading.picks = false;
    }
  }
  
  async fetchDraftState() {
    try {
      const state = await this.apiService.getDraftState();
      this.currentRound = state.current_round;
      this.currentPickIndex = state.current_pick_index;
    } catch (err) {
      console.error('Error loading draft state:', err);
    }
  }
  
  async fetchIneligiblePlayers() {
    try {
      this.ineligiblePlayers = await this.apiService.getIneligiblePlayers();
    } catch (err) {
      console.error('Error loading ineligible players:', err);
    }
  }
  
  async submitPick() {
    if (!this.selectedPlayer) return;

    try {
      const player = this.players.find(p => p.id === this.selectedPlayer);
      if (player && this.isCoachesKid(player)) {
        this.error.addPick = "Coach's kids are not eligible for draft picks";
        return;
      }

      const roundOrder = this.getCurrentRoundPickOrder();
      const currentTeam = roundOrder[this.currentPickIndex];
      
      console.log('Submitting pick:', {
        playerId: this.selectedPlayer,
        teamNumber: currentTeam.teamNumber,
        round: this.currentRound,
        pickNumber: this.currentPickNumber
      });
      
      await this.apiService.addPick(
        this.selectedPlayer,
        currentTeam.teamNumber,
        this.currentRound,
        this.currentPickNumber
      );

      // Update draft state in database
      await this.apiService.updateDraftState({
        current_round: this.currentRound,
        current_pick_index: this.currentPickIndex
      });

      // Refresh picks after adding new one
      await this.fetchPicks();

      // Move to next pick
      this.currentPickIndex++;
      if (this.currentPickIndex >= roundOrder.length) {
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
    const searchTerm = event.target.value.toLowerCase().trim();
    if (searchTerm.length < 2) {
      this.filteredPlayers = [];
      return;
    }

    this.filteredPlayers = this.players
      .filter(player => {
        const fullName = player.name.toLowerCase();
        const nameParts = fullName.split(' ');
        
        return (fullName.includes(searchTerm) || 
               nameParts.some(part => part.includes(searchTerm))) &&
               !this.isPlayerDrafted(player.id);
      })
      .slice(0, 5);
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
        comments: (selectedPlayer.notes || '').split(',').map((c: string) => c.trim()).filter((c: string) => c)
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

  getTeamPicks(teamNumber: number): Pick[] {
    return this.picks.filter(pick => pick.team_number === teamNumber);
  }

  // Add reset functionality
  async resetDraft() {
    if (confirm('Are you sure you want to reset the draft? This will clear all picks.')) {
      try {
        await this.apiService.clearPicks();
        await this.apiService.updateDraftState({
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
    const roundOrder = this.getCurrentRoundPickOrder();
    if (!roundOrder?.length) return 'Loading...';
    
    const nextIndex = this.currentPickIndex + 1;
    if (nextIndex >= roundOrder.length) {
      return 'Round Complete';
    }
    return `Team ${roundOrder[nextIndex].teamNumber}`;
  }

  get nextTeamManagers(): string {
    const roundOrder = this.getCurrentRoundPickOrder();
    const nextIndex = this.currentPickIndex + 1;
    if (nextIndex >= roundOrder.length) {
      return '';
    }
    return roundOrder[nextIndex].managers;
  }

  async skipPick() {
    try {
      // First verify current state matches server
      const serverState = await this.apiService.getDraftState();
      if (serverState.current_round !== this.currentRound || 
          serverState.current_pick_index !== this.currentPickIndex) {
        // States are out of sync, refresh from server
        this.currentRound = serverState.current_round;
        this.currentPickIndex = serverState.current_pick_index;
        await this.fetchPicks(); // Refresh picks
        return; // Don't proceed with skip
      }

      const roundOrder = this.getCurrentRoundPickOrder();
      const currentTeam = roundOrder[this.currentPickIndex];
      
      // Verify this team hasn't already picked in this round
      const teamPicks = this.picks.filter(p => 
        p.team_number === currentTeam.teamNumber && 
        p.round === this.currentRound
      );
      if (teamPicks.length > 0) {
        // Team already has a pick this round, refresh state
        await this.fetchPicks();
        await this.fetchDraftState();
        return;
      }

      // Proceed with skip if everything is in sync
      await this.apiService.addPick(
        -1,
        currentTeam.teamNumber,
        this.currentRound,
        this.currentPickNumber
      );

      // Update local state after successful skip
      this.currentPickIndex++;
      if (this.currentPickIndex >= roundOrder.length) {
        this.currentPickIndex = 0;
        this.currentRound++;
      }

      // Update server state
      await this.apiService.updateDraftState({
        current_round: this.currentRound,
        current_pick_index: this.currentPickIndex
      });

      // Refresh picks
      await this.fetchPicks();
      this.selectedPlayer = null;
      this.playerSearch = '';

    } catch (err) {
      console.error('Error skipping pick:', err);
      // On error, refresh state from server
      await this.fetchDraftState();
      await this.fetchPicks();
    }
  }

  // Add this helper method to get the current round's pick order
  getCurrentRoundPickOrder(): DraftTeam[] {
    if (!this.draftOrder?.length) return [];
    
    return this.currentRound % 2 === 0 
      ? [...this.draftOrder].reverse()
      : this.draftOrder;
  }

  getTeamManagers(teamNumber: number): string {
    const team = this.teams.find(t => t.team_number === teamNumber);
    return team ? team.managers : '';
  }

  // Add new method to update available players
  updateAvailablePlayers() {
    this.thirdGradePlayers = this.players
      .filter(p => 
        p.grade === 3 && 
        !this.isPlayerDrafted(p.id) &&
        !this.isPlayerIneligible(p)
      )
      .sort((a, b) => (b.mc_pitching || 0) - (a.mc_pitching || 0));
      
    this.secondGradePlayers = this.players
      .filter(p => 
        p.grade === 2 && 
        !this.isPlayerDrafted(p.id) &&
        !this.isPlayerIneligible(p)
      )
      .sort((a, b) => (b.mc_pitching || 0) - (a.mc_pitching || 0));
  }

  getPlayerRatingsTooltip(player: Player): string {
    return `
      MC Rating: ${player.mc_pitching || 'N/A'}
      YD Rating: ${player.yd_pitching || 'N/A'}
      Age: ${player.age}
      Position: ${player.position || 'N/A'}
      Previous Division: ${player.py_division || 'N/A'}
      Notes: ${player.notes || 'None'}
    `;
  }

  // Add this helper method
  isCoachesKid(player: Player): boolean {
    if (!player.notes) return false;
    return player.notes.includes('CC-Green') || 
           player.notes.includes('CC-3rd') || 
           player.notes.startsWith('CC-');
  }

  isPlayerIneligible(player: Player): boolean {
    if (this.isCoachesKid(player)) return true;
    
    return this.ineligiblePlayers.some(
      ineligible => ineligible.Name.toLowerCase() === player.name.toLowerCase()
    );
  }

  getIneligibilityReason(player: Player): string {
    if (this.isCoachesKid(player)) return "Coach's Kid";
    
    const ineligiblePlayer = this.ineligiblePlayers.find(
      p => p.Name.toLowerCase() === player.name.toLowerCase()
    );
    return ineligiblePlayer ? "Selected for Blue Division" : '';
  }
}
